-- Bro Batch M3 — checkout, payment confirmation and refunds.
--
-- The Edge Functions (supabase/functions) talk to Stripe and to the apps. They
-- hold no business rules of their own: each one validates the caller, calls
-- Stripe if needed, and calls exactly one of the functions below. Every
-- function here runs in a single transaction, so an order can never be left
-- half-paid, and every one is safe to call again with the same arguments.
--
--   create_order                   price the cart on the server, reserve rewards
--   record_payment_intent          remember the Stripe PaymentIntent for an order
--   handle_payment_succeeded       webhook: mark paid, fulfil, move stock, award
--   handle_payment_intent_update   webhook: failed attempt or cancellation
--   cancel_order                   the cashier abandoned the checkout
--   request_refund                 validate and price a refund
--   record_refund_submitted        remember Stripe's refund id
--   complete_refund                Stripe confirmed the refund
--   fail_refund                    Stripe rejected the refund
--   handle_refund_update           webhook: refund succeeded / failed
--
-- All are callable by the service role only.

-- ---------------------------------------------------------------------------
-- Schema additions
-- ---------------------------------------------------------------------------

alter table public.app_settings
  -- Largest discount a cashier may give without a manager, as a percentage of
  -- the amount due. 0 means only managers and owners can discount.
  add column employee_discount_limit_percent integer not null default 0
    check (employee_discount_limit_percent between 0 and 100);

alter table public.orders
  add column discount_reason text check (char_length(discount_reason) <= 200),
  add column discount_by uuid references public.employees (id) on delete restrict,
  add column cancelled_at timestamptz,
  add constraint orders_discount_needs_reason
    check (discount_cents = 0 or (discount_reason is not null and discount_by is not null)),
  add constraint orders_cancelled_at_matches_status
    check ((status = 'cancelled') = (cancelled_at is not null));

alter table public.order_items
  -- How many units of this line are free because of a redeemed reward.
  add column reward_quantity integer not null default 0,
  add constraint order_items_reward_quantity_range
    check (reward_quantity between 0 and quantity);

alter table public.refund_items
  -- Whether the returned units go back on the shelf. False for damaged goods.
  add column restock boolean not null default true;

alter table public.refunds
  add column failure_reason text check (char_length(failure_reason) <= 500);

-- New column is owner-editable like the other settings.
grant update (employee_discount_limit_percent) on public.app_settings to authenticated;

-- Stripe will not charge less than this in USD. An order must be free or cost
-- at least this much.
create function private.min_card_charge_cents()
returns bigint
language sql
immutable
set search_path = ''
as $$ select 50::bigint $$;

-- ---------------------------------------------------------------------------
-- Webhook event log helpers.
--
-- begin_stripe_event takes a row lock on the event, so two deliveries of the
-- same event run one after the other. It returns false when the event was
-- already handled, which is what makes every webhook handler idempotent.
-- ---------------------------------------------------------------------------

create function private.begin_stripe_event(p_event_id text, p_event_type text, p_payload jsonb)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_status text;
begin
  insert into public.stripe_events as e (id, type, payload)
  values (p_event_id, p_event_type, coalesce(p_payload, '{}'::jsonb))
  on conflict (id) do update set type = e.type   -- no-op update: takes the row lock
  returning e.status into v_status;

  return v_status in ('received', 'failed');
end;
$$;

create function private.finish_stripe_event(p_event_id text, p_status text, p_error text default null)
returns void
language sql
set search_path = ''
as $$
  update public.stripe_events
    set status = p_status, error = p_error, processed_at = now()
    where id = p_event_id
$$;

-- ---------------------------------------------------------------------------
-- Internal: everything that happens when an order becomes paid.
-- ---------------------------------------------------------------------------

create function private.complete_order(p_order_id uuid, p_source_event_id text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_order public.orders;
  v_redemption record;
begin
  select o.* into strict v_order from public.orders o where o.id = p_order_id for update;

  if v_order.status <> 'pending' then
    return;
  end if;

  update public.orders set status = 'paid', paid_at = now() where id = p_order_id;

  for v_redemption in
    select r.id from public.redemptions r
    where r.order_id = p_order_id and r.status = 'reserved'
    order by r.created_at, r.id
  loop
    perform public.fulfill_redemption(v_redemption.id, p_order_id);
  end loop;

  -- Ordered by product so two orders completing at once take stock locks in
  -- the same sequence.
  insert into public.inventory_movements (product_id, delta, reason, order_id, employee_id)
  select i.product_id, -sum(i.quantity)::integer, 'sale', p_order_id, v_order.employee_id
  from public.order_items i
  where i.order_id = p_order_id
  group by i.product_id
  order by i.product_id;

  perform public.award_points_for_order(p_order_id, p_source_event_id);
end;
$$;

-- Internal: an unpaid order is abandoned. Reserved rewards go back.
create function private.abandon_order(p_order_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_redemption record;
begin
  update public.orders
    set status = 'cancelled', cancelled_at = now()
    where id = p_order_id and status = 'pending';

  if not found then
    return;
  end if;

  update public.payments
    set status = 'canceled'
    where order_id = p_order_id and status in ('requires_payment_method', 'processing');

  for v_redemption in
    select r.id from public.redemptions r
    where r.order_id = p_order_id and r.status = 'reserved'
    order by r.created_at, r.id
  loop
    perform public.release_redemption(v_redemption.id);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- create_order
--
-- p_items    [{"product_id": uuid, "quantity": int}, ...]
-- p_rewards  [{"reward_id": uuid, "product_id": uuid}, ...]  the reward and
--            the cart product it pays for
--
-- The client sends what is being bought, never what it costs. Prices come
-- from the products table. Returns the order; a repeated call with the same
-- idempotency key returns the same order.
-- ---------------------------------------------------------------------------

create function public.create_order(
  p_employee_id uuid,
  p_idempotency_key text,
  p_items jsonb,
  p_customer_id uuid default null,
  p_rewards jsonb default '[]'::jsonb,
  p_discount_cents bigint default 0,
  p_discount_reason text default null,
  p_discount_approved_by uuid default null
)
returns public.orders
language plpgsql
set search_path = ''
as $$
declare
  v_role text;
  v_order public.orders;
  v_order_id uuid := gen_random_uuid();
  v_subtotal bigint;
  v_reward_cents bigint := 0;
  v_discount bigint := coalesce(p_discount_cents, 0);
  v_due bigint;
  v_total bigint;
  v_limit integer;
  v_points_reserved bigint := 0;
  v_reward public.rewards;
  v_entry jsonb;
  v_index integer := 0;
  v_line record;
  v_redemption public.redemptions;
  v_rewards jsonb := coalesce(p_rewards, '[]'::jsonb);
  v_cart jsonb;                    -- [{product_id, quantity}] merged by product
  v_lines jsonb;                   -- the cart with catalog name, category and price
  v_free jsonb := '{}'::jsonb;     -- product_id -> units paid for by rewards
  v_free_so_far integer;
  v_reward_id uuid;
  v_product_id uuid;
  v_discount_by uuid;
begin
  select e.role into v_role from public.employees e where e.id = p_employee_id and e.is_active;
  if v_role is null then
    raise exception 'not an active employee' using errcode = '42501';
  end if;

  if p_idempotency_key is null or char_length(p_idempotency_key) not between 8 and 150 then
    raise exception 'an idempotency key of 8 to 150 characters is required' using errcode = '22023';
  end if;

  -- Serialise retries of the same checkout attempt.
  perform pg_advisory_xact_lock(hashtextextended('brobatch.order:' || p_idempotency_key, 0));

  select o.* into v_order from public.orders o where o.idempotency_key = p_idempotency_key;
  if found then
    if v_order.employee_id <> p_employee_id then
      raise exception 'idempotency key was already used by another employee' using errcode = 'BB003';
    end if;
    return v_order;
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'the cart is empty' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) > 100 or jsonb_typeof(v_rewards) <> 'array'
     or jsonb_array_length(v_rewards) > 20 then
    raise exception 'the cart is too large' using errcode = '22023';
  end if;

  -- The cart, merged by product.
  begin
    select jsonb_agg(jsonb_build_object('product_id', c.product_id, 'quantity', c.quantity))
      into v_cart
    from (
      select (e ->> 'product_id')::uuid as product_id, sum((e ->> 'quantity')::integer) as quantity
      from jsonb_array_elements(p_items) e
      group by 1
    ) c;
  exception when others then
    raise exception 'cart items must be {"product_id": uuid, "quantity": integer}'
      using errcode = '22023';
  end;

  if exists (
    select 1 from jsonb_to_recordset(v_cart) as c(product_id uuid, quantity bigint)
    where c.product_id is null or c.quantity is null or c.quantity not between 1 and 999
  ) then
    raise exception 'quantities must be between 1 and 999' using errcode = '22023';
  end if;

  -- Price every line from the catalog in one read, so a price edit made while
  -- this runs cannot leave the order inconsistent.
  select jsonb_agg(
           jsonb_build_object(
             'product_id', p.id, 'quantity', c.quantity, 'product_name', p.name,
             'flavor', p.flavor, 'category', p.category, 'bar_count', p.bar_count,
             'unit_price_cents', p.price_cents
           )
           order by p.id
         )
    into v_lines
  from jsonb_to_recordset(v_cart) as c(product_id uuid, quantity integer)
  join public.products p on p.id = c.product_id and p.is_active;

  if v_lines is null or jsonb_array_length(v_lines) <> jsonb_array_length(v_cart) then
    raise exception 'a product in the cart is not available' using errcode = 'BB004';
  end if;

  select sum(l.unit_price_cents * l.quantity) into v_subtotal
  from jsonb_to_recordset(v_lines) as l(unit_price_cents bigint, quantity integer);

  if p_customer_id is not null and not exists (
    select 1 from public.customers c where c.id = p_customer_id and c.deleted_at is null
  ) then
    raise exception 'customer not found' using errcode = 'BB006';
  end if;

  -- Rewards: each one pays for units of a matching product in the cart.
  if jsonb_array_length(v_rewards) > 0 and p_customer_id is null then
    raise exception 'a reward needs a customer' using errcode = '22023';
  end if;

  for v_entry in select * from jsonb_array_elements(v_rewards) loop
    begin
      v_reward_id := (v_entry ->> 'reward_id')::uuid;
      v_product_id := (v_entry ->> 'product_id')::uuid;
    exception when others then
      raise exception 'rewards must be {"reward_id": uuid, "product_id": uuid}' using errcode = '22023';
    end;

    select w.* into v_reward from public.rewards w where w.id = v_reward_id;
    if not found
       or not v_reward.is_active
       or (v_reward.starts_at is not null and v_reward.starts_at > now())
       or (v_reward.ends_at is not null and v_reward.ends_at <= now()) then
      raise exception 'reward is not available' using errcode = 'BB004';
    end if;

    select l.* into v_line
    from jsonb_to_recordset(v_lines)
      as l(product_id uuid, quantity integer, category text, unit_price_cents bigint)
    where l.product_id = v_product_id;

    v_free_so_far := coalesce((v_free ->> v_product_id::text)::integer, 0);

    if v_line.product_id is null
       or v_line.category <> v_reward.grants_category
       or (v_reward.product_id is not null and v_reward.product_id <> v_line.product_id)
       or v_line.quantity - v_free_so_far < v_reward.quantity then
      raise exception 'reward "%" does not match an item in the cart', v_reward.name
        using errcode = 'BB009';
    end if;

    v_free := v_free || jsonb_build_object(v_product_id::text, v_free_so_far + v_reward.quantity);
    v_reward_cents := v_reward_cents + v_line.unit_price_cents * v_reward.quantity;
  end loop;

  -- Discount.
  v_due := v_subtotal - v_reward_cents;
  if v_discount < 0 or v_discount > v_due then
    raise exception 'the discount must be between 0 and the amount due' using errcode = '22023';
  end if;
  if v_discount > 0 then
    if p_discount_reason is null or btrim(p_discount_reason) = '' then
      raise exception 'a discount needs a reason' using errcode = '22023';
    end if;
    v_discount_by := p_employee_id;
    if v_role = 'employee' then
      select s.employee_discount_limit_percent into strict v_limit from public.app_settings s;
      if v_discount > (v_due * v_limit) / 100 then
        -- Over the cashier limit: a manager or owner must stand behind it.
        -- The Edge Function verifies that person's own sign-in before passing
        -- their id here; an id typed in by the cashier is never trusted.
        if exists (
          select 1 from public.employees e
          where e.id = p_discount_approved_by and e.is_active and e.role in ('manager', 'owner')
        ) then
          v_discount_by := p_discount_approved_by;
        else
          raise exception 'this discount needs a manager (cashier limit is % percent)', v_limit
            using errcode = 'BB008';
        end if;
      end if;
    end if;
  end if;

  v_total := v_due - v_discount;
  if v_total > 0 and v_total < private.min_card_charge_cents() then
    raise exception 'the amount due (% cents) is below the minimum card charge of % cents',
      v_total, private.min_card_charge_cents()
      using errcode = 'BB007';
  end if;

  insert into public.orders (
    id, customer_id, employee_id, subtotal_cents, discount_cents, reward_cents, total_cents,
    idempotency_key, discount_reason, discount_by
  )
  values (
    v_order_id, p_customer_id, p_employee_id, v_subtotal, v_discount, v_reward_cents, v_total,
    p_idempotency_key,
    case when v_discount > 0 then btrim(p_discount_reason) end,
    case when v_discount > 0 then v_discount_by end
  );

  insert into public.order_items (
    order_id, product_id, product_name, flavor, bar_count, unit_price_cents, quantity,
    line_total_cents, reward_quantity
  )
  select v_order_id, l.product_id, l.product_name, l.flavor, l.bar_count, l.unit_price_cents,
         l.quantity, l.unit_price_cents * l.quantity,
         coalesce((v_free ->> l.product_id::text)::integer, 0)
  from jsonb_to_recordset(v_lines) as l(
    product_id uuid, quantity integer, product_name text, flavor text, bar_count integer,
    unit_price_cents bigint
  )
  order by l.product_id;

  -- Reserve the rewards. If the customer cannot afford one, redeem_points
  -- raises and the whole order is rolled back.
  for v_entry in select * from jsonb_array_elements(v_rewards) loop
    v_index := v_index + 1;
    v_redemption := public.redeem_points(
      p_customer_id,
      (v_entry ->> 'reward_id')::uuid,
      p_idempotency_key || ':reward:' || v_index,
      v_order_id
    );
    v_points_reserved := v_points_reserved + v_redemption.points_cost;
  end loop;

  if v_points_reserved > 0 then
    update public.orders set points_reserved = v_points_reserved where id = v_order_id;
  end if;

  -- Nothing to charge: the order is complete now.
  if v_total = 0 then
    perform private.complete_order(v_order_id, null);
  end if;

  select o.* into strict v_order from public.orders o where o.id = v_order_id;
  return v_order;
end;
$$;

-- ---------------------------------------------------------------------------
-- record_payment_intent
-- ---------------------------------------------------------------------------

create function public.record_payment_intent(
  p_order_id uuid,
  p_payment_intent text,
  p_amount_cents bigint
)
returns public.payments
language plpgsql
set search_path = ''
as $$
declare
  v_order public.orders;
  v_payment public.payments;
begin
  select o.* into v_order from public.orders o where o.id = p_order_id for update;
  if not found then
    raise exception 'order % not found', p_order_id using errcode = 'BB006';
  end if;

  select p.* into v_payment from public.payments p where p.provider_payment_intent = p_payment_intent;
  if found then
    if v_payment.order_id <> p_order_id then
      raise exception 'payment intent belongs to a different order' using errcode = 'BB003';
    end if;
    return v_payment;
  end if;

  if v_order.status <> 'pending' then
    raise exception 'order % is not awaiting payment (status: %)', p_order_id, v_order.status
      using errcode = 'BB002';
  end if;
  if p_amount_cents is distinct from v_order.total_cents then
    raise exception 'payment amount % does not match the order total %',
      p_amount_cents, v_order.total_cents
      using errcode = 'BB002';
  end if;

  insert into public.payments (order_id, provider_payment_intent, amount_cents, status)
  values (p_order_id, p_payment_intent, p_amount_cents, 'requires_payment_method')
  returning * into v_payment;

  return v_payment;
end;
$$;

-- ---------------------------------------------------------------------------
-- handle_payment_succeeded  (webhook: payment_intent.succeeded)
--
-- Returns one of:
--   processed                 the order is now paid (or already was)
--   duplicate                 this event was handled before
--   ignored                   the payment intent is not one of ours
--   failed:amount_mismatch    Stripe charged a different amount; needs a person
--   failed:order_not_pending  money was taken for a cancelled order; needs a refund
--   failed:duplicate_payment  a second PaymentIntent paid the same order; needs a refund
-- ---------------------------------------------------------------------------

create function public.handle_payment_succeeded(
  p_event_id text,
  p_event_type text,
  p_payload jsonb,
  p_payment_intent text,
  p_amount_cents bigint,
  p_charge_id text default null,
  p_card_brand text default null,
  p_card_last4 text default null,
  p_reader_type text default null
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_payment public.payments;
  v_order public.orders;
begin
  if not private.begin_stripe_event(p_event_id, p_event_type, p_payload) then
    return 'duplicate';
  end if;

  select p.* into v_payment from public.payments p where p.provider_payment_intent = p_payment_intent;
  if not found then
    perform private.finish_stripe_event(p_event_id, 'ignored', 'unknown payment intent');
    return 'ignored';
  end if;

  -- Order first, then payment: the same sequence every other function uses.
  select o.* into strict v_order from public.orders o where o.id = v_payment.order_id for update;
  select p.* into strict v_payment from public.payments p where p.id = v_payment.id for update;

  if p_amount_cents is distinct from v_payment.amount_cents
     or p_amount_cents is distinct from v_order.total_cents then
    perform private.finish_stripe_event(
      p_event_id, 'failed',
      format('amount mismatch: stripe %s, payment %s, order %s',
             p_amount_cents, v_payment.amount_cents, v_order.total_cents)
    );
    return 'failed:amount_mismatch';
  end if;

  -- Two different PaymentIntents paid for one order: record nothing more and
  -- flag it. The second charge has to be refunded by a person.
  if v_payment.status <> 'succeeded' and exists (
    select 1 from public.payments p
    where p.order_id = v_order.id and p.id <> v_payment.id and p.status = 'succeeded'
  ) then
    perform private.finish_stripe_event(
      p_event_id, 'failed', 'order already has a successful payment; refund this payment intent'
    );
    return 'failed:duplicate_payment';
  end if;

  if v_payment.status <> 'succeeded' then
    update public.payments
      set status = 'succeeded',
          succeeded_at = now(),
          provider_charge_id = coalesce(p_charge_id, provider_charge_id),
          card_brand = coalesce(left(p_card_brand, 30), card_brand),
          card_last4 = coalesce(p_card_last4, card_last4),
          reader_type = coalesce(p_reader_type, reader_type)
      where id = v_payment.id;
  end if;

  if v_order.status = 'pending' then
    perform private.complete_order(v_order.id, p_event_id);
  elsif v_order.status in ('cancelled', 'failed') then
    perform private.finish_stripe_event(
      p_event_id, 'failed',
      format('payment succeeded for an order that is %s; refund the charge', v_order.status)
    );
    return 'failed:order_not_pending';
  end if;

  perform private.finish_stripe_event(p_event_id, 'processed');
  return 'processed';
end;
$$;

-- ---------------------------------------------------------------------------
-- handle_payment_intent_update
--   (webhooks: payment_intent.payment_failed, payment_intent.canceled,
--    payment_intent.processing)
--
-- A failed card attempt does not end the checkout: the customer can present
-- another card on the same PaymentIntent. Only a cancellation ends it.
-- ---------------------------------------------------------------------------

create function public.handle_payment_intent_update(
  p_event_id text,
  p_event_type text,
  p_payload jsonb,
  p_payment_intent text,
  p_status text
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_payment public.payments;
  v_order public.orders;
begin
  if p_status not in ('requires_payment_method', 'processing', 'canceled') then
    raise exception 'unsupported payment status %', p_status using errcode = '22023';
  end if;

  if not private.begin_stripe_event(p_event_id, p_event_type, p_payload) then
    return 'duplicate';
  end if;

  select p.* into v_payment from public.payments p where p.provider_payment_intent = p_payment_intent;
  if not found then
    perform private.finish_stripe_event(p_event_id, 'ignored', 'unknown payment intent');
    return 'ignored';
  end if;

  select o.* into strict v_order from public.orders o where o.id = v_payment.order_id for update;
  select p.* into strict v_payment from public.payments p where p.id = v_payment.id for update;

  -- Events can arrive out of order. Never move a finished payment backwards.
  if v_payment.status in ('succeeded', 'canceled') then
    perform private.finish_stripe_event(p_event_id, 'ignored', 'payment already ' || v_payment.status);
    return 'ignored';
  end if;

  update public.payments set status = p_status where id = v_payment.id;

  if p_status = 'canceled' and v_order.status = 'pending' and not exists (
    select 1 from public.payments p
    where p.order_id = v_order.id and p.id <> v_payment.id
      and p.status in ('requires_payment_method', 'processing', 'succeeded')
  ) then
    perform private.abandon_order(v_order.id);
  end if;

  perform private.finish_stripe_event(p_event_id, 'processed');
  return 'processed';
end;
$$;

-- ---------------------------------------------------------------------------
-- cancel_order: the cashier abandons a checkout that has not been paid.
-- The Edge Function cancels the PaymentIntent at Stripe first; if Stripe says
-- it already succeeded, this is never called.
-- ---------------------------------------------------------------------------

create function public.cancel_order(p_order_id uuid, p_employee_id uuid)
returns public.orders
language plpgsql
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  if not exists (select 1 from public.employees e where e.id = p_employee_id and e.is_active) then
    raise exception 'not an active employee' using errcode = '42501';
  end if;

  select o.* into v_order from public.orders o where o.id = p_order_id for update;
  if not found then
    raise exception 'order % not found', p_order_id using errcode = 'BB006';
  end if;

  if v_order.status = 'cancelled' then
    return v_order;
  end if;
  if v_order.status <> 'pending' then
    raise exception 'order % is % and cannot be cancelled', p_order_id, v_order.status
      using errcode = 'BB002';
  end if;
  if exists (
    select 1 from public.payments p where p.order_id = p_order_id and p.status = 'succeeded'
  ) then
    raise exception 'order % has a successful payment and cannot be cancelled', p_order_id
      using errcode = 'BB002';
  end if;

  perform private.abandon_order(p_order_id);

  select o.* into strict v_order from public.orders o where o.id = p_order_id;
  return v_order;
end;
$$;

-- ---------------------------------------------------------------------------
-- request_refund
--
-- p_items  [{"order_item_id": uuid, "quantity": int, "restock": bool}, ...]
--
-- Works out how much money goes back. When an order had a discount or a free
-- reward, each item's share of what was actually paid is proportional to its
-- shelf price, and the shares are computed cumulatively so that refunding
-- every item returns exactly the amount paid.
--
-- Refunds above app_settings.refund_approval_threshold_cents need a manager
-- or owner: either the requester is one, or p_approved_by names one. The Edge
-- Function fills p_approved_by only from that person's own verified sign-in.
-- ---------------------------------------------------------------------------

create function public.request_refund(
  p_order_id uuid,
  p_employee_id uuid,
  p_idempotency_key text,
  p_items jsonb,
  p_reason text,
  p_note text default null,
  p_approved_by uuid default null
)
returns public.refunds
language plpgsql
set search_path = ''
as $$
declare
  v_role text;
  v_approver_role text;
  v_order public.orders;
  v_payment public.payments;
  v_refund public.refunds;
  v_refund_id uuid := gen_random_uuid();
  v_value_before bigint;
  v_value_this bigint;
  v_already bigint;
  v_amount bigint;
  v_threshold bigint;
  v_approved_by uuid;
  v_lines jsonb;   -- [{order_item_id, quantity, restock}] merged by line
begin
  select e.role into v_role from public.employees e where e.id = p_employee_id and e.is_active;
  if v_role is null then
    raise exception 'not an active employee' using errcode = '42501';
  end if;

  if p_idempotency_key is null or char_length(p_idempotency_key) not between 8 and 200 then
    raise exception 'an idempotency key of 8 to 200 characters is required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('brobatch.refund:' || p_idempotency_key, 0));

  select r.* into v_refund from public.refunds r where r.idempotency_key = p_idempotency_key;
  if found then
    if v_refund.order_id <> p_order_id then
      raise exception 'idempotency key was already used for a different refund' using errcode = 'BB003';
    end if;
    return v_refund;
  end if;

  select o.* into v_order from public.orders o where o.id = p_order_id for update;
  if not found then
    raise exception 'order % not found', p_order_id using errcode = 'BB006';
  end if;
  if v_order.status not in ('paid', 'partially_refunded') then
    raise exception 'order % is % and cannot be refunded', p_order_id, v_order.status
      using errcode = 'BB002';
  end if;

  select p.* into v_payment
  from public.payments p
  where p.order_id = p_order_id and p.status = 'succeeded';
  if not found then
    raise exception 'order % has no card payment to refund', p_order_id using errcode = 'BB002';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0
     or jsonb_array_length(p_items) > 100 then
    raise exception 'choose at least one item to refund' using errcode = '22023';
  end if;

  begin
    select jsonb_agg(
             jsonb_build_object('order_item_id', l.order_item_id, 'quantity', l.quantity, 'restock', l.restock)
           )
      into v_lines
    from (
      select (e ->> 'order_item_id')::uuid as order_item_id,
             sum((e ->> 'quantity')::integer) as quantity,
             bool_and(coalesce((e ->> 'restock')::boolean, true)) as restock
      from jsonb_array_elements(p_items) e
      group by 1
    ) l;
  exception when others then
    raise exception 'refund items must be {"order_item_id": uuid, "quantity": integer, "restock": boolean}'
      using errcode = '22023';
  end;

  -- Every line must belong to this order and fit within what is still refundable
  -- (sold, minus already refunded, minus held by refunds still in flight).
  if exists (
    select 1
    from jsonb_to_recordset(v_lines) as l(order_item_id uuid, quantity bigint)
    left join public.order_items i on i.id = l.order_item_id and i.order_id = p_order_id
    where i.id is null
       or l.quantity is null
       or l.quantity < 1
       or l.quantity > i.quantity - i.refunded_quantity - coalesce((
            select sum(ri.quantity)
            from public.refund_items ri
            join public.refunds r on r.id = ri.refund_id
            where ri.order_item_id = i.id and r.status = 'pending'
          ), 0)
  ) then
    raise exception 'a refund line is not part of this order or exceeds what can still be refunded'
      using errcode = 'BB002';
  end if;

  -- Shelf value of items in refunds that are pending or done, and of this one.
  select coalesce(sum(ri.quantity * i.unit_price_cents), 0) into v_value_before
  from public.refund_items ri
  join public.refunds r on r.id = ri.refund_id
  join public.order_items i on i.id = ri.order_item_id
  where r.order_id = p_order_id and r.status in ('pending', 'succeeded');

  select sum(l.quantity * i.unit_price_cents) into v_value_this
  from jsonb_to_recordset(v_lines) as l(order_item_id uuid, quantity integer)
  join public.order_items i on i.id = l.order_item_id;

  select coalesce(sum(r.amount_cents), 0) into v_already
  from public.refunds r
  where r.order_id = p_order_id and r.status in ('pending', 'succeeded');

  if v_value_before + v_value_this >= v_order.subtotal_cents then
    v_amount := v_order.total_cents - v_already;   -- last refund: return the exact remainder
  else
    v_amount := (v_order.total_cents * (v_value_before + v_value_this)) / v_order.subtotal_cents
              - (v_order.total_cents * v_value_before) / v_order.subtotal_cents;
  end if;
  v_amount := least(v_amount, v_payment.amount_cents - v_already);

  if v_amount <= 0 then
    raise exception 'there is no money to refund for these items' using errcode = 'BB002';
  end if;

  -- Approval.
  select s.refund_approval_threshold_cents into strict v_threshold from public.app_settings s;
  if v_role in ('manager', 'owner') then
    v_approved_by := p_employee_id;
  elsif p_approved_by is not null then
    select e.role into v_approver_role
    from public.employees e where e.id = p_approved_by and e.is_active;
    if v_approver_role in ('manager', 'owner') then
      v_approved_by := p_approved_by;
    end if;
  end if;
  if v_amount > v_threshold and v_approved_by is null then
    raise exception 'a refund of % cents needs a manager (limit is % cents)', v_amount, v_threshold
      using errcode = 'BB008';
  end if;

  insert into public.refunds (
    id, order_id, payment_id, amount_cents, reason, note, idempotency_key, requested_by, approved_by
  )
  values (
    v_refund_id, p_order_id, v_payment.id, v_amount, p_reason, nullif(btrim(p_note), ''),
    p_idempotency_key, p_employee_id, v_approved_by
  )
  returning * into v_refund;

  insert into public.refund_items (refund_id, order_item_id, quantity, restock)
  select v_refund_id, l.order_item_id, l.quantity, l.restock
  from jsonb_to_recordset(v_lines) as l(order_item_id uuid, quantity integer, restock boolean);

  return v_refund;
end;
$$;

-- ---------------------------------------------------------------------------
-- record_refund_submitted / fail_refund
-- ---------------------------------------------------------------------------

create function public.record_refund_submitted(p_refund_id uuid, p_provider_refund_id text)
returns public.refunds
language plpgsql
set search_path = ''
as $$
declare
  v_refund public.refunds;
begin
  select r.* into v_refund from public.refunds r where r.id = p_refund_id for update;
  if not found then
    raise exception 'refund % not found', p_refund_id using errcode = 'BB006';
  end if;
  if v_refund.provider_refund_id is not null and v_refund.provider_refund_id <> p_provider_refund_id then
    raise exception 'refund % is already linked to another provider refund', p_refund_id
      using errcode = 'BB003';
  end if;
  if v_refund.provider_refund_id is null then
    update public.refunds set provider_refund_id = p_provider_refund_id
      where id = p_refund_id
      returning * into v_refund;
  end if;
  return v_refund;
end;
$$;

create function public.fail_refund(p_refund_id uuid, p_failure_reason text, p_canceled boolean default false)
returns public.refunds
language plpgsql
set search_path = ''
as $$
declare
  v_refund public.refunds;
begin
  select r.* into v_refund from public.refunds r where r.id = p_refund_id for update;
  if not found then
    raise exception 'refund % not found', p_refund_id using errcode = 'BB006';
  end if;
  if v_refund.status in ('failed', 'canceled') then
    return v_refund;
  end if;
  if v_refund.status = 'succeeded' then
    raise exception 'refund % already succeeded', p_refund_id using errcode = 'BB002';
  end if;

  update public.refunds
    set status = case when coalesce(p_canceled, false) then 'canceled' else 'failed' end,
        failure_reason = left(p_failure_reason, 500),
        completed_at = now()
    where id = p_refund_id
    returning * into v_refund;
  return v_refund;
end;
$$;

-- ---------------------------------------------------------------------------
-- complete_refund: Stripe has confirmed the money went back.
--
-- Called from two places with the same effect: right after the Stripe API
-- call returns "succeeded", and again from the webhook. Whichever arrives
-- second changes nothing.
-- ---------------------------------------------------------------------------

create function public.complete_refund(
  p_refund_id uuid,
  p_provider_refund_id text,
  p_amount_cents bigint,
  p_source_event_id text default null
)
returns public.refunds
language plpgsql
set search_path = ''
as $$
declare
  v_refund public.refunds;
  v_order public.orders;
  v_refunded bigint;
begin
  select r.* into v_refund from public.refunds r where r.id = p_refund_id;
  if not found then
    raise exception 'refund % not found', p_refund_id using errcode = 'BB006';
  end if;

  select o.* into strict v_order from public.orders o where o.id = v_refund.order_id for update;
  select r.* into strict v_refund from public.refunds r where r.id = p_refund_id for update;

  if v_refund.status = 'succeeded' then
    return v_refund;
  end if;
  if v_refund.status <> 'pending' then
    raise exception 'refund % is % and cannot be completed', p_refund_id, v_refund.status
      using errcode = 'BB002';
  end if;
  if p_amount_cents is distinct from v_refund.amount_cents then
    raise exception 'refund amount % does not match the requested %',
      p_amount_cents, v_refund.amount_cents
      using errcode = 'BB002';
  end if;
  if v_refund.provider_refund_id is not null
     and v_refund.provider_refund_id is distinct from p_provider_refund_id then
    raise exception 'refund % is linked to a different provider refund', p_refund_id
      using errcode = 'BB003';
  end if;

  update public.refunds
    set status = 'succeeded',
        completed_at = now(),
        provider_refund_id = coalesce(provider_refund_id, p_provider_refund_id)
    where id = p_refund_id;

  update public.order_items i
    set refunded_quantity = i.refunded_quantity + ri.quantity
    from public.refund_items ri
    where ri.refund_id = p_refund_id and ri.order_item_id = i.id;

  insert into public.inventory_movements (product_id, delta, reason, order_id, employee_id)
  select i.product_id, sum(ri.quantity)::integer, 'refund_restock', v_order.id, v_refund.requested_by
  from public.refund_items ri
  join public.order_items i on i.id = ri.order_item_id
  where ri.refund_id = p_refund_id and ri.restock
  group by i.product_id
  order by i.product_id;

  select coalesce(sum(r.amount_cents), 0) into v_refunded
  from public.refunds r
  where r.order_id = v_order.id and r.status = 'succeeded';

  update public.orders
    set status = case when v_refunded >= v_order.total_cents
                   then 'refunded'::public.order_status
                   else 'partially_refunded'::public.order_status
                 end
    where id = v_order.id;

  perform public.reverse_points_for_refund(p_refund_id, p_source_event_id);

  select r.* into strict v_refund from public.refunds r where r.id = p_refund_id;
  return v_refund;
end;
$$;

-- ---------------------------------------------------------------------------
-- handle_refund_update  (webhooks: refund.created, refund.updated, refund.failed)
--
-- p_refund_id comes from the metadata we attach when creating the refund at
-- Stripe, so the webhook can find our row even if it arrives before the API
-- call has returned.
--
-- Returns processed | duplicate | ignored | failed:unknown_refund |
--         failed:amount_mismatch
-- ---------------------------------------------------------------------------

create function public.handle_refund_update(
  p_event_id text,
  p_event_type text,
  p_payload jsonb,
  p_provider_refund_id text,
  p_status text,
  p_amount_cents bigint,
  p_refund_id uuid default null,
  p_failure_reason text default null
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_refund public.refunds;
begin
  if not private.begin_stripe_event(p_event_id, p_event_type, p_payload) then
    return 'duplicate';
  end if;

  select r.* into v_refund
  from public.refunds r
  where r.provider_refund_id = p_provider_refund_id
     or (p_refund_id is not null and r.id = p_refund_id)
  order by (r.provider_refund_id = p_provider_refund_id) desc nulls last
  limit 1;

  if not found then
    -- A refund made outside the app (for example in the Stripe Dashboard).
    perform private.finish_stripe_event(p_event_id, 'failed', 'refund is not known to the app');
    return 'failed:unknown_refund';
  end if;

  if p_status = 'succeeded' then
    if p_amount_cents is distinct from v_refund.amount_cents then
      perform private.finish_stripe_event(
        p_event_id, 'failed',
        format('amount mismatch: stripe %s, refund %s', p_amount_cents, v_refund.amount_cents)
      );
      return 'failed:amount_mismatch';
    end if;
    if v_refund.status in ('failed', 'canceled') then
      perform private.finish_stripe_event(
        p_event_id, 'failed', 'stripe reports success for a refund recorded as ' || v_refund.status
      );
      return 'failed:refund_not_pending';
    end if;
    perform public.complete_refund(v_refund.id, p_provider_refund_id, p_amount_cents, p_event_id);
  elsif p_status in ('failed', 'canceled') then
    if v_refund.status = 'succeeded' then
      perform private.finish_stripe_event(
        p_event_id, 'failed', 'stripe reports ' || p_status || ' for a refund already completed'
      );
      return 'failed:refund_already_succeeded';
    end if;
    perform public.fail_refund(v_refund.id, p_failure_reason, p_status = 'canceled');
  else
    -- pending / requires_action: nothing to do yet.
    perform private.finish_stripe_event(p_event_id, 'ignored', 'refund status ' || p_status);
    return 'ignored';
  end if;

  perform private.finish_stripe_event(p_event_id, 'processed');
  return 'processed';
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges: the server only.
-- ---------------------------------------------------------------------------

revoke all on function private.min_card_charge_cents()                      from public, anon, authenticated;
revoke all on function private.begin_stripe_event(text, text, jsonb)        from public, anon, authenticated;
revoke all on function private.finish_stripe_event(text, text, text)        from public, anon, authenticated;
revoke all on function private.complete_order(uuid, text)                   from public, anon, authenticated;
revoke all on function private.abandon_order(uuid)                          from public, anon, authenticated;
revoke all on function public.create_order(uuid, text, jsonb, uuid, jsonb, bigint, text, uuid) from public, anon, authenticated;
revoke all on function public.record_payment_intent(uuid, text, bigint)     from public, anon, authenticated;
revoke all on function public.handle_payment_succeeded(text, text, jsonb, text, bigint, text, text, text, text) from public, anon, authenticated;
revoke all on function public.handle_payment_intent_update(text, text, jsonb, text, text) from public, anon, authenticated;
revoke all on function public.cancel_order(uuid, uuid)                      from public, anon, authenticated;
revoke all on function public.request_refund(uuid, uuid, text, jsonb, text, text, uuid) from public, anon, authenticated;
revoke all on function public.record_refund_submitted(uuid, text)           from public, anon, authenticated;
revoke all on function public.fail_refund(uuid, text, boolean)              from public, anon, authenticated;
revoke all on function public.complete_refund(uuid, text, bigint, text)     from public, anon, authenticated;
revoke all on function public.handle_refund_update(text, text, jsonb, text, text, bigint, uuid, text) from public, anon, authenticated;

grant execute on function private.min_card_charge_cents()                   to service_role;
grant execute on function private.begin_stripe_event(text, text, jsonb)     to service_role;
grant execute on function private.finish_stripe_event(text, text, text)     to service_role;
grant execute on function private.complete_order(uuid, text)                to service_role;
grant execute on function private.abandon_order(uuid)                       to service_role;
grant execute on function public.create_order(uuid, text, jsonb, uuid, jsonb, bigint, text, uuid) to service_role;
grant execute on function public.record_payment_intent(uuid, text, bigint)  to service_role;
grant execute on function public.handle_payment_succeeded(text, text, jsonb, text, bigint, text, text, text, text) to service_role;
grant execute on function public.handle_payment_intent_update(text, text, jsonb, text, text) to service_role;
grant execute on function public.cancel_order(uuid, uuid)                   to service_role;
grant execute on function public.request_refund(uuid, uuid, text, jsonb, text, text, uuid) to service_role;
grant execute on function public.record_refund_submitted(uuid, text)        to service_role;
grant execute on function public.fail_refund(uuid, text, boolean)           to service_role;
grant execute on function public.complete_refund(uuid, text, bigint, text)  to service_role;
grant execute on function public.handle_refund_update(text, text, jsonb, text, text, bigint, uuid, text) to service_role;
