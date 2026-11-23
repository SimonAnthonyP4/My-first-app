-- Employees and customers: who can see and change whom.
begin;
set local search_path = public, extensions;

select plan(42);

-- Fixtures -----------------------------------------------------------------
select tests.create_employee('owner',    'owner',    'Olive Owner');
select tests.create_employee('manager',  'manager',  'Max Manager');
select tests.create_employee('cashier',  'employee', 'Casey Cashier');
select tests.create_employee('inactive', 'manager',  'Ina Inactive');
select tests.create_customer('alice', 'Alice Customer');
select tests.create_customer('bob',   'Bob Customer');
select tests.create_user('newbie');

update public.employees set is_active = false where id = tests.id('inactive');

-- anon ---------------------------------------------------------------------
select tests.authenticate_as_anon();
select throws_ok(
  $$ select * from public.customers $$, '42501', null,
  'anon cannot read customers'
);
select throws_ok(
  $$ select * from public.employees $$, '42501', null,
  'anon cannot read employees'
);
select throws_ok(
  $$ select public.register_customer('Anon Person') $$, '42501', null,
  'anon cannot call register_customer'
);
select tests.clear_authentication();

-- Customers: isolation -----------------------------------------------------
select tests.authenticate_as('alice');

select results_eq(
  $$ select full_name from public.customers $$,
  array['Alice Customer'],
  'a customer sees only their own profile'
);
select is_empty(
  $$ select 1 from public.customers where id = tests.id('bob') $$,
  'a customer cannot read another customer by id'
);
select is_empty(
  $$ select 1 from public.employees $$,
  'a customer cannot read employees'
);
select results_eq(
  $$ select balance from public.loyalty_accounts $$,
  array[0::bigint],
  'a customer gets a loyalty account at zero, and sees only their own'
);

select lives_ok(
  $$ update public.customers
     set full_name = 'Alice Renamed', phone = '+14155550101', marketing_opt_in = true
     where id = tests.id('alice') $$,
  'a customer can update their own name, phone and marketing preference'
);
select throws_ok(
  $$ update public.customers set email = 'evil@test.brobatch' where id = tests.id('alice') $$,
  '42501', null,
  'a customer cannot change their email directly'
);
select throws_ok(
  $$ update public.customers set membership_code = repeat('a', 32) where id = tests.id('alice') $$,
  '42501', null,
  'a customer cannot choose their membership code'
);
select throws_ok(
  $$ update public.customers set phone = '555-0101' where id = tests.id('alice') $$,
  '23514', null,
  'phone numbers must be E.164'
);
select lives_ok(
  $$ update public.customers set full_name = 'Hacked' where id = tests.id('bob') $$,
  'updating another customer raises no error...'
);
select throws_ok(
  $$ insert into public.customers (id, full_name, email)
     values (tests.id('alice'), 'Dup', 'dup@test.brobatch') $$,
  '42501', null,
  'a customer cannot insert customer rows directly'
);
select throws_ok(
  $$ delete from public.customers where id = tests.id('alice') $$,
  '42501', null,
  'a customer cannot delete their profile row directly'
);
select tests.clear_authentication();

select is(
  (select full_name from public.customers where id = tests.id('bob')),
  'Bob Customer',
  '...and changes nothing'
);
select is(
  (select full_name from public.customers where id = tests.id('alice')),
  'Alice Renamed',
  'the self-update was applied'
);
select matches(
  (select membership_code from public.customers where id = tests.id('alice')),
  '^[0-9a-f]{32}$',
  'membership codes are 32 random hex characters'
);

-- Staff visibility ---------------------------------------------------------
select tests.authenticate_as('cashier');
select is_empty(
  $$ select 1 from public.customers $$,
  'a cashier cannot read the customers table directly'
);
select results_eq(
  $$ select full_name from public.employees $$,
  array['Casey Cashier'],
  'a cashier sees only their own employee row'
);
select lives_ok(
  $$ update public.employees set role = 'owner' where id = tests.id('cashier') $$,
  'a cashier promoting themselves raises no error...'
);
select tests.clear_authentication();
select is(
  (select role from public.employees where id = tests.id('cashier')),
  'employee',
  '...and changes nothing'
);

select tests.authenticate_as('manager');
select is(
  (select count(*) from public.customers), 2::bigint,
  'a manager can read all customers'
);
select is(
  (select count(*) from public.employees), 4::bigint,
  'a manager can read all employees'
);
select lives_ok(
  $$ update public.employees set role = 'owner' where id = tests.id('manager') $$,
  'a manager promoting themselves raises no error...'
);
select tests.clear_authentication();
select is(
  (select role from public.employees where id = tests.id('manager')),
  'manager',
  '...and changes nothing'
);

-- Deactivation takes effect immediately, whatever the token says.
select tests.authenticate_as('inactive');
select is_empty(
  $$ select 1 from public.customers $$,
  'a deactivated manager loses access to customers at once'
);
select is(private.staff_role(), null, 'a deactivated employee has no staff role');
select tests.clear_authentication();

-- Owners manage staff ------------------------------------------------------
select tests.authenticate_as('owner');
select lives_ok(
  $$ update public.employees set role = 'manager' where id = tests.id('cashier') $$,
  'an owner can change an employee role'
);
select throws_ok(
  $$ update public.employees set role = 'superuser' where id = tests.id('cashier') $$,
  '23514', null,
  'unknown roles are rejected'
);
select throws_ok(
  $$ update public.employees set is_active = false where id = tests.id('owner') $$,
  '23001', 'cannot remove the last active owner',
  'the last active owner cannot be deactivated'
);
select throws_ok(
  $$ update public.employees set role = 'manager' where id = tests.id('owner') $$,
  '23001', 'cannot remove the last active owner',
  'the last active owner cannot be demoted'
);
select throws_ok(
  $$ insert into public.employees (id, full_name, role)
     values (tests.id('newbie'), 'New Hire', 'employee') $$,
  '42501', null,
  'even an owner cannot insert employees from a client; the server does that'
);
select tests.clear_authentication();

select is(
  (select count(*) from public.audit_log
   where entity = 'employees' and action = 'employees.update'
     and entity_id = tests.id('cashier')::text
     and actor_id = tests.id('owner') and actor_role = 'owner'
     and before ->> 'role' = 'employee' and after ->> 'role' = 'manager'),
  1::bigint,
  'the role change is in the audit log with actor, before and after'
);

-- One identity per auth user -----------------------------------------------
select throws_ok(
  $$ insert into public.employees (id, full_name, role)
     values (tests.id('alice'), 'Alice Staff', 'employee') $$,
  '23505', null,
  'a customer account cannot also become an employee'
);
select throws_ok(
  $$ insert into public.customers (id, full_name, email)
     values (tests.id('cashier'), 'Casey Shopper', 'casey2@test.brobatch') $$,
  '23505', null,
  'an employee account cannot also become a customer'
);

-- register_customer ----------------------------------------------------------
select tests.authenticate_as('newbie');
select is(
  (select email::text from public.register_customer('  Nia Newbie  ', '+14155550199', true)),
  'newbie@test.brobatch',
  'register_customer takes the email from the auth user, not from the client'
);
select results_eq(
  $$ select c.full_name, c.phone, c.marketing_opt_in, a.balance
     from public.customers c join public.loyalty_accounts a on a.customer_id = c.id $$,
  $$ values ('Nia Newbie', '+14155550199', true, 0::bigint) $$,
  'registration trims the name and creates the loyalty account'
);
select is(
  (select full_name from public.register_customer('Different Name')),
  'Nia Newbie',
  'calling register_customer again returns the existing profile unchanged'
);
select tests.clear_authentication();

select tests.authenticate_as('cashier');
select throws_ok(
  $$ select public.register_customer('Casey Cashier') $$,
  '42501', 'employee accounts cannot register as customers',
  'employees cannot register as customers'
);
select tests.clear_authentication();

-- Email sync and soft delete -------------------------------------------------
update auth.users set email = 'alice.new@test.brobatch' where id = tests.id('alice');
select is(
  (select email::text from public.customers where id = tests.id('alice')),
  'alice.new@test.brobatch',
  'changing the auth email updates the customer email'
);

select throws_ok(
  $$ insert into public.customers (id, full_name, email)
     values (tests.create_user('alicedup'), 'Alice Dup', 'ALICE.NEW@test.brobatch') $$,
  '23505', null,
  'customer emails are unique regardless of letter case'
);

update public.customers
  set deleted_at = now(), email = null, full_name = 'Deleted customer', phone = null
  where id = tests.id('bob');
select tests.authenticate_as('bob');
select is_empty(
  $$ select 1 from public.customers $$,
  'an anonymised customer can no longer read the profile'
);
select tests.clear_authentication();

select * from finish();
rollback;
