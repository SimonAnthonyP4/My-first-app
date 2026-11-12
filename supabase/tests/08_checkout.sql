-- Checkout and payment confirmation: the server prices the cart, reserves
-- rewards, and an order becomes paid only through a payment event.
begin;
set local search_path = public, extensions;

select plan(113);

-- Fixtures ----------------------------------------------------------------------
select tests.create_employee('owner', 'owner');
select tests.create_employee('manager', 'manager');
select tests.create_employee('cashier', 'employee');
select tests.create_employee('other_cashier', 'employee');
select tests.create_employee('inactive', 'employee');
update public.employees set is_active = false where id = tests.id('inactive');

select tests.create_customer(name) from unnest(array['cora', 'nick', 'gone']) as t(name);
update public.customers set deleted_at = now(), email = null where id = tests.id('gone');
select tests.grant_points('cora', 1000);

select tests.create_product('bar_a', 'bar', 300);
select tests.create_product('bar_b', 'bar', 300);
select tests.create_product('three', 'three_pack', 850, 3);
select tests.create_product('six', 'six_pack', 1600, 6);
select tests.create_product('sticker', 'other', 30, 0);
select tests.create_product('retired', 'bar', 300, 1, false);

select tests.authenticate_as_service_role();

-- ===============================================================================
-- Creating an order
-- ===============================================================================

select results_eq(
  $$ select status::text, subtotal_cents, discount_cents, reward_cents, total_cents, points_awarded
     from tests.checkout('o_basic', 'cashier', 'nick', tests.items('bar_a', '3')) $$,
  $$ values ('pending', 900::bigint, 0::bigint, 0::bigint, 900::bigint, 0::bigint) $$,
  'three $3.00 bars make a pending order for $9.00'
);
select results_eq(
  $$ select product_name, unit_price_cents, quantity, line_total_cents, bar_count
     from public.order_items where order_id = tests.id('o_basic') $$,
  $$ values ('Bar A', 300::bigint, 3, 900::bigint, 1) $$,
  'the line item snapshots the catalog name and price'
);
select is(tests.stock('bar_a'), 0, 'creating an order does not move stock');
select is(tests.balance('nick'), 0::bigint, 'creating an order awards nothing');

select tests.checkout('o_merged', 'cashier', null, tests.items('bar_a', '1', 'bar_b', '2', 'bar_a', '2'));
select results_eq(
  $$ select quantity from public.order_items where order_id = tests.id('o_merged') order by quantity $$,
  array[2, 3],
  'repeated products in the cart are merged into one line each'
);

-- The price always comes from the catalog at the moment of sale.
update public.products set price_cents = 325 where id = tests.id('bar_b');
select is(
  (select total_cents from tests.checkout('o_new_price', 'cashier', null, tests.items('bar_b', '2'))),
  650::bigint,
  'a new order uses the current catalog price'
);
select is(
  (select total_cents from public.orders where id = tests.id('o_merged')), 1500::bigint,
  'an existing order keeps the price it was created with'
);
update public.products set price_cents = 300 where id = tests.id('bar_b');

-- Idempotency.
select is(
  (select id from tests.checkout('o_basic', 'cashier', 'nick', tests.items('six', '9'))),
  tests.id('o_basic'),
  'retrying with the same idempotency key returns the same order'
);
select is(
  (select total_cents from public.orders where id = tests.id('o_basic')), 900::bigint,
  'and does not change it, even if the retry carried a different cart'
);
select is(
  (select count(*) from public.orders where idempotency_key = 'test-checkout-o_basic'), 1::bigint,
  'only one order exists for the key'
);
select throws_ok(
  $$ select tests.checkout('o_basic', 'other_cashier', 'nick', tests.items('bar_a', '3')) $$,
  'BB003', null,
  'another employee cannot reuse the key'
);

-- Input validation.
select throws_ok(
  $$ select public.create_order(tests.id('cashier'), 'test-empty-cart', '[]'::jsonb) $$,
  '22023', null, 'an empty cart is refused'
);
select throws_ok(
  $$ select public.create_order(tests.id('cashier'), 'test-zero-qty', tests.items('bar_a', '0')) $$,
  '22023', null, 'a quantity of zero is refused'
);
select throws_ok(
  $$ select public.create_order(tests.id('cashier'), 'test-negative-qty', tests.items('bar_a', '-2')) $$,
  '22023', null, 'a negative quantity is refused'
);
select throws_ok(
  $$ select public.create_order(tests.id('cashier'), 'test-huge-qty', tests.items('bar_a', '1000')) $$,
  '22023', null, 'an absurd quantity is refused'
);
select throws_ok(
  $$ select public.create_order(tests.id('cashier'), 'test-malformed',
       '[{"product_id": "not-a-uuid", "quantity": 1}]'::jsonb) $$,
  '22023', null, 'a malformed cart is refused'
);
select throws_ok(
  $$ select public.create_order(tests.id('cashier'), 'test-price-inject',
       jsonb_build_array(jsonb_build_object('product_id', tests.id('bar_a'), 'quantity', 1.5))) $$,
  '22023', null, 'a fractional quantity is refused'
);
select throws_ok(
  $$ select public.create_order(tests.id('cashier'), 'test-unknown-product',
       jsonb_build_array(jsonb_build_object('product_id', gen_random_uuid(), 'quantity', 1))) $$,
  'BB004', null, 'an unknown product is refused'
);
select throws_ok(
  $$ select public.create_order(tests.id('cashier'), 'test-retired-product', tests.items('retired', '1')) $$,
  'BB004', null, 'a retired product cannot be sold'
);
select throws_ok(
  $$ select public.create_order(tests.id('inactive'), 'test-inactive-employee', tests.items('bar_a', '1')) $$,
  '42501', null, 'a deactivated employee cannot create orders'
);
select throws_ok(
  $$ select public.create_order(tests.id('nick'), 'test-customer-as-staff', tests.items('bar_a', '1')) $$,
  '42501', null, 'a customer id is not accepted as the employee'
);
select throws_ok(
  $$ select public.create_order(tests.id('cashier'), 'short', tests.items('bar_a', '1')) $$,
  '22023', null, 'an idempotency key is required'
);
select throws_ok(
  $$ select public.create_order(tests.id('cashier'), 'test-closed-customer', tests.items('bar_a', '1'),
       tests.id('gone')) $$,
  'BB006', null, 'a closed customer account cannot be attached'
);
select throws_ok(
  $$ select public.create_order(tests.id('cashier'), 'test-below-minimum', tests.items('sticker', '1')) $$,
  'BB007', null, 'a 30-cent order is below the minimum card charge'
);
select lives_ok(
  $$ select public.create_order(tests.id('cashier'), 'test-at-minimum', tests.items('sticker', '2')) $$,
  'a 60-cent order is allowed'
);

-- ===============================================================================
-- Rewards at checkout
-- ===============================================================================

select results_eq(
  $$ select subtotal_cents, reward_cents, total_cents, points_reserved
     from tests.checkout('o_reward', 'cashier', 'cora', tests.items('bar_a', '2'),
                         tests.rewards('Free protein bar', 'bar_a')) $$,
  $$ values (600::bigint, 300::bigint, 300::bigint, 300::bigint) $$,
  'two bars with a free-bar reward: one is free, $3.00 is due, 300 points are reserved'
);
select is(tests.balance('cora'), 700::bigint, 'the reward cost is debited when the order is created');
select results_eq(
  $$ select status::text, points_cost, order_id from public.redemptions
     where customer_id = tests.id('cora') $$,
  $$ select 'reserved', 300::bigint, tests.id('o_reward') $$,
  'the redemption is reserved for this order'
);
select is(
  (select reward_quantity from public.order_items where order_id = tests.id('o_reward')), 1,
  'the line records that one unit is free'
);
select is(
  (select id from tests.checkout('o_reward', 'cashier', 'cora', tests.items('bar_a', '2'),
                                 tests.rewards('Free protein bar', 'bar_a'))),
  tests.id('o_reward'),
  'retrying the reward checkout returns the same order'
);
select is(tests.balance('cora'), 700::bigint, 'and does not debit the reward again');

select throws_ok(
  $$ select tests.checkout('o_bad_1', 'cashier', 'cora', tests.items('bar_a', '1'),
                           tests.rewards('Free three-pack', 'bar_a')) $$,
  'BB009', null, 'a three-pack reward cannot pay for a single bar'
);
select throws_ok(
  $$ select tests.checkout('o_bad_2', 'cashier', 'cora', tests.items('bar_a', '1'),
                           tests.rewards('Free protein bar', 'bar_b')) $$,
  'BB009', null, 'a reward cannot pay for a product that is not in the cart'
);
select throws_ok(
  $$ select tests.checkout('o_bad_3', 'cashier', 'cora', tests.items('bar_a', '1'),
                           tests.rewards('Free protein bar', 'bar_a', 'Free protein bar', 'bar_a')) $$,
  'BB009', null, 'two free-bar rewards cannot both pay for the same single bar'
);
select throws_ok(
  $$ select tests.checkout('o_bad_4', 'cashier', null, tests.items('bar_a', '1'),
                           tests.rewards('Free protein bar', 'bar_a')) $$,
  '22023', null, 'a reward needs a customer on the order'
);
select throws_ok(
  $$ select tests.checkout('o_bad_5', 'cashier', 'nick', tests.items('bar_a', '2'),
                           tests.rewards('Free protein bar', 'bar_a')) $$,
  'BB001', null, 'a customer without enough points cannot use a reward'
);
select is(
  (select count(*) from public.orders where idempotency_key like 'test-checkout-o_bad_%'), 0::bigint,
  'none of the refused checkouts left an order behind'
);
select is(tests.balance('cora'), 700::bigint, 'and none of them touched the balance');

-- An order fully covered by a reward needs no payment.
select results_eq(
  $$ select status::text, total_cents, paid_at is not null
     from tests.checkout('o_free', 'cashier', 'cora', tests.items('bar_b', '1'),
                         tests.rewards('Free protein bar', 'bar_b')) $$,
  $$ values ('paid', 0::bigint, true) $$,
  'an order fully covered by a reward is paid at once, with no card payment'
);
select is(
  (select status::text from public.redemptions where order_id = tests.id('o_free')), 'fulfilled',
  'its reward is fulfilled'
);
select is(tests.stock('bar_b'), -1, 'its stock is taken');
select is(tests.balance('cora'), 400::bigint, '1,000 - 300 - 300 = 400, and a free order earns nothing');
select is(
  (select count(*) from public.payments where order_id = tests.id('o_free')), 0::bigint,
  'no payment row exists for it'
);

-- ===============================================================================
-- Discounts
-- ===============================================================================

select throws_ok(
  $$ select tests.checkout('o_disc_1', 'cashier', null, tests.items('bar_a', '3'), '[]', 50, 'regular') $$,
  'BB008', null, 'by default a cashier cannot give a discount'
);
select results_eq(
  $$ select discount_cents, total_cents, discount_by
     from tests.checkout('o_disc_1b', 'cashier', null, tests.items('bar_a', '3'), '[]', 50, 'regular', 'manager') $$,
  $$ select 50::bigint, 850::bigint, tests.id('manager') $$,
  'with a manager approving, the cashier discount is accepted and recorded against the manager'
);
select throws_ok(
  $$ select tests.checkout('o_disc_1c', 'cashier', null, tests.items('bar_a', '3'), '[]', 50, 'regular', 'other_cashier') $$,
  'BB008', null, 'another cashier cannot approve a discount'
);
select throws_ok(
  $$ select tests.checkout('o_disc_1d', 'cashier', null, tests.items('bar_a', '3'), '[]', 50, 'regular', 'inactive') $$,
  'BB008', null, 'a deactivated employee cannot approve a discount'
);
select results_eq(
  $$ select discount_cents, total_cents, discount_reason, discount_by
     from tests.checkout('o_disc_2', 'manager', null, tests.items('bar_a', '3'), '[]', 100, ' staff meal ') $$,
  $$ select 100::bigint, 800::bigint, 'staff meal', tests.id('manager') $$,
  'a manager can discount; the reason and who gave it are recorded'
);
select throws_ok(
  $$ select tests.checkout('o_disc_3', 'manager', null, tests.items('bar_a', '3'), '[]', 100, '  ') $$,
  '22023', null, 'a discount needs a reason'
);
select throws_ok(
  $$ select tests.checkout('o_disc_4', 'manager', null, tests.items('bar_a', '3'), '[]', 901, 'too much') $$,
  '22023', null, 'a discount cannot exceed the amount due'
);
select throws_ok(
  $$ select tests.checkout('o_disc_5', 'manager', null, tests.items('bar_a', '3'), '[]', -1, 'negative') $$,
  '22023', null, 'a discount cannot be negative'
);
select throws_ok(
  $$ select tests.checkout('o_disc_6', 'manager', null, tests.items('bar_a', '3'), '[]', 880, 'nearly free') $$,
  'BB007', null, 'a discount cannot leave an amount below the minimum card charge'
);
update public.app_settings set employee_discount_limit_percent = 10;
select lives_ok(
  $$ select tests.checkout('o_disc_7', 'cashier', null, tests.items('bar_a', '3'), '[]', 90, 'loyal regular') $$,
  'with a 10 percent limit, a cashier can take $0.90 off $9.00'
);
select throws_ok(
  $$ select tests.checkout('o_disc_8', 'cashier', null, tests.items('bar_a', '3'), '[]', 91, 'one cent more') $$,
  'BB008', null, 'one cent over the limit needs a manager'
);
update public.app_settings set employee_discount_limit_percent = 0;

-- ===============================================================================
-- Recording the PaymentIntent
-- ===============================================================================

select results_eq(
  $$ select status, amount_cents from public.record_payment_intent(tests.id('o_basic'), 'pi_test_o_basic', 900) $$,
  $$ values ('requires_payment_method', 900::bigint) $$,
  'the PaymentIntent is recorded against the order'
);
select lives_ok(
  $$ select public.record_payment_intent(tests.id('o_basic'), 'pi_test_o_basic', 900) $$,
  'recording it again changes nothing'
);
select is(
  (select count(*) from public.payments where order_id = tests.id('o_basic')), 1::bigint,
  'one payment row exists'
);
select throws_ok(
  $$ select public.record_payment_intent(tests.id('o_merged'), 'pi_test_o_merged', 1) $$,
  'BB002', null, 'the PaymentIntent amount must equal the order total'
);
select throws_ok(
  $$ select public.record_payment_intent(tests.id('o_merged'), 'pi_test_o_basic', 1500) $$,
  'BB003', null, 'a PaymentIntent cannot be attached to two orders'
);
select throws_ok(
  $$ select public.record_payment_intent(tests.id('o_free'), 'pi_test_o_free', 0) $$,
  'BB002', null, 'an order that is already paid takes no PaymentIntent'
);

-- ===============================================================================
-- Payment confirmation (webhook)
-- ===============================================================================

-- A failed card attempt does not end the checkout.
select is(
  public.handle_payment_intent_update(
    'evt_test_basic_failed', 'payment_intent.payment_failed', '{}'::jsonb,
    'pi_test_o_basic', 'requires_payment_method'),
  'processed', 'a declined card is recorded'
);
select is(
  (select status::text from public.orders where id = tests.id('o_basic')), 'pending',
  'the order is still open for another attempt'
);

-- The wrong amount is never accepted.
select is(
  public.handle_payment_succeeded(
    'evt_test_basic_wrong', 'payment_intent.succeeded', '{}'::jsonb, 'pi_test_o_basic', 100),
  'failed:amount_mismatch', 'a success event for the wrong amount is rejected'
);
select is(
  (select status::text from public.orders where id = tests.id('o_basic')), 'pending',
  'the order is not marked paid'
);
select results_eq(
  $$ select status, error is not null from public.stripe_events where id = 'evt_test_basic_wrong' $$,
  $$ values ('failed', true) $$,
  'the rejected event is kept with the reason'
);

-- The real confirmation.
select is(
  public.handle_payment_succeeded(
    'evt_test_basic_paid', 'payment_intent.succeeded', '{"id": "evt_test_basic_paid"}'::jsonb,
    'pi_test_o_basic', 900, 'ch_test_o_basic', 'visa', '4242', 'tap_to_pay'),
  'processed', 'the payment confirmation is processed'
);
select results_eq(
  $$ select status::text, paid_at is not null, points_awarded from public.orders where id = tests.id('o_basic') $$,
  $$ values ('paid', true, 90::bigint) $$,
  'the order is paid and records 90 points'
);
select results_eq(
  $$ select status, provider_charge_id, card_brand, card_last4, reader_type, succeeded_at is not null
     from public.payments where order_id = tests.id('o_basic') $$,
  $$ values ('succeeded', 'ch_test_o_basic', 'visa', '4242', 'tap_to_pay', true) $$,
  'the payment is marked succeeded with display details only'
);
select is(tests.balance('nick'), 90::bigint, 'the customer has their 90 points');
select is(tests.stock('bar_a'), -3, 'three bars left stock');
select results_eq(
  $$ select reason, delta, order_id, employee_id from public.inventory_movements
     where order_id = tests.id('o_basic') $$,
  $$ select 'sale', -3, tests.id('o_basic'), tests.id('cashier') $$,
  'the stock movement names the order and the cashier'
);
select is(
  (select status from public.stripe_events where id = 'evt_test_basic_paid'), 'processed',
  'the event is logged as processed'
);

-- Replays.
select is(
  public.handle_payment_succeeded(
    'evt_test_basic_paid', 'payment_intent.succeeded', '{}'::jsonb, 'pi_test_o_basic', 900),
  'duplicate', 'the same event delivered again is recognised as a duplicate'
);
select is(
  public.handle_payment_succeeded(
    'evt_test_basic_paid_again', 'payment_intent.succeeded', '{}'::jsonb, 'pi_test_o_basic', 900),
  'processed', 'a second, different event for the same payment is accepted'
);
select is(tests.balance('nick'), 90::bigint, 'but the points are awarded once');
select is(tests.stock('bar_a'), -3, 'and stock moves once');
select is(
  (select count(*) from public.inventory_movements where order_id = tests.id('o_basic')), 1::bigint,
  'there is one stock movement for the order'
);

-- Events about payments that are not ours, or that arrive late.
select is(
  public.handle_payment_succeeded(
    'evt_test_foreign', 'payment_intent.succeeded', '{}'::jsonb, 'pi_test_someone_else', 500),
  'ignored', 'a payment intent we never created is ignored'
);
select is(
  public.handle_payment_intent_update(
    'evt_test_basic_late_fail', 'payment_intent.payment_failed', '{}'::jsonb,
    'pi_test_o_basic', 'requires_payment_method'),
  'ignored', 'a late "failed" event cannot undo a successful payment'
);
select is(
  (select status from public.payments where order_id = tests.id('o_basic')), 'succeeded',
  'the payment is still succeeded'
);

-- Paying an order with a reward fulfils the reward.
select is(tests.pay('o_reward'), 'processed', 'the reward order is paid');
select is(
  (select status::text from public.redemptions where order_id = tests.id('o_reward')), 'fulfilled',
  'its reward is fulfilled'
);
select is(
  tests.balance('cora'), 430::bigint,
  'the customer earns 30 points on the $3.00 actually paid (400 + 30)'
);
select is(tests.stock('bar_a'), -5, 'both bars left stock, the free one included');

-- ===============================================================================
-- Cancelled and abandoned checkouts
-- ===============================================================================

select tests.checkout('o_cancel', 'cashier', 'cora', tests.items('bar_a', '2'),
                      tests.rewards('Free protein bar', 'bar_a'));
select public.record_payment_intent(tests.id('o_cancel'), 'pi_test_o_cancel', 300);
select is(tests.balance('cora'), 130::bigint, 'a reward is reserved for the new order (430 - 300)');

select is(
  public.handle_payment_intent_update(
    'evt_test_cancel', 'payment_intent.canceled', '{}'::jsonb, 'pi_test_o_cancel', 'canceled'),
  'processed', 'the cancellation event is processed'
);
select results_eq(
  $$ select status::text, cancelled_at is not null from public.orders where id = tests.id('o_cancel') $$,
  $$ values ('cancelled', true) $$,
  'the order is cancelled'
);
select is(
  (select status::text from public.redemptions where order_id = tests.id('o_cancel')), 'released',
  'its reward reservation is released'
);
select is(tests.balance('cora'), 430::bigint, 'and the 300 points are back');
select is(tests.stock('bar_a'), -5, 'no stock moved for the cancelled order');

-- Money arriving for a cancelled order is flagged, not silently accepted.
select is(
  public.handle_payment_succeeded(
    'evt_test_cancel_paid', 'payment_intent.succeeded', '{}'::jsonb, 'pi_test_o_cancel', 300),
  'failed:order_not_pending', 'a payment for a cancelled order is flagged for refund'
);
select is(
  (select status::text from public.orders where id = tests.id('o_cancel')), 'cancelled',
  'the order stays cancelled'
);
select matches(
  (select error from public.stripe_events where id = 'evt_test_cancel_paid'), 'refund',
  'the event log says the charge must be refunded'
);
select is(tests.balance('cora'), 430::bigint, 'no points are awarded for it');

-- The cashier abandons a checkout.
select tests.checkout('o_abandon_2', 'cashier', 'cora', tests.items('bar_a', '3'),
                      tests.rewards('Free protein bar', 'bar_a'));
select is(tests.balance('cora'), 130::bigint, 'another reward is reserved (430 - 300)');
select results_eq(
  $$ select status::text from public.cancel_order(tests.id('o_abandon_2'), tests.id('cashier')) $$,
  array['cancelled'],
  'a cashier can abandon an unpaid order'
);
select is(tests.balance('cora'), 430::bigint, 'the reserved points are returned');
select lives_ok(
  $$ select public.cancel_order(tests.id('o_abandon_2'), tests.id('cashier')) $$,
  'cancelling again changes nothing'
);
select throws_ok(
  $$ select public.cancel_order(tests.id('o_basic'), tests.id('cashier')) $$,
  'BB002', null, 'a paid order cannot be cancelled; it must be refunded'
);
select throws_ok(
  $$ select public.cancel_order(tests.id('o_merged'), tests.id('inactive')) $$,
  '42501', null, 'a deactivated employee cannot cancel orders'
);
select throws_ok(
  $$ select public.record_payment_intent(tests.id('o_abandon_2'), 'pi_test_o_abandon_2', 600) $$,
  'BB002', null, 'a cancelled order takes no PaymentIntent'
);

-- A second PaymentIntent paying an already-paid order is flagged.
select tests.checkout('o_double', 'cashier', null, tests.items('six', '1'));
select public.record_payment_intent(tests.id('o_double'), 'pi_test_o_double_1', 1600);
insert into public.payments (order_id, provider_payment_intent, amount_cents, status)
values (tests.id('o_double'), 'pi_test_o_double_2', 1600, 'requires_payment_method');
select is(
  public.handle_payment_succeeded(
    'evt_test_double_1', 'payment_intent.succeeded', '{}'::jsonb, 'pi_test_o_double_1', 1600),
  'processed', 'the first payment for an order is accepted'
);
select is(
  public.handle_payment_succeeded(
    'evt_test_double_2', 'payment_intent.succeeded', '{}'::jsonb, 'pi_test_o_double_2', 1600),
  'failed:duplicate_payment', 'a second payment for the same order is flagged for refund'
);
select is(tests.stock('six'), -1, 'stock moved once for the double-paid order');

select tests.clear_authentication();

-- ===============================================================================
-- Invariants and privileges
-- ===============================================================================

select is_empty(
  $$ select o.id from public.orders o
     where o.status in ('paid', 'partially_refunded', 'refunded')
       and o.total_cents > 0
       and not exists (select 1 from public.payments p where p.order_id = o.id and p.status = 'succeeded') $$,
  'every paid order that cost money has a succeeded payment'
);
select is_empty(
  $$ select o.id from public.orders o
     join public.order_items i on i.order_id = o.id
     group by o.id, o.subtotal_cents
     having sum(i.line_total_cents) <> o.subtotal_cents $$,
  'every order subtotal equals the sum of its lines'
);
select is_empty(
  $$ select a.customer_id from public.loyalty_accounts a
     left join (select customer_id, sum(points) total from public.loyalty_transactions group by 1) t
       on t.customer_id = a.customer_id
     where a.balance <> coalesce(t.total, 0) or a.balance < 0 $$,
  'every balance still equals its ledger sum'
);
select is_empty(
  $$ select l.product_id from public.inventory_levels l
     left join (select product_id, sum(delta) total from public.inventory_movements group by 1) m
       on m.product_id = l.product_id
     where l.on_hand <> coalesce(m.total, 0) $$,
  'every stock level still equals its movement sum'
);

select tests.authenticate_as('cashier');
select throws_ok(
  $$ select public.create_order(tests.id('cashier'), 'test-direct-call', tests.items('bar_a', '1')) $$,
  '42501', null, 'a cashier cannot call create_order directly; checkout goes through the server'
);
select throws_ok(
  $$ select public.handle_payment_succeeded('evt_test_forged', 'payment_intent.succeeded', '{}'::jsonb,
       'pi_test_o_merged', 1500) $$,
  '42501', null, 'a cashier cannot forge a payment confirmation'
);
select throws_ok(
  $$ select public.record_payment_intent(tests.id('o_merged'), 'pi_test_forged', 1500) $$,
  '42501', null, 'a cashier cannot attach a PaymentIntent'
);
select tests.clear_authentication();

select tests.authenticate_as('cora');
select throws_ok(
  $$ select public.handle_payment_succeeded('evt_test_forged_2', 'payment_intent.succeeded', '{}'::jsonb,
       'pi_test_o_merged', 1500) $$,
  '42501', null, 'a customer cannot forge a payment confirmation'
);
select tests.clear_authentication();

select is_empty(
  $$ select p.proname::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('create_order', 'record_payment_intent', 'handle_payment_succeeded',
                         'handle_payment_intent_update', 'cancel_order', 'request_refund',
                         'record_refund_submitted', 'fail_refund', 'complete_refund', 'handle_refund_update')
       and (has_function_privilege('authenticated', p.oid, 'execute')
            or has_function_privilege('anon', p.oid, 'execute')
            or not has_function_privilege('service_role', p.oid, 'execute')) $$,
  'all ten checkout and refund functions are executable by the service role only'
);

select * from finish();
rollback;
