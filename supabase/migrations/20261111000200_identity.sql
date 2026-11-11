-- Bro Batch M1 — people: employees and customers.
--
-- Both tables share their primary key with auth.users. An auth user is either
-- an employee or a customer, never both (enforced by trigger in the triggers
-- migration). Rows are never hard-deleted: employees are deactivated and
-- customers are anonymised, so orders and the loyalty ledger keep their history.

create table public.employees (
  id          uuid primary key references auth.users (id) on delete restrict,
  full_name   text not null check (char_length(btrim(full_name)) between 1 and 120),
  role        text not null check (role in ('employee', 'manager', 'owner')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references public.employees (id)
);

comment on table public.employees is
  'Staff accounts for the POS and admin dashboard. Created by an owner; never self-registered.';

create table public.customers (
  id               uuid primary key references auth.users (id) on delete restrict,
  full_name        text not null check (char_length(btrim(full_name)) between 1 and 120),
  -- Copied from auth.users (never from client input) and kept in sync by trigger.
  -- Null only after the account has been anonymised.
  email            extensions.citext unique,
  -- E.164, e.g. +14155550123. Not unique: households share phones.
  phone            text check (phone ~ '^\+[1-9][0-9]{6,14}$'),
  -- Opaque random code shown as the membership QR. Not derived from id or PII.
  membership_code  text not null unique
                     default encode(extensions.gen_random_bytes(16), 'hex')
                     check (membership_code ~ '^[0-9a-f]{32}$'),
  marketing_opt_in boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  constraint customers_email_required_while_active
    check (deleted_at is not null or email is not null)
);

comment on table public.customers is
  'Rewards members. One row per customer auth user, created through register_customer().';

create index customers_phone_idx on public.customers (phone) where phone is not null;

-- ---------------------------------------------------------------------------
-- Role helpers used by RLS policies.
--
-- These read the employees table on every call instead of trusting a JWT
-- claim, so deactivating or demoting an employee takes effect immediately
-- rather than when their token expires. SECURITY DEFINER lets them read
-- employees regardless of the caller's own RLS visibility; they only ever
-- report on the caller (auth.uid()).
-- ---------------------------------------------------------------------------

create function private.staff_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select e.role
  from public.employees e
  where e.id = (select auth.uid())
    and e.is_active
$$;

create function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.staff_role() in ('employee', 'manager', 'owner'), false)
$$;

create function private.is_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.staff_role() in ('manager', 'owner'), false)
$$;

create function private.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.staff_role() = 'owner', false)
$$;

revoke all on function private.staff_role() from public, anon, authenticated;
revoke all on function private.is_staff()   from public, anon, authenticated;
revoke all on function private.is_manager() from public, anon, authenticated;
revoke all on function private.is_owner()   from public, anon, authenticated;

grant execute on function private.staff_role() to authenticated, service_role;
grant execute on function private.is_staff()   to authenticated, service_role;
grant execute on function private.is_manager() to authenticated, service_role;
grant execute on function private.is_owner()   to authenticated, service_role;
