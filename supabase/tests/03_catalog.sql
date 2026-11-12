-- Products. Shopify holds the catalog, prices and stock; this table adds the
-- reporting details (flavor, pack type, bars per unit) for each Shopify variant.
begin;
set local search_path = public, extensions;

select plan(16);

select tests.create_employee('manager', 'manager');
select tests.create_employee('cashier', 'employee');
select tests.create_customer('alice');

insert into public.products (id, sku, name, flavor, category, bar_count, price_cents, is_active, shopify_variant_id)
values
  ('00000000-0000-4000-a000-000000000001', 'T-BAR-LIVE',    'Live Bar',    'Test Vanilla', 'bar',        1, 300, true,  9100000000000000001),
  ('00000000-0000-4000-a000-000000000002', 'T-BAR-RETIRED', 'Retired Bar', 'Test Mint',    'bar',        1, 300, false, 9100000000000000002),
  ('00000000-0000-4000-a000-000000000003', null,            'Live 3-Pack', 'Test Vanilla', 'three_pack', 3, 850, true,  9100000000000000003);

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
  $$ insert into public.products (name, flavor, category, price_cents, shopify_variant_id)
     values ('Duplicate', 'None', 'bar', 100, 9100000000000000001) $$,
  '23505', null, 'a Shopify variant is described at most once'
);
select is(
  (select shopify_variant_id from public.products where sku = 'T-BAR-LIVE'),
  9100000000000000001,
  'Shopify ids beyond 2^53 are stored exactly'
);

-- Customers ------------------------------------------------------------------
select tests.authenticate_as('alice');
select is(
  (select count(*) from public.products where name like '%Live%' or name like '%Retired%'), 2::bigint,
  'customers see active products only'
);
select throws_ok(
  $$ insert into public.products (sku, name, flavor, category, price_cents)
     values ('T-HACK', 'Free Bar', 'None', 'bar', 0) $$,
  '42501', null, 'customers cannot add products'
);
select lives_ok(
  $$ update public.products set bar_count = 99 where sku = 'T-BAR-LIVE' $$,
  'a customer editing a product raises no error...'
);
select tests.clear_authentication();
select is(
  (select bar_count from public.products where sku = 'T-BAR-LIVE'), 1,
  '...and changes nothing'
);

-- Cashiers -------------------------------------------------------------------
select tests.authenticate_as('cashier');
select is_empty(
  $$ select 1 from public.products where sku = 'T-BAR-RETIRED' $$,
  'dashboard users without the manager role do not see retired products'
);
select lives_ok(
  $$ update public.products set bar_count = 99 where sku = 'T-BAR-LIVE' $$,
  'a non-manager editing a product raises no error...'
);
select tests.clear_authentication();
select is(
  (select bar_count from public.products where sku = 'T-BAR-LIVE'), 1,
  '...and changes nothing'
);

-- Managers -------------------------------------------------------------------
select tests.authenticate_as('manager');
select is(
  (select count(*) from public.products where name like '%Live%' or name like '%Retired%'), 3::bigint,
  'managers see retired products too'
);
select lives_ok(
  $$ update public.products set flavor = 'Vanilla Bean', bar_count = 1 where sku = 'T-BAR-LIVE' $$,
  'managers can correct the reporting details of a product'
);
select lives_ok(
  $$ insert into public.products (name, flavor, category, bar_count, price_cents)
     values ('New Six-Pack', 'Variety', 'six_pack', 6, 1600) $$,
  'managers can describe a new product'
);
select throws_ok(
  $$ delete from public.products where name = 'New Six-Pack' $$,
  '42501', null, 'products cannot be deleted, only deactivated'
);
select tests.clear_authentication();

select is(
  (select count(*) from public.audit_log
   where entity = 'products' and action = 'products.update'
     and actor_id = tests.id('manager')
     and before ->> 'flavor' = 'Test Vanilla' and after ->> 'flavor' = 'Vanilla Bean'),
  1::bigint, 'the change is audited with before and after values'
);

select * from finish();
rollback;
