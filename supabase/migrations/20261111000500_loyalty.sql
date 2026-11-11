-- Bro Batch M1 — loyalty accounts, ledger, rewards and redemptions.
--
-- loyalty_transactions is an append-only ledger. loyalty_accounts.balance is a
-- cache of its sum: a trigger (triggers migration) applies every ledger insert
-- to the account under a row lock, and the balance cannot be changed any other
-- way. The balance can never go below zero.
--
-- The functions that decide *how many* points to award, reverse or redeem
-- arrive in M2. This migration provides the structure and the invariants.

create table public.loyalty_accounts (
  customer_id      uuid primary key references public.customers (id) on delete restrict,
  balance          bigint not null default 0 check (balance >= 0),
  lifetime_earned  bigint not null default 0 check (lifetime_earned >= 0),
  updated_at       timestamptz not null default now()
);

create table public.rewards (
  id               uuid primary key default gen_random_uuid(),
  name             text not null check (char_length(btrim(name)) between 1 and 120),
  description      text check (char_length(description) <= 1000),
  points_cost      bigint not null check (points_cost between 1 and 10000000),
  -- What the reward grants: `quantity` items of this category. If product_id
  -- is set, only that exact product; otherwise the customer picks the flavor.
  grants_category  text not null check (grants_category in ('bar', 'three_pack', 'six_pack', 'other')),
  product_id       uuid references public.products (id) on delete restrict,
  quantity         integer not null default 1 check (quantity between 1 and 100),
  is_active        boolean not null default true,
  starts_at        timestamptz,
  ends_at          timestamptz,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint rewards_window_valid
    check (starts_at is null or ends_at is null or ends_at > starts_at)
);

create type public.redemption_status as enum ('reserved', 'fulfilled', 'released', 'expired');

create table public.redemptions (
  id               uuid primary key default gen_random_uuid(),
  customer_id      uuid not null references public.customers (id) on delete restrict,
  reward_id        uuid not null references public.rewards (id) on delete restrict,
  -- Snapshot of the cost when redeemed; later reward edits do not change it.
  points_cost      bigint not null check (points_cost > 0),
  status           public.redemption_status not null default 'reserved',
  order_id         uuid references public.orders (id) on delete restrict,
  idempotency_key  text not null unique check (char_length(idempotency_key) between 8 and 200),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  fulfilled_at     timestamptz,
  constraint redemptions_fulfilled_at_matches_status
    check ((status = 'fulfilled') = (fulfilled_at is not null))
);

create index redemptions_customer_idx on public.redemptions (customer_id, created_at desc);
create index redemptions_order_idx on public.redemptions (order_id) where order_id is not null;
create index redemptions_reward_idx on public.redemptions (reward_id);

create table public.loyalty_transactions (
  id               uuid primary key default gen_random_uuid(),
  customer_id      uuid not null references public.customers (id) on delete restrict,
  kind             text not null
                     check (kind in ('earn', 'redeem', 'reverse_earn', 'reverse_redeem', 'adjust', 'expire')),
  -- Signed: positive credits the account, negative debits it.
  points           bigint not null check (points <> 0),
  -- Filled in by trigger. Any value supplied by the writer is overwritten.
  balance_after    bigint not null check (balance_after >= 0),
  order_id         uuid references public.orders (id) on delete restrict,
  refund_id        uuid references public.refunds (id) on delete restrict,
  redemption_id    uuid references public.redemptions (id) on delete restrict,
  -- Id of the external event that caused this row (e.g. a Stripe event id).
  -- Unique, so a replayed event cannot write a second row.
  source_event_id  text unique check (char_length(source_event_id) between 1 and 255),
  reason           text check (char_length(reason) <= 500),
  created_by       uuid references public.employees (id) on delete restrict,
  created_at       timestamptz not null default now(),
  constraint loyalty_transactions_sign_matches_kind
    check (
      (kind in ('earn', 'reverse_redeem') and points > 0)
      or (kind in ('redeem', 'reverse_earn', 'expire') and points < 0)
      or kind = 'adjust'
    ),
  constraint loyalty_transactions_reference_matches_kind
    check (
      (kind = 'earn' and order_id is not null)
      or (kind = 'reverse_earn' and refund_id is not null)
      or (kind in ('redeem', 'reverse_redeem') and redemption_id is not null)
      or (kind = 'adjust' and reason is not null and created_by is not null)
      or kind = 'expire'
    )
);

create index loyalty_transactions_customer_idx
  on public.loyalty_transactions (customer_id, created_at desc);
create index loyalty_transactions_order_idx
  on public.loyalty_transactions (order_id) where order_id is not null;
create index loyalty_transactions_refund_idx
  on public.loyalty_transactions (refund_id) where refund_id is not null;
create index loyalty_transactions_redemption_idx
  on public.loyalty_transactions (redemption_id) where redemption_id is not null;

-- Duplicate-event protection that does not depend on callers behaving:
-- an order earns once, a refund reverses once, a redemption is debited once
-- and released at most once.
create unique index loyalty_one_earn_per_order
  on public.loyalty_transactions (order_id) where kind = 'earn';
create unique index loyalty_one_reversal_per_refund
  on public.loyalty_transactions (refund_id) where kind = 'reverse_earn';
create unique index loyalty_one_debit_per_redemption
  on public.loyalty_transactions (redemption_id) where kind = 'redeem';
create unique index loyalty_one_release_per_redemption
  on public.loyalty_transactions (redemption_id) where kind = 'reverse_redeem';

-- The three launch rewards from the product brief. Thresholds are business
-- configuration: managers and owners edit them in the admin dashboard.
insert into public.rewards (name, description, points_cost, grants_category, quantity, sort_order)
values
  ('Free protein bar', 'One protein bar of your choice.',        300, 'bar',        1, 10),
  ('Free three-pack',  'A three-pack of bars in any flavor.',    750, 'three_pack', 1, 20),
  ('Free six-pack',    'A six-pack of bars in any flavor.',     1400, 'six_pack',   1, 30);
