-- Bro Batch M2 — the loyalty engine.
--
-- Five server-side functions move points. They are the only code that decides
-- how many points to award, take back or spend:
--
--   award_points_for_order     a paid order earns points, once
--   reverse_points_for_refund  a refund takes earned points back, once
--   redeem_points              reserve a reward and debit its cost
--   release_redemption         undo a reservation that was never fulfilled
--   fulfill_redemption         mark a reservation as honored
--
-- All five are callable by the service role only, are safe to call again with
-- the same arguments (the repeat changes nothing), and rely on the ledger
-- trigger for the final say on the balance.
--
-- Rules agreed with the business:
--   * points = floor(paid cents x points_per_dollar / 100)
--   * points are earned on the amount actually paid (after discounts and
--     rewards); there is no tax
--   * a refund claws back earned points in proportion to the amount refunded,
--     but never more than the customer currently has; the shortfall is
--     forfeited and the balance never goes below zero
--   * points spent on a fulfilled reward stay spent, whatever happens later

-- ---------------------------------------------------------------------------
-- Ledger trigger hardening.
--
-- M1 applied the balance change in a BEFORE INSERT trigger. A BEFORE trigger
-- also runs for rows that are then skipped by INSERT ... ON CONFLICT DO
-- NOTHING, which would have moved the balance without writing a ledger row.
-- The work is now split:
--   BEFORE  lock the account, reject overdrafts, compute balance_after
--   AFTER   apply the change to the account (fires only for rows really
--           inserted) and confirm the result matches balance_after
-- ---------------------------------------------------------------------------

create or replace function private.apply_loyalty_transaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance bigint;
begin
  select a.balance into v_balance
  from public.loyalty_accounts a
  where a.customer_id = new.customer_id
  for update;

  if not found then
    raise exception 'no loyalty account for customer %', new.customer_id
      using errcode = 'foreign_key_violation';
  end if;

  if v_balance + new.points < 0 then
    raise exception 'insufficient points: balance is %, change is %', v_balance, new.points
      using errcode = 'BB001';
  end if;

  new.balance_after := v_balance + new.points;
  return new;
end;
$$;

create function private.commit_loyalty_transaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance bigint;
begin
  perform set_config('brobatch.ledger_write', 'on', true);
  update public.loyalty_accounts a
    set balance = a.balance + new.points,
        lifetime_earned = a.lifetime_earned
          + case when new.kind = 'earn' then new.points else 0 end
    where a.customer_id = new.customer_id
    returning a.balance into v_balance;
  perform set_config('brobatch.ledger_write', 'off', true);

  -- Two rows for one customer in a single statement would each have computed
  -- balance_after from the same starting balance. Refuse rather than store a
  -- wrong running balance.
  if v_balance is distinct from new.balance_after then
    raise exception
      'ledger rows for one customer must be inserted one statement at a time (customer %)',
      new.customer_id
      using errcode = 'restrict_violation';
  end if;

  return null;
end;
$$;

create trigger commit_loyalty_transaction after insert on public.loyalty_transactions
  for each row execute function private.commit_loyalty_transaction();

revoke all on function private.commit_loyalty_transaction() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Schema additions
-- ---------------------------------------------------------------------------

-- Set once a refund's point reversal has been worked out, even when the
-- result was zero. Makes the reversal idempotent and lets later partial
-- refunds of the same order compute their share.
alter table public.refunds
  add column points_reversal_processed_at timestamptz;

alter table public.refunds
  add constraint refunds_points_reversed_needs_processing
  check (points_reversed = 0 or points_reversal_processed_at is not null);

-- ---------------------------------------------------------------------------
-- The points formula. Mirrored by pointsForPurchase() in packages/contracts;
-- the contract drift check compares the two on every test run.
-- ---------------------------------------------------------------------------

create function private.points_for_amount(p_cents bigint, p_points_per_dollar integer)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select case
    when p_cents is null or p_points_per_dollar is null then null
    when p_cents < 0 or p_points_per_dollar < 0 then 0
    else (p_cents * p_points_per_dollar) / 100   -- integer division rounds down
  end
$$;

-- ---------------------------------------------------------------------------
-- award_points_for_order
--
-- Called after a payment is confirmed. Returns the points the order earned.
-- A second call for the same order returns the same number and writes nothing.
-- ---------------------------------------------------------------------------

create function public.award_points_for_order(
  p_order_id uuid,
  p_source_event_id text default null
)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_order public.orders;
  v_existing bigint;
  v_rate integer;
  v_points bigint;
begin
  -- Locking the order serialises concurrent calls for the same order.
  select o.* into v_order from public.orders o where o.id = p_order_id for update;
  if not found then
    raise exception 'order % not found', p_order_id using errcode = 'BB006';
  end if;

  select t.points into v_existing
  from public.loyalty_transactions t
  where t.order_id = p_order_id and t.kind = 'earn';
  if found then
    return v_existing;
  end if;

  if v_order.status in ('pending', 'failed', 'cancelled') then
    raise exception 'order % is not paid (status: %)', p_order_id, v_order.status
      using errcode = 'BB002';
  end if;

  -- A refunded order that never earned (for example a replayed event arriving
  -- after the refund) earns nothing now.
  if v_order.status <> 'paid' or v_order.customer_id is null then
    return 0;
  end if;

  if exists (
    select 1 from public.customers c
    where c.id = v_order.customer_id and c.deleted_at is not null
  ) then
    return 0;
  end if;

  select s.points_per_dollar into strict v_rate from public.app_settings s;
  v_points := private.points_for_amount(v_order.total_cents, v_rate);
  if v_points <= 0 then
    return 0;
  end if;

  insert into public.loyalty_transactions (customer_id, kind, points, order_id, source_event_id)
  values (v_order.customer_id, 'earn', v_points, p_order_id, p_source_event_id);

  update public.orders set points_awarded = v_points where id = p_order_id;

  return v_points;
end;
$$;

-- ---------------------------------------------------------------------------
-- reverse_points_for_refund
--
-- Called after a refund is confirmed. Returns the points actually taken back.
--
-- The share for this refund is worked out cumulatively across the order's
-- refunds, so partial refunds that add up to the full amount reverse exactly
-- what was earned, with no rounding loss:
--
--   nominal = floor(earned x refunded_so_far_including_this / order_total)
--           - floor(earned x refunded_before_this           / order_total)
--
-- Then it is capped at the customer's current balance. What cannot be taken
-- back is forfeited: it is not carried forward to a later refund or purchase.
-- ---------------------------------------------------------------------------

create function public.reverse_points_for_refund(
  p_refund_id uuid,
  p_source_event_id text default null
)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_refund public.refunds;
  v_order public.orders;
  v_before bigint;
  v_after bigint;
  v_nominal bigint;
  v_balance bigint;
  v_actual bigint := 0;
begin
  select r.* into v_refund from public.refunds r where r.id = p_refund_id;
  if not found then
    raise exception 'refund % not found', p_refund_id using errcode = 'BB006';
  end if;

  -- Lock order first, then refund, then (inside the ledger trigger) account.
  -- award_points_for_order takes the same order -> account sequence.
  select o.* into strict v_order from public.orders o where o.id = v_refund.order_id for update;
  select r.* into strict v_refund from public.refunds r where r.id = p_refund_id for update;

  if v_refund.points_reversal_processed_at is not null then
    return v_refund.points_reversed;
  end if;

  if v_refund.status <> 'succeeded' then
    raise exception 'refund % has not succeeded (status: %)', p_refund_id, v_refund.status
      using errcode = 'BB002';
  end if;

  if v_order.customer_id is not null and v_order.points_awarded > 0 and v_order.total_cents > 0 then
    select coalesce(sum(r.amount_cents), 0) into v_before
    from public.refunds r
    where r.order_id = v_order.id
      and r.id <> p_refund_id
      and r.points_reversal_processed_at is not null;

    v_before := least(v_before, v_order.total_cents);
    v_after := least(v_before + v_refund.amount_cents, v_order.total_cents);

    v_nominal := (v_order.points_awarded * v_after) / v_order.total_cents
               - (v_order.points_awarded * v_before) / v_order.total_cents;

    select a.balance into strict v_balance
    from public.loyalty_accounts a
    where a.customer_id = v_order.customer_id
    for update;

    v_actual := least(v_nominal, v_balance);

    if v_actual > 0 then
      insert into public.loyalty_transactions (
        customer_id, kind, points, order_id, refund_id, source_event_id, reason
      )
      values (
        v_order.customer_id, 'reverse_earn', -v_actual, v_order.id, p_refund_id, p_source_event_id,
        case when v_actual < v_nominal
          then format('refund reversal capped at balance: %s of %s points', v_actual, v_nominal)
        end
      );
    end if;
  end if;

  update public.refunds
    set points_reversed = v_actual,
        points_reversal_processed_at = now()
    where id = p_refund_id;

  return v_actual;
end;
$$;

-- ---------------------------------------------------------------------------
-- redeem_points
--
-- Reserves a reward for a customer and debits its cost. Returns the
-- redemption. The idempotency key identifies one redemption attempt: calling
-- again with the same key returns the same redemption and debits nothing.
-- ---------------------------------------------------------------------------

create function public.redeem_points(
  p_customer_id uuid,
  p_reward_id uuid,
  p_idempotency_key text,
  p_order_id uuid default null
)
returns public.redemptions
language plpgsql
set search_path = ''
as $$
declare
  v_balance bigint;
  v_redemption public.redemptions;
  v_reward public.rewards;
begin
  if p_idempotency_key is null or char_length(p_idempotency_key) not between 8 and 200 then
    raise exception 'an idempotency key of 8 to 200 characters is required'
      using errcode = '22023';
  end if;

  -- The account lock serialises everything that touches this customer's points.
  select a.balance into v_balance
  from public.loyalty_accounts a
  where a.customer_id = p_customer_id
  for update;
  if not found then
    raise exception 'customer % not found', p_customer_id using errcode = 'BB006';
  end if;

  select r.* into v_redemption
  from public.redemptions r
  where r.idempotency_key = p_idempotency_key;
  if found then
    if v_redemption.customer_id <> p_customer_id
       or v_redemption.reward_id <> p_reward_id
       or v_redemption.order_id is distinct from p_order_id then
      raise exception 'idempotency key was already used for a different redemption'
        using errcode = 'BB003';
    end if;
    return v_redemption;
  end if;

  if exists (
    select 1 from public.customers c where c.id = p_customer_id and c.deleted_at is not null
  ) then
    raise exception 'customer account is closed' using errcode = 'BB004';
  end if;

  select w.* into v_reward from public.rewards w where w.id = p_reward_id for share;
  if not found
     or not v_reward.is_active
     or (v_reward.starts_at is not null and v_reward.starts_at > now())
     or (v_reward.ends_at is not null and v_reward.ends_at <= now()) then
    raise exception 'reward is not available' using errcode = 'BB004';
  end if;

  if p_order_id is not null and not exists (
    select 1 from public.orders o
    where o.id = p_order_id and o.customer_id = p_customer_id and o.status = 'pending'
  ) then
    raise exception 'order % is not an open order for this customer', p_order_id
      using errcode = 'BB002';
  end if;

  if v_balance < v_reward.points_cost then
    raise exception 'insufficient points: balance is %, reward costs %',
      v_balance, v_reward.points_cost
      using errcode = 'BB001';
  end if;

  insert into public.redemptions (customer_id, reward_id, points_cost, order_id, idempotency_key)
  values (p_customer_id, p_reward_id, v_reward.points_cost, p_order_id, p_idempotency_key)
  returning * into v_redemption;

  insert into public.loyalty_transactions (customer_id, kind, points, redemption_id, order_id)
  values (p_customer_id, 'redeem', -v_reward.points_cost, v_redemption.id, p_order_id);

  return v_redemption;
end;
$$;

-- ---------------------------------------------------------------------------
-- release_redemption
--
-- Gives the points back for a reservation that was never fulfilled: the
-- payment failed, the order was cancelled, or the reservation timed out
-- (p_expired = true). A fulfilled redemption can never be released.
-- ---------------------------------------------------------------------------

create function public.release_redemption(
  p_redemption_id uuid,
  p_expired boolean default false
)
returns public.redemptions
language plpgsql
set search_path = ''
as $$
declare
  v_redemption public.redemptions;
begin
  select r.* into v_redemption from public.redemptions r where r.id = p_redemption_id;
  if not found then
    raise exception 'redemption % not found', p_redemption_id using errcode = 'BB006';
  end if;

  -- Same lock order as redeem_points: account, then redemption.
  perform 1 from public.loyalty_accounts a
    where a.customer_id = v_redemption.customer_id
    for update;
  select r.* into strict v_redemption
    from public.redemptions r where r.id = p_redemption_id for update;

  if v_redemption.status in ('released', 'expired') then
    return v_redemption;
  end if;

  if v_redemption.status <> 'reserved' then
    raise exception 'redemption % is % and cannot be released; redeemed points stay spent',
      p_redemption_id, v_redemption.status
      using errcode = 'BB005';
  end if;

  insert into public.loyalty_transactions (customer_id, kind, points, redemption_id, order_id)
  values (
    v_redemption.customer_id, 'reverse_redeem', v_redemption.points_cost,
    v_redemption.id, v_redemption.order_id
  );

  update public.redemptions
    set status = case when coalesce(p_expired, false)
                   then 'expired'::public.redemption_status
                   else 'released'::public.redemption_status
                 end
    where id = p_redemption_id
    returning * into v_redemption;

  return v_redemption;
end;
$$;

-- ---------------------------------------------------------------------------
-- fulfill_redemption
--
-- Marks a reservation as honored on a paid order. No points move: they were
-- debited when the reward was reserved. From here the points are spent for good.
-- ---------------------------------------------------------------------------

create function public.fulfill_redemption(
  p_redemption_id uuid,
  p_order_id uuid
)
returns public.redemptions
language plpgsql
set search_path = ''
as $$
declare
  v_redemption public.redemptions;
  v_order public.orders;
begin
  select r.* into v_redemption from public.redemptions r where r.id = p_redemption_id;
  if not found then
    raise exception 'redemption % not found', p_redemption_id using errcode = 'BB006';
  end if;

  perform 1 from public.loyalty_accounts a
    where a.customer_id = v_redemption.customer_id
    for update;
  select r.* into strict v_redemption
    from public.redemptions r where r.id = p_redemption_id for update;

  if v_redemption.status = 'fulfilled' then
    if v_redemption.order_id is distinct from p_order_id then
      raise exception 'redemption % was already fulfilled on another order', p_redemption_id
        using errcode = 'BB005';
    end if;
    return v_redemption;
  end if;

  if v_redemption.status <> 'reserved' then
    raise exception 'redemption % is % and cannot be fulfilled',
      p_redemption_id, v_redemption.status
      using errcode = 'BB005';
  end if;

  if v_redemption.order_id is not null and v_redemption.order_id <> p_order_id then
    raise exception 'redemption % is reserved for a different order', p_redemption_id
      using errcode = 'BB005';
  end if;

  select o.* into v_order from public.orders o where o.id = p_order_id;
  if not found
     or v_order.customer_id is distinct from v_redemption.customer_id
     or v_order.status <> 'paid' then
    raise exception 'order % is not a paid order for this customer', p_order_id
      using errcode = 'BB002';
  end if;

  update public.redemptions
    set status = 'fulfilled',
        order_id = p_order_id,
        fulfilled_at = now()
    where id = p_redemption_id
    returning * into v_redemption;

  return v_redemption;
end;
$$;

-- ---------------------------------------------------------------------------
-- Guards that hold for every writer.
-- ---------------------------------------------------------------------------

-- A redemption moves reserved -> fulfilled | released | expired and then never
-- changes again. This is what makes "redeemed points stay spent" structural:
-- a fulfilled redemption cannot be flipped back and released.
create function private.guard_redemption()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'redemptions cannot be deleted' using errcode = 'restrict_violation';
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'reserved' then
      raise exception 'a redemption must start as reserved' using errcode = 'BB005';
    end if;
    return new;
  end if;

  if new.customer_id is distinct from old.customer_id
     or new.reward_id is distinct from old.reward_id
     or new.points_cost is distinct from old.points_cost
     or new.idempotency_key is distinct from old.idempotency_key then
    raise exception 'a redemption''s customer, reward, cost and key cannot change'
      using errcode = 'restrict_violation';
  end if;

  if old.status <> 'reserved'
     and (new.status is distinct from old.status
          or new.order_id is distinct from old.order_id
          or new.fulfilled_at is distinct from old.fulfilled_at) then
    raise exception 'redemption % is % and can no longer change', old.id, old.status
      using errcode = 'BB005';
  end if;

  return new;
end;
$$;

create trigger guard_redemption before insert or update or delete on public.redemptions
  for each row execute function private.guard_redemption();

-- Once a refund's reversal has been recorded it is final.
create function private.guard_refund_reversal()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.points_reversal_processed_at is not null
     and (new.points_reversal_processed_at is distinct from old.points_reversal_processed_at
          or new.points_reversed is distinct from old.points_reversed) then
    raise exception 'the point reversal for refund % is already recorded', old.id
      using errcode = 'restrict_violation';
  end if;
  return new;
end;
$$;

create trigger guard_refund_reversal before update on public.refunds
  for each row execute function private.guard_refund_reversal();

revoke all on function private.guard_redemption()      from public, anon, authenticated;
revoke all on function private.guard_refund_reversal() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Privileges: the server only.
-- ---------------------------------------------------------------------------

revoke all on function private.points_for_amount(bigint, integer)          from public, anon, authenticated;
revoke all on function public.award_points_for_order(uuid, text)           from public, anon, authenticated;
revoke all on function public.reverse_points_for_refund(uuid, text)        from public, anon, authenticated;
revoke all on function public.redeem_points(uuid, uuid, text, uuid)        from public, anon, authenticated;
revoke all on function public.release_redemption(uuid, boolean)            from public, anon, authenticated;
revoke all on function public.fulfill_redemption(uuid, uuid)               from public, anon, authenticated;

grant execute on function private.points_for_amount(bigint, integer)       to service_role;
grant execute on function public.award_points_for_order(uuid, text)        to service_role;
grant execute on function public.reverse_points_for_refund(uuid, text)     to service_role;
grant execute on function public.redeem_points(uuid, uuid, text, uuid)     to service_role;
grant execute on function public.release_redemption(uuid, boolean)         to service_role;
grant execute on function public.fulfill_redemption(uuid, uuid)            to service_role;
