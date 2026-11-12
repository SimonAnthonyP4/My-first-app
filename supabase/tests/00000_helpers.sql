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
-- Server-side tests register ids returned by the functions they call.
grant insert on tests.fixtures to service_role;

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

-- A bare order (no line items) with a given total, registered as a fixture.
-- Needs an employee fixture named 'cashier'. p_customer may be null (walk-in).
create or replace function tests.create_order(
  p_name text,
  p_customer text,
  p_total_cents bigint,
  p_status public.order_status default 'paid',
  p_discount_cents bigint default 0,
  p_reward_cents bigint default 0
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into public.orders (
    id, customer_id, employee_id, status, subtotal_cents, discount_cents, reward_cents,
    total_cents, idempotency_key, paid_at
  )
  values (
    v_id, tests.id(p_customer), tests.id('cashier'), p_status,
    p_total_cents + p_discount_cents + p_reward_cents, p_discount_cents, p_reward_cents,
    p_total_cents, 'test-order-' || p_name,
    case when p_status in ('paid', 'partially_refunded', 'refunded') then now() end
  );
  insert into tests.fixtures (name, id) values (p_name, v_id);
  return v_id;
end;
$$;

-- A refund against an order fixture, registered as a fixture. Creates the
-- order's succeeded payment on first use.
create or replace function tests.create_refund(
  p_name text,
  p_order text,
  p_amount_cents bigint,
  p_status text default 'succeeded'
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid := gen_random_uuid();
  v_order public.orders;
  v_payment_id uuid;
begin
  select * into strict v_order from public.orders where id = tests.id(p_order);

  select id into v_payment_id from public.payments where order_id = v_order.id and status = 'succeeded';
  if v_payment_id is null then
    insert into public.payments (
      order_id, provider_payment_intent, amount_cents, status, reader_type, succeeded_at
    )
    values (
      v_order.id, 'pi_test_' || replace(v_order.id::text, '-', ''), v_order.total_cents,
      'succeeded', 'simulated', now()
    )
    returning id into v_payment_id;
  end if;

  insert into public.refunds (
    id, order_id, payment_id, amount_cents, reason, status, provider_refund_id,
    idempotency_key, requested_by, completed_at
  )
  values (
    v_id, v_order.id, v_payment_id, p_amount_cents, 'customer_request', p_status,
    're_test_' || replace(v_id::text, '-', ''), 'test-refund-' || p_name, tests.id('cashier'),
    case when p_status in ('succeeded', 'failed', 'canceled') then now() end
  );
  insert into tests.fixtures (name, id) values (p_name, v_id);
  return v_id;
end;
$$;

-- Current points balance of a customer fixture, read as the test runner.
create or replace function tests.balance(p_customer text)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select a.balance from public.loyalty_accounts a where a.customer_id = tests.id(p_customer)
$$;

-- Id of a launch reward by name.
create or replace function tests.reward(p_name text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select r.id from public.rewards r where r.name = p_name
$$;

set search_path = public, extensions;
select plan(1);
select has_schema('tests', 'test helper schema is installed');
select * from finish();
