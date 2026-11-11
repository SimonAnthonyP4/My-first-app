-- Orders, payments and refunds: money constraints and read isolation.
-- Nothing here is writable by clients; the server (service role) writes it.
begin;
set local search_path = public, extensions;

select plan(31);

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

insert into public.orders (id, customer_id, employee_id, subtotal_cents, total_cents, idempotency_key)
values ('00000000-0000-4000-b000-000000000001', tests.id('alice'), tests.id('cashier'), 300, 300, 'test-pending-1');

insert into public.payments (
  id, order_id, provider_payment_intent, provider_charge_id, amount_cents,
  status, card_brand, card_last4, reader_type, succeeded_at
)
values (
  '00000000-0000-4000-c000-000000000001', tests.id('alice_paid'), 'pi_test_alice_1', 'ch_test_alice_1', 900,
  'succeeded', 'visa', '4242', 'simulated', now()
);

insert into public.refunds (
  id, order_id, payment_id, amount_cents, reason, status, provider_refund_id,
  idempotency_key, requested_by, completed_at
)
values (
  '00000000-0000-4000-d000-000000000001', tests.id('alice_paid'), '00000000-0000-4000-c000-000000000001',
  300, 'damaged', 'succeeded', 're_test_alice_1', 'test-refund-1', tests.id('cashier'), now()
);

-- Money constraints ----------------------------------------------------------
select throws_ok(
  $$ insert into public.orders (employee_id, subtotal_cents, total_cents, idempotency_key)
     values (tests.id('cashier'), 900, 800, 'test-bad-total') $$,
  '23514', null, 'total must equal subtotal - discount - reward'
);
select throws_ok(
  $$ insert into public.orders (employee_id, subtotal_cents, discount_cents, total_cents, idempotency_key)
     values (tests.id('cashier'), 300, 500, -200, 'test-negative-total') $$,
  '23514', null, 'a discount cannot push the total below zero'
);
select throws_ok(
  $$ insert into public.orders (employee_id, status, subtotal_cents, total_cents, idempotency_key)
     values (tests.id('cashier'), 'paid', 300, 300, 'test-paid-no-time') $$,
  '23514', null, 'a paid order must have paid_at'
);
select throws_ok(
  $$ insert into public.orders (employee_id, subtotal_cents, total_cents, points_awarded, idempotency_key)
     values (tests.id('cashier'), 300, 300, 30, 'test-points-no-customer') $$,
  '23514', null, 'an order without a customer cannot carry points'
);
select throws_ok(
  $$ insert into public.orders (customer_id, employee_id, subtotal_cents, total_cents, idempotency_key)
     values (tests.id('alice'), tests.id('cashier'), 300, 300, 'test-pending-1') $$,
  '23505', null, 'a checkout idempotency key can be used once'
);
select throws_ok(
  $$ insert into public.order_items (order_id, product_id, product_name, flavor, bar_count,
                                     unit_price_cents, quantity, line_total_cents)
     values (tests.id('alice_paid'), '00000000-0000-4000-a000-000000000001', 'Test Bar', 'Test Vanilla', 1,
             300, 2, 500) $$,
  '23514', null, 'a line total must equal unit price x quantity'
);
select throws_ok(
  $$ update public.order_items set refunded_quantity = quantity + 1
     where order_id = tests.id('alice_paid') $$,
  '23514', null, 'cannot refund more items than were sold'
);
select throws_ok(
  $$ insert into public.payments (order_id, provider_payment_intent, amount_cents, status, succeeded_at)
     values (tests.id('alice_paid'), 'pi_test_alice_2', 900, 'succeeded', now()) $$,
  '23505', null, 'an order cannot have two successful payments'
);
select throws_ok(
  $$ insert into public.payments (order_id, provider_payment_intent, amount_cents, status, succeeded_at)
     values (tests.id('bob_paid'), 'pi_test_alice_1', 300, 'succeeded', now()) $$,
  '23505', null, 'a payment intent is recorded once'
);
select throws_ok(
  $$ insert into public.payments (order_id, provider_payment_intent, amount_cents, status)
     values (tests.id('bob_paid'), 'pi_test_bob_zero', 0, 'processing') $$,
  '23514', null, 'a payment must be for a positive amount'
);
select throws_ok(
  $$ insert into public.payments (order_id, provider_payment_intent, amount_cents, status, card_last4)
     values (tests.id('bob_paid'), 'pi_test_bob_pan', 300, 'processing', '4242424242424242') $$,
  '23514', null, 'card_last4 holds four digits and cannot hold a full card number'
);
select throws_ok(
  $$ insert into public.refunds (order_id, payment_id, amount_cents, reason, idempotency_key, requested_by)
     values (tests.id('alice_paid'), '00000000-0000-4000-c000-000000000001', 300, 'damaged',
             'test-refund-1', tests.id('cashier')) $$,
  '23505', null, 'a refund idempotency key can be used once'
);
select throws_ok(
  $$ delete from public.orders where id = tests.id('alice_paid') $$,
  '23503', null, 'an order with items cannot be deleted'
);

-- No card data columns exist at all.
select is_empty(
  $$ select column_name::text from information_schema.columns
     where table_schema = 'public'
       and column_name ~* '(card_number|card_exp|^pan$|cvc|cvv|track_data|magstripe)' $$,
  'no column exists that could hold raw card data'
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
  $$ select 1 from public.payments $$,
  'customers cannot read payment records'
);
select is_empty(
  $$ select 1 from public.refunds $$,
  'customers cannot read refund records'
);
select throws_ok(
  $$ insert into public.orders (customer_id, employee_id, subtotal_cents, total_cents, idempotency_key)
     values (tests.id('alice'), tests.id('cashier'), 0, 0, 'test-self-order') $$,
  '42501', null, 'customers cannot create orders'
);
select throws_ok(
  $$ update public.orders set status = 'refunded' $$,
  '42501', null, 'customers cannot change orders'
);
select tests.clear_authentication();

-- Staff read everything, write nothing ---------------------------------------
select tests.authenticate_as('cashier');
select is((select count(*) from public.orders), 3::bigint, 'staff see all orders');
select is((select count(*) from public.order_items), 2::bigint, 'staff see all order items');
select is((select count(*) from public.payments), 1::bigint, 'staff see payments');
select is((select count(*) from public.refunds), 1::bigint, 'staff see refunds');
select throws_ok(
  $$ insert into public.orders (employee_id, subtotal_cents, total_cents, idempotency_key)
     values (tests.id('cashier'), 0, 0, 'test-staff-order') $$,
  '42501', null, 'staff cannot insert orders directly; checkout goes through the server'
);
select throws_ok(
  $$ update public.orders set total_cents = 0, subtotal_cents = 0 $$,
  '42501', null, 'staff cannot edit orders directly'
);
select throws_ok(
  $$ update public.payments set status = 'succeeded' $$,
  '42501', null, 'staff cannot mark payments as succeeded'
);
select throws_ok(
  $$ insert into public.refunds (order_id, payment_id, amount_cents, reason, idempotency_key, requested_by)
     values (tests.id('alice_paid'), '00000000-0000-4000-c000-000000000001', 100, 'other',
             'test-staff-refund', tests.id('cashier')) $$,
  '42501', null, 'staff cannot insert refunds directly'
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
  $$ insert into public.orders (customer_id, employee_id, subtotal_cents, total_cents, idempotency_key)
     values (tests.id('bob'), tests.id('cashier'), 300, 300, 'test-service-order') $$,
  'the service role can create orders'
);
select lives_ok(
  $$ update public.orders set status = 'cancelled' where idempotency_key = 'test-service-order' $$,
  'the service role can update orders'
);
select tests.clear_authentication();

select * from finish();
rollback;
