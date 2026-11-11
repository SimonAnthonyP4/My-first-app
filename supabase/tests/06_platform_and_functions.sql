-- Settings, webhook log, audit log, push tokens, the POS customer lookup
-- functions and the access token hook.
begin;
set local search_path = public, extensions;

select plan(40);

select tests.create_employee('owner',    'owner');
select tests.create_employee('manager',  'manager');
select tests.create_employee('cashier',  'employee');
select tests.create_employee('inactive', 'employee');
select tests.create_customer('alice', 'Alice Customer');
select tests.create_customer('bob',   'Bob Customer');
select tests.create_user('stranger');

update public.employees set is_active = false where id = tests.id('inactive');
update public.customers set phone = '+14155550101' where id = tests.id('alice');

-- app_settings -----------------------------------------------------------------
select tests.authenticate_as('alice');
select is(
  (select points_per_dollar from public.app_settings), 10,
  'signed-in users can read the earn rate'
);
select lives_ok(
  $$ update public.app_settings set points_per_dollar = 1000 $$,
  'a customer changing the earn rate raises no error...'
);
select tests.clear_authentication();
select is(
  (select points_per_dollar from public.app_settings), 10,
  '...and changes nothing'
);

select tests.authenticate_as('manager');
select lives_ok(
  $$ update public.app_settings set points_per_dollar = 1000 $$,
  'a manager changing the earn rate raises no error...'
);
select tests.clear_authentication();
select is(
  (select points_per_dollar from public.app_settings), 10,
  '...and changes nothing'
);

select tests.authenticate_as('owner');
select lives_ok(
  $$ update public.app_settings set refund_approval_threshold_cents = 5000 $$,
  'an owner can change settings'
);
select throws_ok(
  $$ update public.app_settings set points_per_dollar = -5 $$,
  '23514', null, 'the earn rate cannot be negative'
);
select tests.clear_authentication();
select is(
  (select updated_by from public.app_settings), tests.id('owner'),
  'settings record who changed them last'
);
select throws_ok(
  $$ insert into public.app_settings (id) values (false) $$,
  '23514', null, 'a second settings row is impossible'
);
select throws_ok(
  $$ delete from public.app_settings $$,
  '23001', null, 'the settings row cannot be deleted'
);

-- audit_log ---------------------------------------------------------------------
select is(
  (select count(*) from public.audit_log
   where entity = 'app_settings' and actor_id = tests.id('owner') and actor_role = 'owner'
     and before ->> 'refund_approval_threshold_cents' = '2500'
     and after  ->> 'refund_approval_threshold_cents' = '5000'),
  1::bigint, 'the settings change is audited'
);
select throws_ok(
  $$ update public.audit_log set action = 'nothing.happened' $$,
  '23001', null, 'audit entries cannot be edited'
);
select throws_ok(
  $$ delete from public.audit_log $$,
  '23001', null, 'audit entries cannot be deleted'
);

select tests.authenticate_as('manager');
select is_empty(
  $$ select 1 from public.audit_log $$,
  'managers cannot read the audit log'
);
select tests.clear_authentication();

select tests.authenticate_as('owner');
select isnt_empty(
  $$ select 1 from public.audit_log $$,
  'owners can read the audit log'
);
select throws_ok(
  $$ insert into public.audit_log (action, entity) values ('fake.entry', 'orders') $$,
  '42501', null, 'not even an owner can write audit entries'
);

-- stripe_events -------------------------------------------------------------------
select throws_ok(
  $$ select * from public.stripe_events $$,
  '42501', null, 'not even an owner can read raw webhook events from a client'
);
select tests.clear_authentication();

select tests.authenticate_as_service_role();
select lives_ok(
  $$ insert into public.stripe_events (id, type, payload)
     values ('evt_test_1', 'payment_intent.succeeded', '{}'::jsonb) $$,
  'the server can record a webhook event'
);
select throws_ok(
  $$ insert into public.stripe_events (id, type, payload)
     values ('evt_test_1', 'payment_intent.succeeded', '{}'::jsonb) $$,
  '23505', null, 'the same webhook event id cannot be recorded twice'
);
select tests.clear_authentication();

-- push_tokens ---------------------------------------------------------------------
select tests.authenticate_as('alice');
select lives_ok(
  $$ insert into public.push_tokens (customer_id, token)
     values (tests.id('alice'), repeat('a1', 32)) $$,
  'a customer can register their own device token'
);
select throws_ok(
  $$ insert into public.push_tokens (customer_id, token)
     values (tests.id('bob'), repeat('b2', 32)) $$,
  '42501', null, 'a customer cannot register a token for someone else'
);
select tests.clear_authentication();

select tests.authenticate_as('bob');
select is_empty(
  $$ select 1 from public.push_tokens $$,
  'a customer cannot see another customer''s device tokens'
);
select lives_ok(
  $$ delete from public.push_tokens $$,
  'a customer deleting all visible tokens raises no error...'
);
select tests.clear_authentication();
select is(
  (select count(*) from public.push_tokens where customer_id = tests.id('alice')), 1::bigint,
  '...and removes nobody else''s'
);

-- Customer lookup for the POS -------------------------------------------------------
select tests.authenticate_as('cashier');
select is_empty(
  $$ select 1 from public.lookup_customer_by_code(repeat('f', 32)) $$,
  'an unknown membership code returns nothing'
);
select results_eq(
  $$ select customer_id, full_name, points_balance
     from public.lookup_customer_by_code('  ' || upper(tests.membership_code('alice'))) $$,
  $$ select tests.id('alice'), 'Alice Customer', 0::bigint $$,
  'a cashier finds a customer by scanned code (case and whitespace tolerant)'
);
select results_eq(
  $$ select full_name from public.find_customer_by_contact('ALICE@test.brobatch') $$,
  array['Alice Customer'],
  'a cashier finds a customer by exact email, ignoring case'
);
select results_eq(
  $$ select full_name from public.find_customer_by_contact('+14155550101') $$,
  array['Alice Customer'],
  'a cashier finds a customer by exact phone number'
);
select is_empty(
  $$ select 1 from public.find_customer_by_contact('alice') $$,
  'partial matches return nothing, so the list cannot be browsed'
);
select is_empty(
  $$ select 1 from public.find_customer_by_contact('%') $$,
  'wildcards are not interpreted'
);
select tests.clear_authentication();

select tests.authenticate_as('bob');
select throws_ok(
  $$ select * from public.lookup_customer_by_code(tests.membership_code('alice')) $$,
  '42501', 'staff only',
  'a customer cannot look up other customers by code'
);
select throws_ok(
  $$ select * from public.find_customer_by_contact('alice@test.brobatch') $$,
  '42501', 'staff only',
  'a customer cannot look up other customers by contact'
);
select tests.clear_authentication();

select tests.authenticate_as('inactive');
select throws_ok(
  $$ select * from public.find_customer_by_contact('alice@test.brobatch') $$,
  '42501', 'staff only',
  'a deactivated employee cannot look up customers'
);
select tests.clear_authentication();

-- Access token hook -------------------------------------------------------------------
select is(
  public.custom_access_token_hook(
    jsonb_build_object('user_id', tests.id('owner'), 'claims', jsonb_build_object('role', 'authenticated'))
  ) -> 'claims',
  jsonb_build_object('role', 'authenticated', 'user_role', 'owner'),
  'the hook adds user_role=owner and keeps existing claims'
);
select is(
  public.custom_access_token_hook(
    jsonb_build_object('user_id', tests.id('alice'), 'claims', '{}'::jsonb)
  ) #>> '{claims,user_role}',
  'customer',
  'the hook marks customers'
);
select is(
  public.custom_access_token_hook(
    jsonb_build_object('user_id', tests.id('inactive'), 'claims', '{}'::jsonb)
  ) #> '{claims,user_role}',
  'null'::jsonb,
  'a deactivated employee gets no role'
);
select is(
  public.custom_access_token_hook(
    jsonb_build_object('user_id', tests.id('stranger'), 'claims', '{}'::jsonb)
  ) #> '{claims,user_role}',
  'null'::jsonb,
  'a user with no profile gets no role'
);

-- The hook runs as the auth service, which is subject to RLS.
select ok(
  has_table_privilege('supabase_auth_admin', 'public.employees', 'select')
  and has_table_privilege('supabase_auth_admin', 'public.customers', 'select'),
  'the auth service may read the tables the hook needs'
);
select is(
  (select count(*) from pg_policies
   where schemaname = 'public' and tablename in ('employees', 'customers')
     and roles = '{supabase_auth_admin}' and cmd = 'SELECT'),
  2::bigint,
  'RLS lets the auth service read employees and customers for the hook'
);
select case
  when pg_has_role(current_user, 'supabase_auth_admin', 'member') then
    is(
      tests.run_hook_as_auth_admin(tests.id('manager')) #>> '{claims,user_role}',
      'manager',
      'the hook works when executed as the auth service role'
    )
  else
    skip('test runner cannot assume supabase_auth_admin in this environment', 1)
end;

select * from finish();
rollback;
