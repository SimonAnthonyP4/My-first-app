-- Bro Batch M1 — platform tables: settings, webhook log, audit trail, push tokens.

-- Single-row business configuration, editable by owners in the admin dashboard.
create table public.app_settings (
  id                               boolean primary key default true check (id),
  -- Loyalty earn rate. 10 points per $1 means $9.00 earns 90 points.
  points_per_dollar                integer not null default 10 check (points_per_dollar between 0 and 1000),
  -- Refunds above this amount need a manager or owner to approve.
  refund_approval_threshold_cents  bigint not null default 2500
                                     check (refund_approval_threshold_cents between 0 and 100000000),
  updated_at                       timestamptz not null default now(),
  updated_by                       uuid references public.employees (id)
);

insert into public.app_settings default values;

-- Every payment-provider webhook event we have accepted. The primary key is
-- the provider's event id, which is what makes webhook handling idempotent.
create table public.stripe_events (
  id            text primary key check (id ~ '^evt_[A-Za-z0-9_]+$'),
  type          text not null check (char_length(type) between 1 and 200),
  status        text not null default 'received'
                  check (status in ('received', 'processed', 'failed', 'ignored')),
  error         text,
  payload       jsonb not null,
  received_at   timestamptz not null default now(),
  processed_at  timestamptz
);

create index stripe_events_status_idx on public.stripe_events (status, received_at);

-- Append-only record of staff and system actions on sensitive data.
create table public.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid,
  actor_role  text,
  action      text not null,
  entity      text not null,
  entity_id   text,
  before      jsonb,
  after       jsonb,
  created_at  timestamptz not null default now()
);

create index audit_log_entity_idx on public.audit_log (entity, entity_id, created_at desc);
create index audit_log_actor_idx on public.audit_log (actor_id, created_at desc);
create index audit_log_created_idx on public.audit_log (created_at desc);

-- APNs device tokens for the Rewards app.
create table public.push_tokens (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references public.customers (id) on delete cascade,
  token         text not null unique check (char_length(token) between 32 and 400),
  platform      text not null default 'ios' check (platform = 'ios'),
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

create index push_tokens_customer_idx on public.push_tokens (customer_id);
