-- Bro Batch — Shopify as the point of sale.
--
-- Shopify POS (with Shopify Payments and Tap to Pay on iPhone) now runs the
-- till. Shopify is the system of record for the catalog, stock, card
-- payments, orders, refunds and POS staff. This database remains the system
-- of record for the loyalty program: members, the points ledger, rewards and
-- redemptions. It learns about sales and refunds from signed Shopify webhooks
-- and keeps a mirror of them for points and reporting.
--
-- This migration:
--   1. removes the tables that duplicated what Shopify owns
--   2. links members, orders, refunds and rewards to their Shopify records
--   3. adds the webhook log and the two ingestion functions
--   4. adds reward reservation by single-use discount code, and its expiry
--
-- All functions here are callable by the service role only.

-- ---------------------------------------------------------------------------
-- 1. Remove what Shopify owns
-- ---------------------------------------------------------------------------

-- Stock is tracked in Shopify.
drop trigger create_inventory_level on public.products;
drop table public.inventory_movements;
drop table public.inventory_levels;
drop function private.create_inventory_level();
drop function private.apply_inventory_movement();
drop function private.guard_inventory_level();

-- Card payments are taken, recorded and refunded by Shopify Payments.
alter table public.refunds drop column payment_id;
alter table public.refunds drop column provider_refund_id;
drop table public.payments;
drop table public.stripe_events;

-- Refund permissions are set per staff role in Shopify.
alter table public.app_settings drop column refund_approval_threshold_cents;

-- ---------------------------------------------------------------------------
-- 2. Links to Shopify
--
-- Shopify ids are 64-bit integers and can exceed what JavaScript numbers hold
-- exactly, so webhook bodies are passed to the database as raw text and
-- parsed here.
-- ---------------------------------------------------------------------------

alter table public.customers
  add column shopify_customer_id bigint unique;

comment on column public.customers.shopify_customer_id is
  'The Shopify customer this member is linked to. Set the first time they are scanned at the till, or when an order arrives for a Shopify customer with the same email.';

-- The products table becomes reporting metadata for Shopify variants
-- (flavor, pack type, bars per unit). Shopify holds the price and the stock.
alter table public.products
  add column shopify_product_id bigint,
  add column shopify_variant_id bigint unique,
  alter column sku drop not null,
  drop constraint products_sku_check;

alter table public.orders
  alter column employee_id drop not null,
  add column shopify_order_id bigint unique,
  add column shopify_order_name text,
  -- Shopify's source_name: 'pos' for the till, 'web' for the online store.
  add column source text,
  add column shopify_location_id bigint,
  add column shopify_user_id bigint,
  -- total_cents stays "goods after discounts": the amount points are earned
  -- on. Tax is whatever the store charged, and the grand total is what the
  -- customer actually paid including tax, tips and shipping.
  add column tax_cents bigint not null default 0 check (tax_cents >= 0),
  add column grand_total_cents bigint check (grand_total_cents >= 0),
  add column is_test boolean not null default false;

-- Managers map a product row to its Shopify variant in the admin dashboard.
grant insert (shopify_product_id, shopify_variant_id) on public.products to authenticated;
grant update (shopify_product_id, shopify_variant_id) on public.products to authenticated;

create index orders_source_idx on public.orders (source, created_at desc);

alter table public.order_items
  alter column product_id drop not null,
  add column shopify_line_item_id bigint unique,
  add column shopify_product_id bigint,
  add column shopify_variant_id bigint,
  add column sku text;

create index order_items_shopify_variant_idx on public.order_items (shopify_variant_id);

alter table public.refunds
  alter column requested_by drop not null,
  add column shopify_refund_id bigint unique;

alter table public.rewards
  -- The Shopify collection whose products this reward can be spent on, for
  -- example a "Bars" collection for the free-bar reward. A reward with no
  -- collection cannot be redeemed at the till yet.
  add column shopify_collection_id bigint;

grant insert (shopify_collection_id) on public.rewards to authenticated;
grant update (shopify_collection_id) on public.rewards to authenticated;

alter table public.redemptions
  -- The single-use Shopify discount code that carries this reward to checkout.
  add column discount_code text unique check (discount_code ~ '^BB-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$'),
  add column shopify_discount_id text,
  -- When the hold lapses. Unused after this, the points go back.
  add column expires_at timestamptz,
  add column shopify_variant_id bigint,
  add column discount_cents bigint check (discount_cents > 0),
  add column reserved_by_shopify_user_id bigint,
  -- Set on a redemption created because the original hold had already
  -- lapsed when Shopify told us its code was used.
  add column replaces_redemption_id uuid references public.redemptions (id) on delete restrict;

create index redemptions_expiry_idx on public.redemptions (expires_at) where status = 'reserved';

alter table public.app_settings
  -- Shopify marks orders paid with a test gateway (every order in a
  -- development store). Off in production so test sales earn nothing.
  add column accept_test_orders boolean not null default false,
  -- How long a reward stays held for a checkout before its points go back.
  add column reward_hold_minutes integer not null default 15
    check (reward_hold_minutes between 2 and 1440);

grant update (accept_test_orders, reward_hold_minutes) on public.app_settings to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Webhook log
--
-- One row per delivery, keyed by Shopify's X-Shopify-Webhook-Id. The row is
-- locked while a delivery is processed, so the same delivery arriving twice,
-- even at the same moment, is applied once. Payloads are not stored: they
-- contain customer contact details, and Shopify remains the source.
-- ---------------------------------------------------------------------------

create table public.shopify_webhook_events (
  id            text primary key check (char_length(id) between 1 and 200),
  topic         text not null check (char_length(topic) between 1 and 100),
  event_id      text,
  resource_id   bigint,
  status        text not null default 'received'
                  check (status in ('received', 'processed', 'ignored', 'flagged', 'retry')),
  -- Why it was ignored or flagged, for whoever reconciles.
  note          text,
  attempts      integer not null default 1,
  received_at   timestamptz not null default now(),
  processed_at  timestamptz
);

create index shopify_webhook_events_status_idx
  on public.shopify_webhook_events (status, received_at);
create index shopify_webhook_events_resource_idx
  on public.shopify_webhook_events (topic, resource_id);

alter table public.shopify_webhook_events enable row level security;
revoke all on public.shopify_webhook_events from public, anon, authenticated;
grant all on public.shopify_webhook_events to service_role;

-- Owners can see what needed attention.
grant select on public.shopify_webhook_events to authenticated;
create policy shopify_webhook_events_select_owner on public.shopify_webhook_events
  for select to authenticated
  using ((select private.is_owner()));

-- Returns true when this delivery should be processed now.
create function private.begin_shopify_event(
  p_webhook_id text,
  p_topic text,
  p_event_id text,
  p_resource_id bigint
)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_status text;
begin
  insert into public.shopify_webhook_events as e (id, topic, event_id, resource_id)
  values (p_webhook_id, p_topic, p_event_id, p_resource_id)
  on conflict (id) do update
    set attempts = e.attempts + 1   -- also takes the row lock
  returning e.status into v_status;

  return v_status in ('received', 'retry');
end;
$$;

create function private.finish_shopify_event(p_webhook_id text, p_status text, p_note text default null)
returns void
language sql
set search_path = ''
as $$
  update public.shopify_webhook_events
    set status = p_status, note = left(p_note, 1000), processed_at = now()
    where id = p_webhook_id
$$;

-- "12.34" -> 1234. Shopify sends money as decimal strings.
create function private.to_cents(p_amount text)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select case when p_amount is null or btrim(p_amount) = '' then null
              else round(p_amount::numeric * 100)::bigint end
$$;

-- ---------------------------------------------------------------------------
-- ingest_shopify_order  (webhook: orders/paid)
--
-- Mirrors a paid Shopify order, links it to a member, fulfils any rewards
-- whose discount code was used, and awards points on the goods actually paid
-- for (after discounts, before tax, tips and shipping).
--
-- Returns one of:
--   processed   mirrored (and points awarded if the buyer is a member)
--   duplicate   this delivery was handled before
--   ignored     not paid, a test order, or already mirrored
--   flagged     mirrored, but something needs a person: see the event's note
-- ---------------------------------------------------------------------------

create function public.ingest_shopify_order(
  p_webhook_id text,
  p_topic text,
  p_event_id text,
  p_raw text
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v jsonb;
  v_shopify_order_id bigint;
  v_shopify_customer_id bigint;
  v_email text;
  v_member_id uuid;
  v_order_id uuid := gen_random_uuid();
  v_subtotal bigint;
  v_total bigint;
  v_reward_cents bigint := 0;
  v_points_reserved bigint := 0;
  v_notes text[] := '{}';
  v_code text;
  v_redemption public.redemptions;
  v_new public.redemptions;
begin
  begin
    v := p_raw::jsonb;
    v_shopify_order_id := (v ->> 'id')::bigint;
  exception when others then
    raise exception 'webhook body is not a Shopify order' using errcode = '22023';
  end;
  if v_shopify_order_id is null then
    raise exception 'webhook body is not a Shopify order' using errcode = '22023';
  end if;

  if not private.begin_shopify_event(p_webhook_id, p_topic, p_event_id, v_shopify_order_id) then
    return 'duplicate';
  end if;

  -- Serialise deliveries about the same order (different webhook ids).
  perform pg_advisory_xact_lock(hashtextextended('brobatch.shopify.order:' || v_shopify_order_id, 0));

  if exists (select 1 from public.orders o where o.shopify_order_id = v_shopify_order_id) then
    perform private.finish_shopify_event(p_webhook_id, 'ignored', 'order already mirrored');
    return 'ignored';
  end if;

  if coalesce(v ->> 'financial_status', '') not in ('paid', 'partially_refunded', 'refunded') then
    perform private.finish_shopify_event(
      p_webhook_id, 'ignored', 'order is not paid: ' || coalesce(v ->> 'financial_status', 'unknown')
    );
    return 'ignored';
  end if;

  if coalesce((v ->> 'test')::boolean, false)
     and not (select s.accept_test_orders from public.app_settings s) then
    perform private.finish_shopify_event(p_webhook_id, 'ignored', 'test order');
    return 'ignored';
  end if;

  if upper(coalesce(v ->> 'currency', '')) <> 'USD' then
    perform private.finish_shopify_event(
      p_webhook_id, 'flagged', 'unsupported currency: ' || coalesce(v ->> 'currency', 'none')
    );
    return 'flagged';
  end if;

  v_subtotal := private.to_cents(v ->> 'total_line_items_price');
  v_total := private.to_cents(v ->> 'subtotal_price');
  if v_subtotal is null or v_total is null or v_total < 0 or v_total > v_subtotal then
    perform private.finish_shopify_event(p_webhook_id, 'flagged', 'order amounts are inconsistent');
    return 'flagged';
  end if;

  -- Who bought it. A Shopify customer already linked to a member wins;
  -- otherwise a member with the same email is linked now.
  v_shopify_customer_id := (v #>> '{customer,id}')::bigint;
  v_email := nullif(btrim(coalesce(v #>> '{customer,email}', '')), '');

  if v_shopify_customer_id is not null then
    select c.id into v_member_id
    from public.customers c
    where c.shopify_customer_id = v_shopify_customer_id and c.deleted_at is null;

    if v_member_id is null and v_email is not null then
      update public.customers c
        set shopify_customer_id = v_shopify_customer_id
        where c.email operator(extensions.=) v_email::extensions.citext
          and c.shopify_customer_id is null
          and c.deleted_at is null
        returning c.id into v_member_id;
    end if;
  end if;

  -- Rewards: which of the order's discount codes are ours, and what they
  -- were worth. Codes are stored upper-case; Shopify matches case-insensitively.
  select coalesce(sum(private.to_cents(d ->> 'amount')), 0) into v_reward_cents
  from jsonb_array_elements(coalesce(v -> 'discount_codes', '[]'::jsonb)) d
  where exists (
    select 1 from public.redemptions r where r.discount_code = upper(d ->> 'code')
  );
  v_reward_cents := least(v_reward_cents, v_subtotal - v_total);

  insert into public.orders (
    id, customer_id, status, subtotal_cents, discount_cents, reward_cents, total_cents,
    idempotency_key, paid_at, created_at,
    shopify_order_id, shopify_order_name, source, shopify_location_id, shopify_user_id,
    tax_cents, grand_total_cents, is_test
  )
  values (
    v_order_id, v_member_id, 'paid', v_subtotal, v_subtotal - v_total - v_reward_cents,
    v_reward_cents, v_total,
    'shopify-order-' || v_shopify_order_id,
    coalesce((v ->> 'processed_at')::timestamptz, (v ->> 'created_at')::timestamptz, now()),
    coalesce((v ->> 'created_at')::timestamptz, now()),
    v_shopify_order_id, v ->> 'name', v ->> 'source_name',
    (v ->> 'location_id')::bigint, (v ->> 'user_id')::bigint,
    coalesce(private.to_cents(v ->> 'total_tax'), 0), private.to_cents(v ->> 'total_price'),
    coalesce((v ->> 'test')::boolean, false)
  );

  insert into public.order_items (
    order_id, product_id, product_name, flavor, bar_count, unit_price_cents, quantity,
    line_total_cents, shopify_line_item_id, shopify_product_id, shopify_variant_id, sku
  )
  select
    v_order_id, p.id,
    left(coalesce(li ->> 'title', li ->> 'name', 'Item'), 200),
    left(coalesce(p.flavor, nullif(li ->> 'variant_title', ''), li ->> 'title', 'Item'), 200),
    -- Until a variant is described in the products table, each unit counts as one bar.
    coalesce(p.bar_count, 1),
    private.to_cents(li ->> 'price'),
    (li ->> 'quantity')::integer,
    private.to_cents(li ->> 'price') * (li ->> 'quantity')::integer,
    (li ->> 'id')::bigint, (li ->> 'product_id')::bigint, (li ->> 'variant_id')::bigint,
    nullif(li ->> 'sku', '')
  from jsonb_array_elements(coalesce(v -> 'line_items', '[]'::jsonb)) li
  left join public.products p on p.shopify_variant_id = (li ->> 'variant_id')::bigint
  where (li ->> 'quantity')::integer > 0;

  -- Fulfil the rewards that were used.
  for v_code in
    select distinct upper(d ->> 'code')
    from jsonb_array_elements(coalesce(v -> 'discount_codes', '[]'::jsonb)) d
  loop
    select r.* into v_redemption from public.redemptions r where r.discount_code = v_code;
    continue when not found;   -- an ordinary Shopify discount, nothing to do with us

    if v_member_id is null or v_redemption.customer_id <> v_member_id then
      v_notes := v_notes || format('reward code %s was used on an order for a different customer', v_code);
      continue;
    end if;

    if v_redemption.status = 'reserved' then
      perform public.fulfill_redemption(v_redemption.id, v_order_id);
      v_points_reserved := v_points_reserved + v_redemption.points_cost;

    elsif v_redemption.status in ('released', 'expired') then
      -- The hold had lapsed and the points were returned, but the code was
      -- used after all (a slow webhook, or a sale finished at the last
      -- second). Take the points again so the reward is still paid for.
      begin
        v_new := public.redeem_points(
          v_member_id, v_redemption.reward_id, 'late-' || v_redemption.id::text
        );
        update public.redemptions
          set replaces_redemption_id = v_redemption.id
          where id = v_new.id and replaces_redemption_id is null;
        perform public.fulfill_redemption(v_new.id, v_order_id);
        v_points_reserved := v_points_reserved + v_new.points_cost;
      exception when sqlstate 'BB001' or sqlstate 'BB004' then
        v_notes := v_notes || format(
          'reward code %s was used after its hold lapsed and the points could not be taken again', v_code
        );
      end;
    end if;
    -- 'fulfilled' already: nothing to do.
  end loop;

  if v_points_reserved > 0 then
    update public.orders set points_reserved = v_points_reserved where id = v_order_id;
  end if;

  perform public.award_points_for_order(v_order_id, 'shopify:' || p_webhook_id);

  if array_length(v_notes, 1) > 0 then
    perform private.finish_shopify_event(p_webhook_id, 'flagged', array_to_string(v_notes, '; '));
    return 'flagged';
  end if;

  perform private.finish_shopify_event(p_webhook_id, 'processed');
  return 'processed';
end;
$$;

-- ---------------------------------------------------------------------------
-- ingest_shopify_refund  (webhook: refunds/create)
--
-- Mirrors a refund and takes back the points earned on the refunded goods
-- (capped at the member's balance; points spent on rewards stay spent).
--
-- Returns processed | duplicate | ignored | retry.
-- 'retry' means the order has not been mirrored yet: the caller answers
-- Shopify with an error so the delivery is sent again later.
-- ---------------------------------------------------------------------------

create function public.ingest_shopify_refund(
  p_webhook_id text,
  p_topic text,
  p_event_id text,
  p_raw text
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v jsonb;
  v_shopify_refund_id bigint;
  v_shopify_order_id bigint;
  v_order public.orders;
  v_refund_id uuid := gen_random_uuid();
  v_amount bigint;
  v_already bigint;
  v_attempts integer;
begin
  begin
    v := p_raw::jsonb;
    v_shopify_refund_id := (v ->> 'id')::bigint;
    v_shopify_order_id := (v ->> 'order_id')::bigint;
  exception when others then
    raise exception 'webhook body is not a Shopify refund' using errcode = '22023';
  end;
  if v_shopify_refund_id is null or v_shopify_order_id is null then
    raise exception 'webhook body is not a Shopify refund' using errcode = '22023';
  end if;

  if not private.begin_shopify_event(p_webhook_id, p_topic, p_event_id, v_shopify_refund_id) then
    return 'duplicate';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('brobatch.shopify.order:' || v_shopify_order_id, 0));

  if exists (select 1 from public.refunds r where r.shopify_refund_id = v_shopify_refund_id) then
    perform private.finish_shopify_event(p_webhook_id, 'ignored', 'refund already mirrored');
    return 'ignored';
  end if;

  select o.* into v_order from public.orders o where o.shopify_order_id = v_shopify_order_id for update;
  if not found then
    -- The order's own webhook may simply not have arrived yet. Ask for a
    -- redelivery a few times before concluding the order is not one we track
    -- (a test order, or one from before the app was installed).
    select e.attempts into v_attempts from public.shopify_webhook_events e where e.id = p_webhook_id;
    if v_attempts >= 5 then
      perform private.finish_shopify_event(p_webhook_id, 'ignored', 'refund for an order that is not mirrored');
      return 'ignored';
    end if;
    perform private.finish_shopify_event(p_webhook_id, 'retry', 'order not mirrored yet');
    return 'retry';
  end if;

  -- Value of the goods refunded, excluding tax and shipping.
  select coalesce(sum(coalesce(
           private.to_cents(rl #>> '{subtotal_set,shop_money,amount}'),
           private.to_cents(rl ->> 'subtotal')
         )), 0)
    into v_amount
  from jsonb_array_elements(coalesce(v -> 'refund_line_items', '[]'::jsonb)) rl;

  select coalesce(sum(r.amount_cents), 0) into v_already
  from public.refunds r
  where r.order_id = v_order.id and r.status = 'succeeded';

  v_amount := least(v_amount, v_order.total_cents - v_already);
  if v_amount <= 0 then
    perform private.finish_shopify_event(p_webhook_id, 'ignored', 'no goods value refunded');
    return 'ignored';
  end if;

  insert into public.refunds (
    id, order_id, amount_cents, reason, note, status, idempotency_key,
    shopify_refund_id, created_at, completed_at
  )
  values (
    v_refund_id, v_order.id, v_amount, 'other', left(nullif(btrim(v ->> 'note'), ''), 500),
    'succeeded', 'shopify-refund-' || v_shopify_refund_id, v_shopify_refund_id,
    coalesce((v ->> 'created_at')::timestamptz, now()),
    coalesce((v ->> 'processed_at')::timestamptz, (v ->> 'created_at')::timestamptz, now())
  );

  insert into public.refund_items (refund_id, order_item_id, quantity)
  select v_refund_id, i.id, sum((rl ->> 'quantity')::integer)
  from jsonb_array_elements(coalesce(v -> 'refund_line_items', '[]'::jsonb)) rl
  join public.order_items i
    on i.shopify_line_item_id = (rl ->> 'line_item_id')::bigint and i.order_id = v_order.id
  where (rl ->> 'quantity')::integer > 0
  group by i.id;

  update public.order_items i
    set refunded_quantity = least(i.quantity, i.refunded_quantity + ri.quantity)
    from public.refund_items ri
    where ri.refund_id = v_refund_id and ri.order_item_id = i.id;

  update public.orders
    set status = case when v_already + v_amount >= v_order.total_cents
                   then 'refunded'::public.order_status
                   else 'partially_refunded'::public.order_status
                 end
    where id = v_order.id;

  perform public.reverse_points_for_refund(v_refund_id, 'shopify:' || p_webhook_id);

  perform private.finish_shopify_event(p_webhook_id, 'processed');
  return 'processed';
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Rewards at the till
--
-- A reward travels to Shopify's checkout as a discount code that Shopify
-- itself enforces: one use, one customer, one product, a fixed amount, a
-- short life. The points are debited when the code is issued. If the code
-- is used, the order webhook fulfils the reward; if not, the hold lapses and
-- the points go back.
-- ---------------------------------------------------------------------------

-- Twelve characters from an alphabet without look-alikes (no 0/O, 1/I/L).
create function private.new_reward_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  c_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_bytes bytea := extensions.gen_random_bytes(12);
  v_code text := '';
begin
  for i in 0..11 loop
    v_code := v_code || substr(c_alphabet, 1 + (get_byte(v_bytes, i) % 31), 1);
  end loop;
  return 'BB-' || substr(v_code, 1, 4) || '-' || substr(v_code, 5, 4) || '-' || substr(v_code, 9, 4);
end;
$$;

-- What the till needs to know about a member, found by scanned code, by the
-- Shopify customer on the cart, or by id. Service role only: the email is
-- used to find or create the matching Shopify customer and is not passed on
-- to the POS. Shopify ids are returned as text because they can exceed what
-- a JavaScript number holds exactly.
create function public.pos_lookup_member(
  p_membership_code text default null,
  p_shopify_customer_id bigint default null,
  p_customer_id uuid default null
)
returns table (
  customer_id uuid,
  full_name text,
  email text,
  points_balance bigint,
  shopify_customer_id text
)
language sql
stable
set search_path = ''
as $$
  select c.id, c.full_name, c.email::text, a.balance, c.shopify_customer_id::text
  from public.customers c
  join public.loyalty_accounts a on a.customer_id = c.id
  where c.deleted_at is null
    and (
      (p_membership_code is not null and c.membership_code = lower(btrim(p_membership_code)))
      or (p_shopify_customer_id is not null and c.shopify_customer_id = p_shopify_customer_id)
      or (p_customer_id is not null and c.id = p_customer_id)
    )
  limit 1
$$;

-- The rewards the till can offer right now, cheapest first; or one reward by
-- id, whatever its state.
create function public.pos_rewards(p_reward_id uuid default null)
returns table (
  id uuid,
  name text,
  description text,
  points_cost bigint,
  grants_category text,
  quantity integer,
  shopify_collection_id text,
  is_live boolean
)
language sql
stable
set search_path = ''
as $$
  select w.id, w.name, w.description, w.points_cost, w.grants_category, w.quantity,
         w.shopify_collection_id::text,
         (w.is_active
          and (w.starts_at is null or w.starts_at <= now())
          and (w.ends_at is null or w.ends_at > now())) as is_live
  from public.rewards w
  where case
          when p_reward_id is not null then w.id = p_reward_id
          else w.is_active
               and (w.starts_at is null or w.starts_at <= now())
               and (w.ends_at is null or w.ends_at > now())
        end
  order by w.points_cost, w.sort_order, w.name
$$;

-- Records which Shopify customer a member is. A member is linked once, and a
-- Shopify customer belongs to at most one member.
create function public.link_shopify_customer(p_customer_id uuid, p_shopify_customer_id bigint)
returns public.customers
language plpgsql
set search_path = ''
as $$
declare
  v_customer public.customers;
begin
  if p_shopify_customer_id is null then
    raise exception 'a Shopify customer id is required' using errcode = '22023';
  end if;

  select c.* into v_customer from public.customers c where c.id = p_customer_id for update;
  if not found or v_customer.deleted_at is not null then
    raise exception 'customer % not found', p_customer_id using errcode = 'BB006';
  end if;

  if v_customer.shopify_customer_id = p_shopify_customer_id then
    return v_customer;
  end if;
  if v_customer.shopify_customer_id is not null then
    raise exception 'this member is already linked to a different Shopify customer'
      using errcode = 'BB003';
  end if;
  if exists (select 1 from public.customers c where c.shopify_customer_id = p_shopify_customer_id) then
    raise exception 'that Shopify customer is already linked to another member'
      using errcode = 'BB003';
  end if;

  update public.customers set shopify_customer_id = p_shopify_customer_id
    where id = p_customer_id
    returning * into v_customer;
  return v_customer;
end;
$$;

-- Debits the reward's points and issues the discount code for it. Calling
-- again with the same idempotency key returns the same redemption and code.
--
-- p_discount_cents is the value of the free goods. The Edge Function works
-- it out from Shopify's own price for the chosen product; the till never
-- supplies it.
create function public.reserve_reward_for_pos(
  p_customer_id uuid,
  p_reward_id uuid,
  p_idempotency_key text,
  p_shopify_variant_id bigint,
  p_discount_cents bigint,
  p_shopify_user_id bigint default null
)
returns public.redemptions
language plpgsql
set search_path = ''
as $$
declare
  v_redemption public.redemptions;
  v_minutes integer;
begin
  if p_shopify_variant_id is null or p_discount_cents is null
     or p_discount_cents <= 0 or p_discount_cents > 1000000 then
    raise exception 'a product and a discount value are required' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.customers c
    where c.id = p_customer_id and c.shopify_customer_id is not null
  ) then
    raise exception 'this member is not linked to a Shopify customer yet' using errcode = 'BB002';
  end if;

  if exists (
    select 1 from public.rewards w where w.id = p_reward_id and w.shopify_collection_id is null
  ) then
    raise exception 'this reward is not set up for the till yet' using errcode = 'BB004';
  end if;

  -- Balance, reward availability and idempotency are all enforced here.
  v_redemption := public.redeem_points(p_customer_id, p_reward_id, p_idempotency_key);

  if v_redemption.discount_code is not null then
    return v_redemption;   -- a retry
  end if;
  if v_redemption.status <> 'reserved' then
    raise exception 'redemption % is % and cannot be issued a code', v_redemption.id, v_redemption.status
      using errcode = 'BB005';
  end if;

  select s.reward_hold_minutes into strict v_minutes from public.app_settings s;

  update public.redemptions
    set discount_code = private.new_reward_code(),
        expires_at = now() + make_interval(mins => v_minutes),
        shopify_variant_id = p_shopify_variant_id,
        discount_cents = p_discount_cents,
        reserved_by_shopify_user_id = p_shopify_user_id
    where id = v_redemption.id
    returning * into v_redemption;

  return v_redemption;
end;
$$;

-- Remembers the Shopify discount that was created for a redemption, so it
-- can be removed if the reward is taken off the cart.
create function public.attach_reward_discount(p_redemption_id uuid, p_shopify_discount_id text)
returns public.redemptions
language plpgsql
set search_path = ''
as $$
declare
  v_redemption public.redemptions;
begin
  if p_shopify_discount_id is null or btrim(p_shopify_discount_id) = '' then
    raise exception 'a Shopify discount id is required' using errcode = '22023';
  end if;

  select r.* into v_redemption from public.redemptions r where r.id = p_redemption_id for update;
  if not found then
    raise exception 'redemption % not found', p_redemption_id using errcode = 'BB006';
  end if;
  if v_redemption.shopify_discount_id = p_shopify_discount_id then
    return v_redemption;
  end if;
  if v_redemption.shopify_discount_id is not null then
    raise exception 'redemption % already has a Shopify discount', p_redemption_id
      using errcode = 'BB003';
  end if;

  update public.redemptions set shopify_discount_id = p_shopify_discount_id
    where id = p_redemption_id
    returning * into v_redemption;
  return v_redemption;
end;
$$;

-- Returns the points of every hold that lapsed more than p_grace ago.
-- Run on a schedule. Returns how many were released.
create function public.expire_stale_redemptions(p_grace interval default interval '5 minutes')
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
  v_count integer := 0;
begin
  for v_id in
    select r.id from public.redemptions r
    where r.status = 'reserved'
      and r.expires_at is not null
      and r.expires_at < now() - p_grace
    order by r.expires_at
  loop
    perform public.release_redemption(v_id, true);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- On Supabase, run the expiry every five minutes. Skipped where pg_cron is
-- not installed (plain PostgreSQL in tests); see docs/RUNBOOK.md.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'brobatch-expire-reward-holds', '*/5 * * * *',
      'select public.expire_stale_redemptions()'
    );
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Privileges: the server only.
-- ---------------------------------------------------------------------------

revoke all on function private.begin_shopify_event(text, text, text, bigint)   from public, anon, authenticated;
revoke all on function private.finish_shopify_event(text, text, text)          from public, anon, authenticated;
revoke all on function private.to_cents(text)                                  from public, anon, authenticated;
revoke all on function private.new_reward_code()                               from public, anon, authenticated;
revoke all on function public.ingest_shopify_order(text, text, text, text)     from public, anon, authenticated;
revoke all on function public.ingest_shopify_refund(text, text, text, text)    from public, anon, authenticated;
revoke all on function public.pos_lookup_member(text, bigint, uuid)            from public, anon, authenticated;
revoke all on function public.pos_rewards(uuid)                                from public, anon, authenticated;
revoke all on function public.link_shopify_customer(uuid, bigint)              from public, anon, authenticated;
revoke all on function public.reserve_reward_for_pos(uuid, uuid, text, bigint, bigint, bigint) from public, anon, authenticated;
revoke all on function public.attach_reward_discount(uuid, text)               from public, anon, authenticated;
revoke all on function public.expire_stale_redemptions(interval)               from public, anon, authenticated;

grant execute on function private.begin_shopify_event(text, text, text, bigint) to service_role;
grant execute on function private.finish_shopify_event(text, text, text)        to service_role;
grant execute on function private.to_cents(text)                                to service_role;
grant execute on function private.new_reward_code()                             to service_role;
grant execute on function public.ingest_shopify_order(text, text, text, text)   to service_role;
grant execute on function public.ingest_shopify_refund(text, text, text, text)  to service_role;
grant execute on function public.pos_lookup_member(text, bigint, uuid)          to service_role;
grant execute on function public.pos_rewards(uuid)                              to service_role;
grant execute on function public.link_shopify_customer(uuid, bigint)            to service_role;
grant execute on function public.reserve_reward_for_pos(uuid, uuid, text, bigint, bigint, bigint) to service_role;
grant execute on function public.attach_reward_discount(uuid, text)             to service_role;
grant execute on function public.expire_stale_redemptions(interval)             to service_role;
