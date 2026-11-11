-- Products and inventory: visibility, who may change what, and the stock ledger.
begin;
set local search_path = public, extensions;

select plan(31);

select tests.create_employee('owner',   'owner');
select tests.create_employee('manager', 'manager');
select tests.create_employee('cashier', 'employee');
select tests.create_customer('alice');

insert into public.products (id, sku, name, flavor, category, bar_count, price_cents, is_active)
values
  ('00000000-0000-4000-a000-000000000001', 'T-BAR-LIVE',    'Live Bar',    'Test Vanilla', 'bar',        1, 300, true),
  ('00000000-0000-4000-a000-000000000002', 'T-BAR-RETIRED', 'Retired Bar', 'Test Mint',    'bar',        1, 300, false),
  ('00000000-0000-4000-a000-000000000003', 'T-3PK-LIVE',    'Live 3-Pack', 'Test Vanilla', 'three_pack', 3, 850, true);

-- Constraints --------------------------------------------------------------
select throws_ok(
  $$ insert into public.products (sku, name, flavor, category, price_cents)
     values ('T-NEG', 'Negative', 'None', 'bar', -1) $$,
  '23514', null, 'prices cannot be negative'
);
select throws_ok(
  $$ insert into public.products (sku, name, flavor, category, price_cents)
     values ('T-CAT', 'Bad Category', 'None', 'crate', 100) $$,
  '23514', null, 'unknown product categories are rejected'
);
select throws_ok(
  $$ insert into public.products (sku, name, flavor, category, price_cents)
     values ('T-BAR-LIVE', 'Duplicate', 'None', 'bar', 100) $$,
  '23505', null, 'SKUs are unique'
);
select is(
  (select on_hand from public.inventory_levels
   where product_id = '00000000-0000-4000-a000-000000000001'),
  0, 'a new product gets an inventory level of zero'
);

-- Customers ------------------------------------------------------------------
select tests.authenticate_as('alice');
select set_eq(
  $$ select sku from public.products where sku like 'T-%' $$,
  array['T-BAR-LIVE', 'T-3PK-LIVE'],
  'customers see active products only'
);
select throws_ok(
  $$ insert into public.products (sku, name, flavor, category, price_cents)
     values ('T-HACK', 'Free Bar', 'None', 'bar', 0) $$,
  '42501', null, 'customers cannot add products'
);
select lives_ok(
  $$ update public.products set price_cents = 1 where sku = 'T-BAR-LIVE' $$,
  'a customer changing a price raises no error...'
);
select is_empty(
  $$ select 1 from public.inventory_levels $$,
  'customers cannot see stock levels'
);
select tests.clear_authentication();
select is(
  (select price_cents from public.products where sku = 'T-BAR-LIVE'), 300::bigint,
  '...and changes nothing'
);

-- Cashiers -------------------------------------------------------------------
select tests.authenticate_as('cashier');
select is_empty(
  $$ select 1 from public.products where sku = 'T-BAR-RETIRED' $$,
  'cashiers do not see retired products'
);
select isnt_empty(
  $$ select 1 from public.inventory_levels $$,
  'cashiers can see stock levels'
);
select throws_ok(
  $$ insert into public.inventory_movements (product_id, delta, reason, employee_id)
     values ('00000000-0000-4000-a000-000000000001', 10, 'restock', tests.id('cashier')) $$,
  '42501', null, 'cashiers cannot record stock movements'
);
select lives_ok(
  $$ update public.products set price_cents = 1 where sku = 'T-BAR-LIVE' $$,
  'a cashier changing a price raises no error...'
);
select tests.clear_authentication();
select is(
  (select price_cents from public.products where sku = 'T-BAR-LIVE'), 300::bigint,
  '...and changes nothing'
);

-- Managers -------------------------------------------------------------------
select tests.authenticate_as('manager');
select is(
  (select count(*) from public.products where sku like 'T-%'), 3::bigint,
  'managers see retired products too'
);
select lives_ok(
  $$ update public.products set price_cents = 325 where sku = 'T-BAR-LIVE' $$,
  'managers can change prices'
);
select lives_ok(
  $$ insert into public.products (sku, name, flavor, category, price_cents)
     values ('T-NEW', 'New Bar', 'Test Mocha', 'bar', 300) $$,
  'managers can add products'
);
select throws_ok(
  $$ delete from public.products where sku = 'T-NEW' $$,
  '42501', null, 'products cannot be deleted, only deactivated'
);
select lives_ok(
  $$ insert into public.inventory_movements (product_id, delta, reason, note, employee_id)
     values ('00000000-0000-4000-a000-000000000001', 24, 'restock', 'case of 24', tests.id('manager')) $$,
  'managers can record a restock in their own name'
);
select lives_ok(
  $$ insert into public.inventory_movements (product_id, delta, reason, employee_id)
     values ('00000000-0000-4000-a000-000000000001', -2, 'waste', tests.id('manager')) $$,
  'managers can record waste'
);
select is(
  (select on_hand from public.inventory_levels
   where product_id = '00000000-0000-4000-a000-000000000001'),
  22, 'on_hand follows the movements: 0 + 24 - 2 = 22'
);
select throws_ok(
  $$ insert into public.inventory_movements (product_id, delta, reason, employee_id)
     values ('00000000-0000-4000-a000-000000000001', 5, 'restock', tests.id('owner')) $$,
  '42501', null, 'a manager cannot record a movement in someone else''s name'
);
select throws_ok(
  $$ insert into public.inventory_movements (product_id, delta, reason, employee_id)
     values ('00000000-0000-4000-a000-000000000001', 5, 'refund_restock', tests.id('manager')) $$,
  '42501', null, 'sale and refund movements are reserved for the server'
);
select throws_ok(
  $$ update public.inventory_levels set on_hand = 999
     where product_id = '00000000-0000-4000-a000-000000000001' $$,
  '42501', null, 'managers cannot overwrite on_hand directly'
);
select lives_ok(
  $$ update public.inventory_levels set reorder_at = 12
     where product_id = '00000000-0000-4000-a000-000000000001' $$,
  'managers can set the reorder point'
);
select tests.clear_authentication();

select is(
  (select count(*) from public.audit_log
   where entity = 'products' and action = 'products.update'
     and actor_id = tests.id('manager')
     and before ->> 'price_cents' = '300' and after ->> 'price_cents' = '325'),
  1::bigint, 'the price change is audited with before and after values'
);

-- Invariants that hold even for the server -----------------------------------
select tests.authenticate_as_service_role();
select throws_ok(
  $$ update public.inventory_levels set on_hand = 999
     where product_id = '00000000-0000-4000-a000-000000000001' $$,
  '23001', 'on_hand changes only through inventory_movements',
  'not even the service role can overwrite on_hand'
);
select throws_ok(
  $$ update public.inventory_movements set delta = 1000 $$,
  '23001', null, 'stock movements cannot be edited'
);
select throws_ok(
  $$ delete from public.inventory_movements $$,
  '23001', null, 'stock movements cannot be deleted'
);
select throws_ok(
  $$ insert into public.inventory_movements (product_id, delta, reason)
     values ('00000000-0000-4000-a000-000000000001', 5, 'sale') $$,
  '23514', null, 'a sale movement must reduce stock and reference an order'
);
select throws_ok(
  $$ insert into public.inventory_movements (product_id, delta, reason)
     values ('00000000-0000-4000-a000-000000000001', 0, 'adjustment') $$,
  '23514', null, 'a movement of zero is rejected'
);
select tests.clear_authentication();

select * from finish();
rollback;
