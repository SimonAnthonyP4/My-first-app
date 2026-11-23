-- Orders and refunds: the mirror of what Shopify sold and refunded.
-- Money constraints and read isolation. Nothing here is writable by clients;
-- the server writes it from signed Shopify webhooks.
begin;
set local search_path = public, extensions;

select plan(26);

select tests.create_employee('owner',   'owner');
select tests.create_employee('cashier', 'employee');
select tests.create_customer('alice');
select tests.create_customer('bob');

insert into public.products (id, sku, name, flavor, category, bar_count, price_cents)
values ('00000000-0000-4000-a000-000000000001', 'T-BAR', 'Test Bar', 'Test Vanilla', 'bar', 1, 300);

-- Alice: one paid order (3 bars, $9.00) and one still pending. Bob: one paid.
insert into tests.fixtures (name, id) values
  ('alice_paid', tests.create_paid_order(
     tests.id('alice'), tests.id('cashier'), '00000000-0000-4000-a000-000000000001', 3)),
  ('bob_paid', tests.create_paid_order(
     tests.id('bob'), tests.id('cashier'), '00000000-0000-4000-a000-000000000001', 1));

insert into public.orders (id, customer_id, subtotal_cents, total_cents, idempotency_key)
values ('00000000-0000-4000-b000-000000000001', tests.id('alice'), 300, 300, 'test-pending-1');

insert into public.refunds (id, order_id, amount_cents, reason, status, idempotency_key, completed_at)
values (
  '00000000-0000-4000-d000-000000000001', tests.id('alice_paid'), 300, 'damaged', 'succeeded',
  'test-refund-1', now()
);

-- Money constraints ----------------------------------------------------------
select throws_ok(
  $$ insert into public.orders (subtotal_cents, total_cents, idempotency_key)
     values (900, 800, 'test-bad-total') $$,
  '23514', null, 'total must equal subtotal - discount - reward'
);
select throws_ok(
  $$ insert into public.orders (subtotal_cents, discount_cents, total_cents, idempotency_key)
     values (300, 500, -200, 'test-negative-total') $$,
  '23514', null, 'a discount cannot push the total below zero'
);
select throws_ok(
  $$ insert into public.orders (status, subtotal_cents, total_cents, idempotency_key)
     values ('paid', 300, 300, 'test-paid-no-time') $$,
  '23514', null, 'a paid order must have paid_at'
);
select throws_ok(
  $$ insert into public.orders (subtotal_cents, total_cents, points_awarded, idempotency_key)
     values (300, 300, 30, 'test-points-no-customer') $$,
  '23514', null, 'an order without a customer cannot carry points'
);
select throws_ok(
  $$ insert into public.orders (customer_id, subtotal_cents, total_cents, idempotency_key)
     values (tests.id('alice'), 300, 300, 'test-pending-1') $$,
  '23505', null, 'an order key can be used once'
);
select throws_ok(
  $$ insert into public.orders (subtotal_cents, total_cents, tax_cents, idempotency_key)
     values (300, 300, -1, 'test-negative-tax') $$,
  '23514', null, 'tax cannot be negative'
);
select throws_ok(
  $$ insert into public.order_items (order_id, product_name, flavor, bar_count,
                                     unit_price_cents, quantity, line_total_cents)
     values (tests.id('alice_paid'), 'Test Bar', 'Test Vanilla', 1, 300, 2, 500) $$,
  '23514', null, 'a line total must equal unit price x quantity'
);
select throws_ok(
  $$ update public.order_items set refunded_quantity = quantity + 1
     where order_id = tests.id('alice_paid') $$,
  '23514', null, 'cannot refund more items than were sold'
);
select throws_ok(
  $$ insert into public.refunds (order_id, amount_cents, reason, idempotency_key)
     values (tests.id('alice_paid'), 300, 'damaged', 'test-refund-1') $$,
  '23505', null, 'a refund key can be used once'
);
select throws_ok(
  $$ insert into public.refunds (order_id, amount_cents, reason, idempotency_key)
     values (tests.id('alice_paid'), 0, 'damaged', 'test-refund-zero') $$,
  '23514', null, 'a refund must be for a positive amount'
);
select throws_ok(
  $$ delete from public.orders where id = tests.id('alice_paid') $$,
  '23503', null, 'an order with items cannot be deleted'
);

-- No card data columns exist at all.
select is_empty(
  $$ select column_name::text from information_schema.columns
     where table_schema = 'public'
       and column_name ~* '(card|^pan$|cvc|cvv|track_data|magstripe|payment_intent)' $$,
  'no column exists that could hold card or payment-provider data'
);

-- Customers read their own completed orders only -----------------------------
select tests.authenticate_as('alice');
select results_eq(
  $$ select id from public.orders $$,
  $$ select tests.id('alice_paid') $$,
  'a customer sees their own paid order, not pending ones and not other people''s'
);
select results_eq(
  $$ select quantity from public.order_items $$,
  array[3],
  'a customer sees the items of their own order only'
);
select is_empty(
  $$ select 1 from public.refunds $$,
  'customers cannot read refund records'
);
select throws_ok(
  $$ insert into public.orders (customer_id, subtotal_cents, total_cents, idempotency_key)
     values (tests.id('alice'), 0, 0, 'test-self-order') $$,
  '42501', null, 'customers cannot create orders'
);
select throws_ok(
  $$ update public.orders set status = 'refunded' $$,
  '42501', null, 'customers cannot change orders'
);
select tests.clear_authentication();

-- Dashboard staff read everything, write nothing ------------------------------
select tests.authenticate_as('cashier');
select is((select count(*) from public.orders), 3::bigint, 'staff see all orders');
select is((select count(*) from public.order_items), 2::bigint, 'staff see all order items');
select is((select count(*) from public.refunds), 1::bigint, 'staff see refunds');
select throws_ok(
  $$ insert into public.orders (subtotal_cents, total_cents, idempotency_key)
     values (0, 0, 'test-staff-order') $$,
  '42501', null, 'staff cannot insert orders'
);
select throws_ok(
  $$ update public.orders set total_cents = 0, subtotal_cents = 0 $$,
  '42501', null, 'staff cannot edit orders'
);
select throws_ok(
  $$ insert into public.refunds (order_id, amount_cents, reason, idempotency_key)
     values (tests.id('alice_paid'), 100, 'other', 'test-staff-refund') $$,
  '42501', null, 'staff cannot insert refunds'
);
select tests.clear_authentication();

select tests.authenticate_as('owner');
select throws_ok(
  $$ update public.orders set total_cents = 0, subtotal_cents = 0 $$,
  '42501', null, 'not even an owner can edit orders from a client'
);
select tests.clear_authentication();

-- The server can write ---------------------------------------------------------
select tests.authenticate_as_service_role();
select lives_ok(
  $$ insert into public.orders (customer_id, subtotal_cents, total_cents, idempotency_key)
     values (tests.id('bob'), 300, 300, 'test-service-order') $$,
  'the service role can create orders'
);
select lives_ok(
  $$ update public.orders set status = 'cancelled' where idempotency_key = 'test-service-order' $$,
  'the service role can update orders'
);
select tests.clear_authentication();

select * from finish();
rollback;
