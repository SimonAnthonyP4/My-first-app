-- Bro Batch M1 — functions callable through the API, and the auth token hook.
--
-- Every SECURITY DEFINER function pins search_path to '' and schema-qualifies
-- each reference, so objects created by a caller can never be picked up.

-- ---------------------------------------------------------------------------
-- register_customer: creates the caller's customer profile.
--
-- Called by the Rewards app right after sign-up. The email is read from
-- auth.users, never from the client. Safe to call again: a second call
-- returns the existing profile unchanged.
-- ---------------------------------------------------------------------------

create function public.register_customer(
  p_full_name text,
  p_phone text default null,
  p_marketing_opt_in boolean default false
)
returns public.customers
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_customer public.customers;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select c.* into v_customer from public.customers c where c.id = v_uid;
  if found then
    if v_customer.deleted_at is not null then
      raise exception 'this account has been deleted' using errcode = '42501';
    end if;
    return v_customer;
  end if;

  if exists (select 1 from public.employees e where e.id = v_uid) then
    raise exception 'employee accounts cannot register as customers' using errcode = '42501';
  end if;

  select u.email into v_email from auth.users u where u.id = v_uid;
  if v_email is null or btrim(v_email) = '' then
    raise exception 'an email address is required to join rewards' using errcode = '22023';
  end if;

  insert into public.customers (id, full_name, email, phone, marketing_opt_in)
  values (
    v_uid,
    btrim(p_full_name),
    v_email,
    nullif(btrim(p_phone), ''),
    coalesce(p_marketing_opt_in, false)
  )
  on conflict (id) do nothing;

  select c.* into strict v_customer from public.customers c where c.id = v_uid;
  return v_customer;
end;
$$;

-- ---------------------------------------------------------------------------
-- Customer lookup for the POS.
--
-- Cashiers have no direct access to the customers table. These functions
-- return only what the checkout screen needs: no email, no phone.
-- ---------------------------------------------------------------------------

create function public.lookup_customer_by_code(p_membership_code text)
returns table (
  customer_id uuid,
  full_name text,
  points_balance bigint,
  member_since timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_staff() then
    raise exception 'staff only' using errcode = '42501';
  end if;

  return query
    select c.id, c.full_name, a.balance, c.created_at
    from public.customers c
    join public.loyalty_accounts a on a.customer_id = c.id
    where c.membership_code = lower(btrim(p_membership_code))
      and c.deleted_at is null;
end;
$$;

-- Exact match on email or phone only: no partial search, so the function
-- cannot be used to browse the customer list.
create function public.find_customer_by_contact(p_contact text)
returns table (
  customer_id uuid,
  full_name text,
  points_balance bigint,
  member_since timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_contact text := btrim(coalesce(p_contact, ''));
begin
  if not private.is_staff() then
    raise exception 'staff only' using errcode = '42501';
  end if;

  if v_contact = '' then
    return;
  end if;

  return query
    select c.id, c.full_name, a.balance, c.created_at
    from public.customers c
    join public.loyalty_accounts a on a.customer_id = c.id
    where c.deleted_at is null
      and (
        c.email operator(extensions.=) v_contact::extensions.citext
        or c.phone = v_contact
      )
    order by c.created_at
    limit 5;
end;
$$;

-- ---------------------------------------------------------------------------
-- Custom access token hook.
--
-- Adds a `user_role` claim (owner | manager | employee | customer | null) to
-- each access token so the apps can pick the right screens without a query.
-- It is a convenience for clients only: every RLS policy re-checks the
-- employees table, so a stale claim grants nothing.
--
-- Must be switched on in Auth settings (see supabase/config.toml for local
-- development and docs/RUNBOOK.md for hosted projects).
-- ---------------------------------------------------------------------------

create function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_user_id uuid := (event ->> 'user_id')::uuid;
  v_claims jsonb := coalesce(event -> 'claims', '{}'::jsonb);
  v_role text;
begin
  select e.role into v_role
  from public.employees e
  where e.id = v_user_id and e.is_active;

  if v_role is null and exists (
    select 1 from public.customers c where c.id = v_user_id and c.deleted_at is null
  ) then
    v_role := 'customer';
  end if;

  v_claims := jsonb_set(v_claims, '{user_role}', coalesce(to_jsonb(v_role), 'null'::jsonb));
  return jsonb_set(event, '{claims}', v_claims);
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

revoke all on function public.register_customer(text, text, boolean) from public, anon, authenticated;
revoke all on function public.lookup_customer_by_code(text)          from public, anon, authenticated;
revoke all on function public.find_customer_by_contact(text)         from public, anon, authenticated;
revoke all on function public.custom_access_token_hook(jsonb)        from public, anon, authenticated;

grant execute on function public.register_customer(text, text, boolean) to authenticated;
grant execute on function public.lookup_customer_by_code(text)          to authenticated;
grant execute on function public.find_customer_by_contact(text)         to authenticated;

-- The hook runs as the auth service, which needs to read the two tables.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
grant select on public.employees, public.customers to supabase_auth_admin;
