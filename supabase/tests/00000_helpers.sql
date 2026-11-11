-- Test helpers. Runs first (files are executed in name order) and is the only
-- test file that commits: it installs pgTAP and a `tests` schema with
-- functions the other files use to create users and switch identity.
-- Never applied to production: `supabase db push` ignores supabase/tests.

set client_min_messages = warning;

create extension if not exists pgtap with schema extensions;

-- Rebuilt from scratch on every run so helper changes always take effect.
drop schema if exists tests cascade;
create schema tests;
grant usage on schema tests to anon, authenticated, service_role;

-- Fixture registry: tests refer to users by a short name instead of a uuid.
-- Rows are written inside each test's transaction and vanish on rollback.
create table tests.fixtures (
  name text primary key,
  id   uuid not null
);
grant select on tests.fixtures to anon, authenticated, service_role;

create or replace function tests.id(p_name text)
returns uuid
language sql
stable
as $$
  select f.id from tests.fixtures f where f.name = p_name
$$;

-- A bare auth user (no profile) with the email <name>@test.brobatch.
create or replace function tests.create_user(p_name text)
returns uuid
language plpgsql
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email) values (v_id, p_name || '@test.brobatch');
  insert into tests.fixtures (name, id) values (p_name, v_id);
  return v_id;
end;
$$;

create or replace function tests.create_employee(
  p_name text,
  p_role text default 'employee',
  p_full_name text default null
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid := tests.create_user(p_name);
begin
  insert into public.employees (id, full_name, role)
  values (v_id, coalesce(p_full_name, initcap(p_name)), p_role);
  return v_id;
end;
$$;

create or replace function tests.create_customer(
  p_name text,
  p_full_name text default null
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid := tests.create_user(p_name);
begin
  insert into public.customers (id, full_name, email)
  values (v_id, coalesce(p_full_name, initcap(p_name)), p_name || '@test.brobatch');
  return v_id;
end;
$$;

-- Act as a signed-in user, the way a request through the API would.
create or replace function tests.authenticate_as(p_name text)
returns void
language plpgsql
as $$
declare
  v_id uuid := tests.id(p_name);
begin
  if v_id is null then
    raise exception 'unknown test fixture: %', p_name;
  end if;
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_id, 'role', 'authenticated')::text,
    true
  );
  perform set_config('role', 'authenticated', true);
end;
$$;

create or replace function tests.authenticate_as_anon()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  perform set_config('role', 'anon', true);
end;
$$;

create or replace function tests.authenticate_as_service_role()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
  perform set_config('role', 'service_role', true);
end;
$$;

-- Back to the privileged test runner role.
create or replace function tests.clear_authentication()
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'none', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;

-- Reads a customer's membership code as the test runner (cashiers cannot).
create or replace function tests.membership_code(p_name text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select c.membership_code from public.customers c where c.id = tests.id(p_name)
$$;

-- Runs the access token hook the way the auth service does: as
-- supabase_auth_admin, which is subject to RLS.
create or replace function tests.run_hook_as_auth_admin(p_user_id uuid)
returns jsonb
language plpgsql
as $$
declare
  v_result jsonb;
begin
  perform set_config('role', 'supabase_auth_admin', true);
  v_result := public.custom_access_token_hook(
    jsonb_build_object('user_id', p_user_id, 'claims', '{}'::jsonb)
  );
  perform set_config('role', 'none', true);
  return v_result;
end;
$$;

-- A paid order with one line item, written the way the server will write it.
create or replace function tests.create_paid_order(
  p_customer_id uuid,
  p_employee_id uuid,
  p_product_id uuid,
  p_quantity integer default 1
)
returns uuid
language plpgsql
as $$
declare
  v_order_id uuid := gen_random_uuid();
  v_product public.products;
begin
  select * into strict v_product from public.products where id = p_product_id;

  insert into public.orders (
    id, customer_id, employee_id, status, subtotal_cents, total_cents, idempotency_key, paid_at
  )
  values (
    v_order_id, p_customer_id, p_employee_id, 'paid',
    v_product.price_cents * p_quantity, v_product.price_cents * p_quantity,
    'test-' || v_order_id::text, now()
  );

  insert into public.order_items (
    order_id, product_id, product_name, flavor, bar_count,
    unit_price_cents, quantity, line_total_cents
  )
  values (
    v_order_id, v_product.id, v_product.name, v_product.flavor, v_product.bar_count,
    v_product.price_cents, p_quantity, v_product.price_cents * p_quantity
  );

  return v_order_id;
end;
$$;

set search_path = public, extensions;
select plan(1);
select has_schema('tests', 'test helper schema is installed');
select * from finish();
