-- Structure and privilege baseline. These are regression guards: a future
-- migration that adds a table without RLS, leaves a function callable by
-- anon, or opens a write path to clients fails here.
begin;
set local search_path = public, extensions;

select plan(35);

-- Tables -------------------------------------------------------------------
select has_table('public', 'customers', 'customers table exists');
select has_table('public', 'employees', 'employees table exists');
select has_table('public', 'products', 'products table exists');
select has_table('public', 'inventory_levels', 'inventory_levels table exists');
select has_table('public', 'inventory_movements', 'inventory_movements table exists');
select has_table('public', 'orders', 'orders table exists');
select has_table('public', 'order_items', 'order_items table exists');
select has_table('public', 'payments', 'payments table exists');
select has_table('public', 'refunds', 'refunds table exists');
select has_table('public', 'refund_items', 'refund_items table exists');
select has_table('public', 'loyalty_accounts', 'loyalty_accounts table exists');
select has_table('public', 'loyalty_transactions', 'loyalty_transactions table exists');
select has_table('public', 'rewards', 'rewards table exists');
select has_table('public', 'redemptions', 'redemptions table exists');
select has_table('public', 'app_settings', 'app_settings table exists');
select has_table('public', 'stripe_events', 'stripe_events table exists');
select has_table('public', 'audit_log', 'audit_log table exists');
select has_table('public', 'push_tokens', 'push_tokens table exists');

-- RLS on everything --------------------------------------------------------
select is_empty(
  $$ select c.relname::text
     from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity $$,
  'every table in public has row-level security enabled'
);

-- A table with RLS on and no policy is closed to clients, which is correct for
-- stripe_events. Everything else must have at least one policy.
select set_eq(
  $$ select c.relname::text
     from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r'
       and not exists (select 1 from pg_policy p where p.polrelid = c.oid) $$,
  array['stripe_events'],
  'only stripe_events has no policies at all'
);

-- anon ---------------------------------------------------------------------
select is_empty(
  $$ select table_name::text, privilege_type::text
     from information_schema.role_table_grants
     where table_schema = 'public' and grantee in ('anon', 'PUBLIC') $$,
  'anon and PUBLIC hold no table privileges in public'
);

select is_empty(
  $$ select table_name::text, column_name::text
     from information_schema.column_privileges
     where table_schema = 'public' and grantee in ('anon', 'PUBLIC') $$,
  'anon and PUBLIC hold no column privileges in public'
);

select is_empty(
  $$ select n.nspname::text, p.proname::text
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'private')
       and has_function_privilege('anon', p.oid, 'execute') $$,
  'anon cannot execute any function in public or private'
);

select is_empty(
  $$ select c.relname::text
     from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'S'
       and (has_sequence_privilege('anon', c.oid, 'usage')
            or has_sequence_privilege('authenticated', c.oid, 'usage')) $$,
  'client roles cannot use sequences directly'
);

select ok(
  not has_schema_privilege('anon', 'private', 'usage'),
  'anon has no access to the private schema'
);

-- authenticated: functions -------------------------------------------------
select set_eq(
  $$ select n.nspname || '.' || p.proname
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'private')
       and has_function_privilege('authenticated', p.oid, 'execute') $$,
  array[
    'public.register_customer',
    'public.lookup_customer_by_code',
    'public.find_customer_by_contact',
    'private.staff_role',
    'private.is_staff',
    'private.is_manager',
    'private.is_owner'
  ],
  'authenticated can execute exactly the intended functions'
);

select ok(
  not has_function_privilege('authenticated', 'public.custom_access_token_hook(jsonb)', 'execute'),
  'clients cannot call the access token hook'
);
select ok(
  has_function_privilege('supabase_auth_admin', 'public.custom_access_token_hook(jsonb)', 'execute'),
  'the auth service can call the access token hook'
);

-- authenticated: every write path, table- or column-level -------------------
select set_eq(
  $$ select distinct table_name::text || ':' || privilege_type::text
     from (
       select table_name, privilege_type
       from information_schema.role_table_grants
       where table_schema = 'public' and grantee = 'authenticated'
       union all
       select table_name, privilege_type
       from information_schema.column_privileges
       where table_schema = 'public' and grantee = 'authenticated'
     ) g
     where privilege_type <> 'SELECT' $$,
  array[
    'employees:UPDATE',
    'customers:UPDATE',
    'products:INSERT',
    'products:UPDATE',
    'inventory_levels:UPDATE',
    'inventory_movements:INSERT',
    'rewards:INSERT',
    'rewards:UPDATE',
    'app_settings:UPDATE',
    'push_tokens:INSERT',
    'push_tokens:DELETE'
  ],
  'authenticated has exactly the intended write privileges'
);

-- The money and ledger tables have no client write path of any kind.
select is_empty(
  $$ select t.name
     from unnest(array[
       'orders', 'order_items', 'payments', 'refunds', 'refund_items',
       'loyalty_accounts', 'loyalty_transactions', 'redemptions',
       'stripe_events', 'audit_log'
     ]) as t(name)
     where has_table_privilege('authenticated', 'public.' || t.name, 'insert, update, delete, truncate')
        or has_any_column_privilege('authenticated', 'public.' || t.name, 'insert, update') $$,
  'clients cannot write orders, payments, refunds, loyalty or audit tables'
);

select ok(
  not has_table_privilege('authenticated', 'public.stripe_events', 'select'),
  'clients cannot read stripe_events'
);

-- Column-level limits that matter most.
select ok(
  not has_column_privilege('authenticated', 'public.customers', 'email', 'update')
  and not has_column_privilege('authenticated', 'public.customers', 'membership_code', 'update')
  and not has_column_privilege('authenticated', 'public.customers', 'deleted_at', 'update'),
  'customers cannot change their email, membership code or deletion flag'
);
select ok(
  not has_column_privilege('authenticated', 'public.inventory_levels', 'on_hand', 'update'),
  'on_hand is not directly writable'
);

-- SECURITY DEFINER hygiene ---------------------------------------------------
select is_empty(
  $$ select n.nspname || '.' || p.proname
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'private')
       and p.prosecdef
       and not coalesce(p.proconfig, '{}') @> array['search_path=""'] $$,
  'every SECURITY DEFINER function pins search_path to empty'
);

-- service_role keeps full access (it is the server-side writer).
select ok(
  has_table_privilege('service_role', 'public.orders', 'insert, update')
  and has_table_privilege('service_role', 'public.loyalty_transactions', 'insert')
  and has_table_privilege('service_role', 'public.stripe_events', 'insert, update'),
  'service_role can write the server-owned tables'
);

select * from finish();
rollback;
