-- Refunds: the server decides how much money goes back, nothing moves until
-- the payment provider confirms, and confirmation moves money status, stock
-- and points together.
begin;
set local search_path = public, extensions;

select plan(90);

-- Fixtures ----------------------------------------------------------------------
select tests.create_employee('owner', 'owner');
select tests.create_employee('manager', 'manager');
select tests.create_employee('cashier', 'employee');
select tests.create_employee('other_cashier', 'employee');

select tests.create_customer(name) from unnest(array['amy', 'ben', 'dan', 'eve', 'hal']) as t(name);
select tests.grant_points('eve', 300);

select tests.create_product('bar_a', 'bar', 300);
select tests.create_product('six', 'six_pack', 1600, 6);

insert into public.inventory_movements (product_id, delta, reason, note)
values (tests.id('bar_a'), 100, 'restock', 'test opening stock'),
       (tests.id('six'), 20, 'restock', 'test opening stock');

select tests.authenticate_as_service_role();

-- Paid orders, created and paid through the real functions.
select tests.checkout('o_amy', 'cashier', 'amy', tests.items('bar_a', '3'));
select tests.checkout('o_ben', 'cashier', 'ben', tests.items('bar_a', '3'));
select tests.checkout('o_dan', 'manager', 'dan', tests.items('bar_a', '3'), '[]', 100, 'test discount');
select tests.checkout('o_eve', 'cashier', 'eve', tests.items('bar_a', '2'),
                      tests.rewards('Free protein bar', 'bar_a'));
select tests.checkout('o_val', 'cashier', null, tests.items('bar_a', '3'));
select tests.checkout('o_big_1', 'cashier', null, tests.items('six', '2'));
select tests.checkout('o_big_2', 'cashier', null, tests.items('six', '2'));
select tests.checkout('o_big_3', 'cashier', null, tests.items('six', '2'));
select tests.checkout('o_damaged', 'cashier', null, tests.items('six', '1'));
select tests.checkout('o_hal', 'cashier', 'hal', tests.items('bar_a', '3'));
select tests.checkout('o_hal_2', 'cashier', 'hal', tests.items('bar_a', '3'));
select tests.checkout('o_hal_3', 'cashier', 'hal', tests.items('bar_a', '3'));
select tests.checkout('o_unpaid', 'cashier', null, tests.items('bar_a', '3'));

select tests.pay(name) from unnest(array[
  'o_amy', 'o_ben', 'o_dan', 'o_eve', 'o_val', 'o_big_1', 'o_big_2', 'o_big_3', 'o_damaged',
  'o_hal', 'o_hal_2', 'o_hal_3'
]) as t(name);

select is(tests.stock('bar_a'), 100 - 23, 'setup: 23 bars sold');
select is(tests.stock('six'), 20 - 7, 'setup: 7 six-packs sold');

-- ===============================================================================
-- A full refund
-- ===============================================================================

insert into tests.fixtures (name, id)
select 'rf_amy', r.id
from public.request_refund(
  tests.id('o_amy'), tests.id('cashier'), 'test-refund-amy',
  tests.refund_lines(tests.id('o_amy'), 'bar_a', 3), 'customer_request', ' changed mind ') r;

select results_eq(
  $$ select amount_cents, status, reason, note, requested_by, approved_by, provider_refund_id
     from public.refunds where id = tests.id('rf_amy') $$,
  $$ select 900::bigint, 'pending', 'customer_request', 'changed mind', tests.id('cashier'),
            null::uuid, null::text $$,
  'refunding all three bars of a $9.00 order requests $9.00, pending'
);
select results_eq(
  $$ select status::text, points_awarded from public.orders where id = tests.id('o_amy') $$,
  $$ values ('paid', 90::bigint) $$,
  'requesting a refund changes nothing on the order yet'
);
select is(tests.balance('amy'), 90::bigint, 'the points stay until the provider confirms');
select is(tests.stock('bar_a'), 77, 'stock stays until the provider confirms');

select is(
  (select status from public.record_refund_submitted(tests.id('rf_amy'), 're_test_amy')), 'pending',
  'the provider refund id is recorded'
);
select lives_ok(
  $$ select public.record_refund_submitted(tests.id('rf_amy'), 're_test_amy') $$,
  'recording it again changes nothing'
);
select throws_ok(
  $$ select public.record_refund_submitted(tests.id('rf_amy'), 're_test_other') $$,
  'BB003', null, 'a refund cannot be linked to a second provider refund'
);

select results_eq(
  $$ select status, completed_at is not null, points_reversed
     from public.complete_refund(tests.id('rf_amy'), 're_test_amy', 900) $$,
  $$ values ('succeeded', true, 90::bigint) $$,
  'once confirmed the refund succeeds and reverses the 90 points'
);
select is(
  (select status::text from public.orders where id = tests.id('o_amy')), 'refunded',
  'the order is refunded'
);
select is(
  (select refunded_quantity from public.order_items where order_id = tests.id('o_amy')), 3,
  'the line shows three units refunded'
);
select is(tests.stock('bar_a'), 80, 'the three bars are back in stock');
select is(tests.balance('amy'), 0::bigint, 'the customer balance is back to 0');
select lives_ok(
  $$ select public.complete_refund(tests.id('rf_amy'), 're_test_amy', 900) $$,
  'confirming again raises no error'
);
select is(tests.stock('bar_a'), 80, 'and restocks nothing more');
select is(
  (select count(*) from public.loyalty_transactions where refund_id = tests.id('rf_amy')), 1::bigint,
  'and reverses nothing more'
);
select throws_ok(
  $$ select public.request_refund(tests.id('o_amy'), tests.id('cashier'), 'test-refund-amy-2',
       tests.refund_lines(tests.id('o_amy'), 'bar_a', 1), 'customer_request') $$,
  'BB002', null, 'a fully refunded order cannot be refunded again'
);

-- ===============================================================================
-- Partial refunds
-- ===============================================================================

insert into tests.fixtures (name, id)
select 'rf_ben_1', r.id
from public.request_refund(tests.id('o_ben'), tests.id('cashier'), 'test-refund-ben-1',
  tests.refund_lines(tests.id('o_ben'), 'bar_a', 1), 'wrong_item') r;
select is(
  (select amount_cents from public.refunds where id = tests.id('rf_ben_1')), 300::bigint,
  'refunding one of three $3.00 bars requests $3.00'
);
select public.complete_refund(tests.id('rf_ben_1'), 're_test_ben_1', 300);
select is(
  (select status::text from public.orders where id = tests.id('o_ben')), 'partially_refunded',
  'the order is partially refunded'
);
select is(tests.balance('ben'), 60::bigint, '30 of the 90 points are taken back');

insert into tests.fixtures (name, id)
select 'rf_ben_2', r.id
from public.request_refund(tests.id('o_ben'), tests.id('cashier'), 'test-refund-ben-2',
  tests.refund_lines(tests.id('o_ben'), 'bar_a', 2), 'wrong_item') r;
select public.complete_refund(tests.id('rf_ben_2'), 're_test_ben_2', 600);
select is(
  (select status::text from public.orders where id = tests.id('o_ben')), 'refunded',
  'refunding the other two completes the refund'
);
select is(tests.balance('ben'), 0::bigint, 'all 90 points are taken back');

-- With a discount, each item's share of the money paid is refunded.
select is(
  (select total_cents from public.orders where id = tests.id('o_dan')), 800::bigint,
  'setup: three bars with $1.00 off cost $8.00'
);
insert into tests.fixtures (name, id)
select 'rf_dan_1', r.id
from public.request_refund(tests.id('o_dan'), tests.id('manager'), 'test-refund-dan-1',
  tests.refund_lines(tests.id('o_dan'), 'bar_a', 1), 'customer_request') r;
select public.complete_refund(tests.id('rf_dan_1'), 're_test_dan_1', 266);
insert into tests.fixtures (name, id)
select 'rf_dan_2', r.id
from public.request_refund(tests.id('o_dan'), tests.id('manager'), 'test-refund-dan-2',
  tests.refund_lines(tests.id('o_dan'), 'bar_a', 1), 'customer_request') r;
select public.complete_refund(tests.id('rf_dan_2'), 're_test_dan_2', 267);
insert into tests.fixtures (name, id)
select 'rf_dan_3', r.id
from public.request_refund(tests.id('o_dan'), tests.id('manager'), 'test-refund-dan-3',
  tests.refund_lines(tests.id('o_dan'), 'bar_a', 1), 'customer_request') r;
select public.complete_refund(tests.id('rf_dan_3'), 're_test_dan_3', 267);

select results_eq(
  $$ select amount_cents from public.refunds where order_id = tests.id('o_dan') order by created_at, amount_cents $$,
  array[266, 267, 267]::bigint[],
  'three one-bar refunds of an $8.00 order return $2.66, $2.67 and $2.67'
);
select is(
  (select sum(amount_cents) from public.refunds where order_id = tests.id('o_dan')), 800::numeric,
  'together exactly the $8.00 that was paid'
);
select is(
  (select status::text from public.orders where id = tests.id('o_dan')), 'refunded',
  'the discounted order ends up fully refunded'
);
select is(tests.balance('dan'), 0::bigint, 'exactly the 80 earned points are taken back');

-- With a free reward item, the money paid is spread across the items.
select is(tests.balance('eve'), 30::bigint, 'setup: 300 spent on a free bar, 30 earned on the $3.00 paid');
insert into tests.fixtures (name, id)
select 'rf_eve_1', r.id
from public.request_refund(tests.id('o_eve'), tests.id('cashier'), 'test-refund-eve-1',
  tests.refund_lines(tests.id('o_eve'), 'bar_a', 1), 'customer_request') r;
select is(
  (select amount_cents from public.refunds where id = tests.id('rf_eve_1')), 150::bigint,
  'returning one of two bars (one was free) refunds half of the $3.00 paid'
);
select public.complete_refund(tests.id('rf_eve_1'), 're_test_eve_1', 150);
insert into tests.fixtures (name, id)
select 'rf_eve_2', r.id
from public.request_refund(tests.id('o_eve'), tests.id('cashier'), 'test-refund-eve-2',
  tests.refund_lines(tests.id('o_eve'), 'bar_a', 1), 'customer_request') r;
select public.complete_refund(tests.id('rf_eve_2'), 're_test_eve_2', 150);
select is(
  (select status::text from public.orders where id = tests.id('o_eve')), 'refunded',
  'returning both refunds the order'
);
select is(
  tests.balance('eve'), 0::bigint,
  'the 30 earned points are taken back; the 300 spent on the reward are not restored'
);
select is(
  (select status::text from public.redemptions where order_id = tests.id('o_eve')), 'fulfilled',
  'the redemption stays fulfilled'
);

-- ===============================================================================
-- What can be refunded
-- ===============================================================================

select throws_ok(
  $$ select public.request_refund(tests.id('o_val'), tests.id('cashier'), 'test-refund-val-over',
       tests.refund_lines(tests.id('o_val'), 'bar_a', 4), 'customer_request') $$,
  'BB002', null, 'cannot refund more units than were sold'
);
select throws_ok(
  $$ select public.request_refund(tests.id('o_val'), tests.id('cashier'), 'test-refund-val-foreign',
       tests.refund_lines(tests.id('o_hal'), 'bar_a', 1), 'customer_request') $$,
  'BB002', null, 'cannot refund a line that belongs to another order'
);
select throws_ok(
  $$ select public.request_refund(tests.id('o_val'), tests.id('cashier'), 'test-refund-val-empty',
       '[]'::jsonb, 'customer_request') $$,
  '22023', null, 'a refund needs at least one item'
);
select throws_ok(
  $$ select public.request_refund(tests.id('o_val'), tests.id('cashier'), 'test-refund-val-zero',
       tests.refund_lines(tests.id('o_val'), 'bar_a', 0), 'customer_request') $$,
  'BB002', null, 'a quantity of zero is refused'
);
select throws_ok(
  $$ select public.request_refund(tests.id('o_val'), tests.id('cashier'), 'test-refund-val-bad',
       '[{"order_item_id": "nope", "quantity": 1}]'::jsonb, 'customer_request') $$,
  '22023', null, 'malformed refund items are refused'
);
select throws_ok(
  $$ select public.request_refund(tests.id('o_val'), tests.id('cashier'), 'test-refund-val-reason',
       tests.refund_lines(tests.id('o_val'), 'bar_a', 1), 'because') $$,
  '23514', null, 'the reason must be one of the known reasons'
);
select throws_ok(
  $$ select public.request_refund(tests.id('o_unpaid'), tests.id('cashier'), 'test-refund-unpaid',
       tests.refund_lines(tests.id('o_unpaid'), 'bar_a', 1), 'customer_request') $$,
  'BB002', null, 'an unpaid order cannot be refunded'
);
select throws_ok(
  $$ select public.request_refund(gen_random_uuid(), tests.id('cashier'), 'test-refund-missing',
       '[]'::jsonb, 'customer_request') $$,
  'BB006', null, 'an unknown order is an error'
);

-- Units held by a refund that is still in flight cannot be refunded twice.
insert into tests.fixtures (name, id)
select 'rf_val_1', r.id
from public.request_refund(tests.id('o_val'), tests.id('cashier'), 'test-refund-val-1',
  tests.refund_lines(tests.id('o_val'), 'bar_a', 2), 'customer_request') r;
select throws_ok(
  $$ select public.request_refund(tests.id('o_val'), tests.id('cashier'), 'test-refund-val-2',
       tests.refund_lines(tests.id('o_val'), 'bar_a', 2), 'customer_request') $$,
  'BB002', null, 'two units are held by a pending refund, so only one more can be requested'
);
select is(
  (select amount_cents from public.request_refund(tests.id('o_val'), tests.id('cashier'),
     'test-refund-val-3', tests.refund_lines(tests.id('o_val'), 'bar_a', 1), 'customer_request')),
  300::bigint,
  'the one remaining unit can be requested'
);

-- Idempotency.
select is(
  (select id from public.request_refund(tests.id('o_val'), tests.id('cashier'), 'test-refund-val-1',
     tests.refund_lines(tests.id('o_val'), 'bar_a', 2), 'customer_request')),
  tests.id('rf_val_1'),
  'retrying a refund request with the same key returns the same refund'
);
select is(
  (select count(*) from public.refunds where order_id = tests.id('o_val')), 2::bigint,
  'no extra refund rows were created'
);
select throws_ok(
  $$ select public.request_refund(tests.id('o_hal'), tests.id('cashier'), 'test-refund-val-1',
       tests.refund_lines(tests.id('o_hal'), 'bar_a', 1), 'customer_request') $$,
  'BB003', null, 'a refund key cannot be reused for another order'
);

-- A refund the provider rejects frees its units again.
select results_eq(
  $$ select status, failure_reason, completed_at is not null
     from public.fail_refund(tests.id('rf_val_1'), 'card issuer declined the refund') $$,
  $$ values ('failed', 'card issuer declined the refund', true) $$,
  'a rejected refund is marked failed with the reason'
);
select lives_ok(
  $$ select public.fail_refund(tests.id('rf_val_1'), 'again') $$,
  'failing it again changes nothing'
);
select throws_ok(
  $$ select public.complete_refund(tests.id('rf_val_1'), 're_test_val_1', 600) $$,
  'BB002', null, 'a failed refund cannot be completed afterwards'
);
select is(
  (select status::text from public.orders where id = tests.id('o_val')), 'paid',
  'the order is untouched by a failed refund'
);
select is(
  (select amount_cents from public.request_refund(tests.id('o_val'), tests.id('cashier'),
     'test-refund-val-4', tests.refund_lines(tests.id('o_val'), 'bar_a', 2), 'customer_request')),
  600::bigint,
  'the two units from the failed refund can be requested again'
);
select throws_ok(
  $$ select public.fail_refund(tests.id('rf_amy'), 'too late') $$,
  'BB002', null, 'a completed refund cannot be marked failed'
);
-- The provider must confirm the exact amount.
select throws_ok(
  $$ select public.complete_refund(
       (select id from public.refunds where idempotency_key = 'test-refund-val-3'), 're_test_val_3', 299) $$,
  'BB002', null, 'a confirmation for a different amount is refused'
);

-- ===============================================================================
-- Approval
-- ===============================================================================

select is(
  (select refund_approval_threshold_cents from public.app_settings), 2500::bigint,
  'setup: refunds above $25.00 need a manager'
);
select throws_ok(
  $$ select public.request_refund(tests.id('o_big_1'), tests.id('cashier'), 'test-refund-big-1a',
       tests.refund_lines(tests.id('o_big_1'), 'six', 2), 'customer_request') $$,
  'BB008', null, 'a cashier cannot refund $32.00 alone'
);
select throws_ok(
  $$ select public.request_refund(tests.id('o_big_1'), tests.id('cashier'), 'test-refund-big-1b',
       tests.refund_lines(tests.id('o_big_1'), 'six', 2), 'customer_request', null,
       tests.id('other_cashier')) $$,
  'BB008', null, 'another cashier cannot approve it'
);
select results_eq(
  $$ select amount_cents, requested_by, approved_by
     from public.request_refund(tests.id('o_big_1'), tests.id('cashier'), 'test-refund-big-1c',
       tests.refund_lines(tests.id('o_big_1'), 'six', 2), 'customer_request', null, tests.id('manager')) $$,
  $$ select 3200::bigint, tests.id('cashier'), tests.id('manager') $$,
  'with a manager approving, the $32.00 refund is accepted and records both people'
);
select is(
  (select approved_by from public.request_refund(tests.id('o_big_2'), tests.id('manager'),
     'test-refund-big-2', tests.refund_lines(tests.id('o_big_2'), 'six', 2), 'customer_request')),
  tests.id('manager'),
  'a manager approves their own refund requests'
);
select lives_ok(
  $$ select public.request_refund(tests.id('o_big_3'), tests.id('cashier'), 'test-refund-big-3a',
       tests.refund_lines(tests.id('o_big_3'), 'six', 1), 'customer_request') $$,
  'a cashier can refund $16.00 alone'
);
update public.app_settings set refund_approval_threshold_cents = 1599;
select throws_ok(
  $$ select public.request_refund(tests.id('o_big_3'), tests.id('cashier'), 'test-refund-big-3b',
       tests.refund_lines(tests.id('o_big_3'), 'six', 1), 'customer_request') $$,
  'BB008', null, 'after the owner lowers the limit to $15.99, the same refund needs a manager'
);
update public.app_settings set refund_approval_threshold_cents = 2500;

-- ===============================================================================
-- Stock
-- ===============================================================================

insert into tests.fixtures (name, id)
select 'rf_damaged', r.id
from public.request_refund(tests.id('o_damaged'), tests.id('cashier'), 'test-refund-damaged',
  tests.refund_lines(tests.id('o_damaged'), 'six', 1, false), 'damaged') r;
select public.complete_refund(tests.id('rf_damaged'), 're_test_damaged', 1600);
select is(tests.stock('six'), 13, 'a damaged six-pack is refunded but not put back on the shelf');
select is(
  (select count(*) from public.inventory_movements
   where order_id = tests.id('o_damaged') and reason = 'refund_restock'),
  0::bigint,
  'no restock movement is written for it'
);
select results_eq(
  $$ select delta, employee_id from public.inventory_movements
     where order_id = tests.id('o_amy') and reason = 'refund_restock' $$,
  $$ select 3, tests.id('cashier') $$,
  'a normal return writes a restock movement naming the employee'
);

-- ===============================================================================
-- Webhook confirmation
-- ===============================================================================

insert into tests.fixtures (name, id)
select 'rf_hal', r.id
from public.request_refund(tests.id('o_hal'), tests.id('cashier'), 'test-refund-hal',
  tests.refund_lines(tests.id('o_hal'), 'bar_a', 3), 'customer_request') r;
select is(tests.balance('hal'), 270::bigint, 'setup: three $9.00 orders earned 270 points');

-- The webhook can arrive before the API call has recorded the provider id; it
-- finds our refund through the id we put in the metadata.
select is(
  public.handle_refund_update(
    'evt_test_refund_hal_1', 'refund.created', '{}'::jsonb, 're_test_hal', 'succeeded', 900,
    tests.id('rf_hal')),
  'processed', 'a refund webhook that arrives first is matched by our refund id'
);
select results_eq(
  $$ select status, provider_refund_id, points_reversed from public.refunds where id = tests.id('rf_hal') $$,
  $$ values ('succeeded', 're_test_hal', 90::bigint) $$,
  'the refund is completed and linked to the provider refund'
);
select is(tests.balance('hal'), 180::bigint, 'its 90 points are taken back');
select is(
  public.handle_refund_update(
    'evt_test_refund_hal_1', 'refund.created', '{}'::jsonb, 're_test_hal', 'succeeded', 900,
    tests.id('rf_hal')),
  'duplicate', 'the same refund event again is a duplicate'
);
select is(
  public.handle_refund_update(
    'evt_test_refund_hal_2', 'refund.updated', '{}'::jsonb, 're_test_hal', 'succeeded', 900),
  'processed', 'a later event for the same refund is accepted'
);
select lives_ok(
  $$ select public.complete_refund(tests.id('rf_hal'), 're_test_hal', 900) $$,
  'the API path confirming afterwards raises no error'
);
select is(tests.balance('hal'), 180::bigint, 'and the points are taken back only once');
select is(
  (select count(*) from public.inventory_movements
   where order_id = tests.id('o_hal') and reason = 'refund_restock'),
  1::bigint, 'and stock is returned only once'
);

select is(
  public.handle_refund_update(
    'evt_test_refund_unknown', 'refund.created', '{}'::jsonb, 're_test_dashboard', 'succeeded', 500),
  'failed:unknown_refund', 'a refund made outside the app is flagged'
);

insert into tests.fixtures (name, id)
select 'rf_hal_2', r.id
from public.request_refund(tests.id('o_hal_2'), tests.id('cashier'), 'test-refund-hal-2',
  tests.refund_lines(tests.id('o_hal_2'), 'bar_a', 3), 'customer_request') r;
select is(
  public.handle_refund_update(
    'evt_test_refund_hal_wrong', 'refund.created', '{}'::jsonb, 're_test_hal_2', 'succeeded', 100,
    tests.id('rf_hal_2')),
  'failed:amount_mismatch', 'a refund confirmation for the wrong amount is rejected'
);
select is(
  (select status from public.refunds where id = tests.id('rf_hal_2')), 'pending',
  'the refund stays pending'
);
select is(
  public.handle_refund_update(
    'evt_test_refund_hal_pending', 'refund.updated', '{}'::jsonb, 're_test_hal_2', 'pending', 900,
    tests.id('rf_hal_2')),
  'ignored', 'a "still pending" update changes nothing'
);
select is(
  public.handle_refund_update(
    'evt_test_refund_hal_failed', 'refund.failed', '{}'::jsonb, 're_test_hal_2', 'failed', 900,
    tests.id('rf_hal_2'), 'lost_or_stolen_card'),
  'processed', 'a failed-refund webhook is processed'
);
select results_eq(
  $$ select status, failure_reason from public.refunds where id = tests.id('rf_hal_2') $$,
  $$ values ('failed', 'lost_or_stolen_card') $$,
  'the refund is marked failed with the provider reason'
);
select is(tests.balance('hal'), 180::bigint, 'a failed refund takes back no points');
select is(
  public.handle_refund_update(
    'evt_test_refund_hal_late', 'refund.updated', '{}'::jsonb, 're_test_hal_2', 'succeeded', 900,
    tests.id('rf_hal_2')),
  'failed:refund_not_pending', 'a success for a refund already recorded as failed is flagged'
);
select is(
  public.handle_refund_update(
    'evt_test_refund_hal_rev', 'refund.failed', '{}'::jsonb, 're_test_hal', 'failed', 900),
  'failed:refund_already_succeeded', 'a failure for a refund already completed is flagged'
);

select tests.clear_authentication();

-- ===============================================================================
-- Invariants and privileges
-- ===============================================================================

select is_empty(
  $$ select o.id from public.orders o
     join public.refunds r on r.order_id = o.id and r.status = 'succeeded'
     group by o.id, o.total_cents
     having sum(r.amount_cents) > o.total_cents $$,
  'no order has been refunded more than was paid'
);
select is_empty(
  $$ select o.id from public.orders o
     left join (select order_id, sum(amount_cents) total from public.refunds
                where status = 'succeeded' group by 1) r on r.order_id = o.id
     where (o.status = 'refunded' and coalesce(r.total, 0) <> o.total_cents)
        or (o.status = 'partially_refunded' and not (coalesce(r.total, 0) > 0 and r.total < o.total_cents))
        or (o.status = 'paid' and coalesce(r.total, 0) <> 0) $$,
  'every order status agrees with the money actually refunded'
);
select is_empty(
  $$ select i.id from public.order_items i
     left join (select ri.order_item_id, sum(ri.quantity) qty
                from public.refund_items ri join public.refunds r on r.id = ri.refund_id
                where r.status = 'succeeded' group by 1) x on x.order_item_id = i.id
     where i.refunded_quantity <> coalesce(x.qty, 0) $$,
  'every refunded quantity equals the units in its succeeded refunds'
);
select is_empty(
  $$ select l.product_id from public.inventory_levels l
     left join (select product_id, sum(delta) total from public.inventory_movements group by 1) m
       on m.product_id = l.product_id
     where l.on_hand <> coalesce(m.total, 0) $$,
  'every stock level equals its movement sum'
);
select is_empty(
  $$ select a.customer_id from public.loyalty_accounts a
     left join (select customer_id, sum(points) total from public.loyalty_transactions group by 1) t
       on t.customer_id = a.customer_id
     where a.balance <> coalesce(t.total, 0) or a.balance < 0 $$,
  'every balance equals its ledger sum and none is negative'
);

select tests.authenticate_as('cashier');
select throws_ok(
  $$ select public.request_refund(tests.id('o_hal_3'), tests.id('cashier'), 'test-refund-direct',
       '[]'::jsonb, 'customer_request') $$,
  '42501', null, 'a cashier cannot call request_refund directly; refunds go through the server'
);
select throws_ok(
  $$ select public.complete_refund(tests.id('rf_hal_2'), 're_test_forged', 900) $$,
  '42501', null, 'a cashier cannot mark a refund as completed'
);
select throws_ok(
  $$ select public.handle_refund_update('evt_test_forged_refund', 'refund.created', '{}'::jsonb,
       're_test_forged', 'succeeded', 900) $$,
  '42501', null, 'a cashier cannot forge a refund webhook'
);
select tests.clear_authentication();

select tests.authenticate_as('hal');
select is(
  (select count(*) from public.orders where status = 'refunded'), 1::bigint,
  'a customer sees their own refunded order in their history'
);
select tests.clear_authentication();

select * from finish();
rollback;
