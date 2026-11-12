-- Shopify order and refund webhooks: mirroring sales, linking members,
-- awarding points once, and taking them back on refunds.
begin;
set local search_path = public, extensions;

select plan(89);

-- Fixtures ----------------------------------------------------------------------
select tests.create_employee('owner', 'owner');
select tests.create_customer(name) from unnest(array['alice', 'bob', 'cara', 'gone']) as t(name);
update public.customers set shopify_customer_id = 5000000000000000001 where id = tests.id('alice');
update public.customers set deleted_at = now(), email = null where id = tests.id('gone');

-- Reporting details for two Shopify variants.
insert into public.products (name, flavor, category, bar_count, price_cents, shopify_variant_id)
values ('Chocolate Bar', 'Chocolate', 'bar', 1, 300, 111),
       ('Chocolate Three-Pack', 'Chocolate', 'three_pack', 3, 850, 333);

select tests.authenticate_as_service_role();

-- ===============================================================================
-- A sale at the till
-- ===============================================================================

select is(
  tests.deliver_order('o1', tests.shopify_order(
    9000000000000000123,
    '[{"id": 9100000000000000001, "variant_id": 111, "product_id": 11, "title": "Chocolate Bar",
       "variant_title": null, "sku": "BAR-CHOC", "price": "3.00", "quantity": 3}]',
    5000000000000000001, 'alice@test.brobatch')),
  'processed', 'a paid order from the till is processed'
);
select results_eq(
  $$ select status::text, subtotal_cents, discount_cents, reward_cents, total_cents, points_awarded,
            source, shopify_order_id, shopify_location_id, shopify_user_id, is_test, customer_id
     from public.orders where shopify_order_id = 9000000000000000123 $$,
  $$ select 'paid', 900::bigint, 0::bigint, 0::bigint, 900::bigint, 90::bigint,
            'pos', 9000000000000000123, 70000000001, 80000000001, false, tests.id('alice') $$,
  'the order is mirrored exactly, including ids larger than 2^53, and linked to the member'
);
select results_eq(
  $$ select product_name, flavor, bar_count, unit_price_cents, quantity, line_total_cents,
            shopify_line_item_id, shopify_variant_id, sku
     from public.order_items where order_id = tests.order_for(9000000000000000123) $$,
  $$ values ('Chocolate Bar', 'Chocolate', 1, 300::bigint, 3, 900::bigint,
             9100000000000000001, 111::bigint, 'BAR-CHOC') $$,
  'its line is mirrored with the flavor and bar count from the products table'
);
select is(tests.balance('alice'), 90::bigint, 'the member earns 90 points on $9.00');
select results_eq(
  $$ select kind, points, source_event_id from public.loyalty_transactions
     where order_id = tests.order_for(9000000000000000123) $$,
  $$ values ('earn', 90::bigint, 'shopify:wh-o1') $$,
  'the ledger row names the webhook delivery that caused it'
);
select results_eq(
  $$ select status, topic, resource_id, attempts from public.shopify_webhook_events where id = 'wh-o1' $$,
  $$ values ('processed', 'orders/paid', 9000000000000000123, 1) $$,
  'the delivery is logged as processed'
);
select ok(
  (select paid_at = '2026-11-12T10:00:05-05:00'::timestamptz from public.orders
   where shopify_order_id = 9000000000000000123),
  'paid_at is the time Shopify processed the order'
);

-- Replays.
select is(
  tests.deliver_order('o1', tests.shopify_order(
    9000000000000000123,
    '[{"id": 9100000000000000001, "variant_id": 111, "title": "Chocolate Bar", "price": "3.00", "quantity": 3}]',
    5000000000000000001, 'alice@test.brobatch')),
  'duplicate', 'the same delivery again is a duplicate'
);
select is(
  tests.deliver_order('o1-again', tests.shopify_order(
    9000000000000000123,
    '[{"id": 9100000000000000001, "variant_id": 111, "title": "Chocolate Bar", "price": "99.00", "quantity": 9}]',
    5000000000000000001, 'alice@test.brobatch')),
  'ignored', 'a second delivery about an order already mirrored is ignored'
);
select is(tests.balance('alice'), 90::bigint, 'the points are awarded once');
select is(
  (select count(*) from public.orders where shopify_order_id = 9000000000000000123), 1::bigint,
  'the order exists once'
);
select is(
  (select total_cents from public.orders where shopify_order_id = 9000000000000000123), 900::bigint,
  'and the later delivery did not change it'
);
select is(
  (select attempts from public.shopify_webhook_events where id = 'wh-o1'), 2,
  'the repeated delivery is counted'
);

-- ===============================================================================
-- Who gets the points
-- ===============================================================================

select is(
  tests.deliver_order('o2', tests.shopify_order(
    9000000000000000201,
    '[{"id": 9100000000000000002, "variant_id": 111, "title": "Chocolate Bar", "price": "3.00", "quantity": 1}]')),
  'processed', 'a sale with no customer attached is mirrored'
);
select results_eq(
  $$ select customer_id, points_awarded from public.orders where shopify_order_id = 9000000000000000201 $$,
  $$ values (null::uuid, 0::bigint) $$,
  'it belongs to nobody and earns nothing'
);

-- Bob is a member but has never been scanned: he is matched by email.
select is(
  tests.deliver_order('o3', tests.shopify_order(
    9000000000000000202,
    '[{"id": 9100000000000000003, "variant_id": 111, "title": "Chocolate Bar", "price": "3.00", "quantity": 2}]',
    5000000000000000002, 'BOB@Test.BroBatch')),
  'processed', 'an order for a Shopify customer with a member''s email is processed'
);
select is(
  (select shopify_customer_id from public.customers where id = tests.id('bob')), 5000000000000000002,
  'the member is linked to that Shopify customer, ignoring letter case'
);
select is(tests.balance('bob'), 60::bigint, 'and earns 60 points on $6.00');

-- Once linked, the email on later orders does not matter.
select is(
  tests.deliver_order('o4', tests.shopify_order(
    9000000000000000203,
    '[{"id": 9100000000000000004, "variant_id": 111, "title": "Chocolate Bar", "price": "3.00", "quantity": 1}]',
    5000000000000000002, 'someone-else@example.com')),
  'processed', 'a later order for the linked Shopify customer is processed'
);
select is(tests.balance('bob'), 90::bigint, 'the linked member earns again');

-- A different Shopify customer cannot take over a member who is already linked.
select is(
  tests.deliver_order('o5', tests.shopify_order(
    9000000000000000204,
    '[{"id": 9100000000000000005, "variant_id": 111, "title": "Chocolate Bar", "price": "3.00", "quantity": 1}]',
    5000000000000000099, 'bob@test.brobatch')),
  'processed', 'an order for another Shopify customer using a linked member''s email is mirrored'
);
select is(
  (select shopify_customer_id from public.customers where id = tests.id('bob')), 5000000000000000002,
  'the member stays linked to the original Shopify customer'
);
select is(tests.balance('bob'), 90::bigint, 'and earns nothing from the other customer''s order');

select is(
  tests.deliver_order('o6', tests.shopify_order(
    9000000000000000205,
    '[{"id": 9100000000000000006, "variant_id": 111, "title": "Chocolate Bar", "price": "3.00", "quantity": 1}]',
    5000000000000000050, 'not-a-member@example.com')),
  'processed', 'an order for a Shopify customer who is not a member is mirrored'
);
select is(
  (select customer_id from public.orders where shopify_order_id = 9000000000000000205), null::uuid,
  'with no member attached'
);

-- ===============================================================================
-- What counts
-- ===============================================================================

-- Not paid yet.
select is(
  tests.deliver_order('o7-pending', tests.shopify_order(
    9000000000000000301,
    '[{"id": 9100000000000000007, "variant_id": 111, "title": "Chocolate Bar", "price": "3.00", "quantity": 1}]',
    5000000000000000001, 'alice@test.brobatch', '[]', '{"financial_status": "pending"}')),
  'ignored', 'an order that is not paid is ignored'
);
select is(
  (select count(*) from public.orders where shopify_order_id = 9000000000000000301), 0::bigint,
  'and not mirrored'
);
select is(tests.balance('alice'), 90::bigint, 'no points before payment');
select is(
  tests.deliver_order('o7-paid', tests.shopify_order(
    9000000000000000301,
    '[{"id": 9100000000000000007, "variant_id": 111, "title": "Chocolate Bar", "price": "3.00", "quantity": 1}]',
    5000000000000000001, 'alice@test.brobatch')),
  'processed', 'when the paid delivery arrives it is processed'
);
select is(tests.balance('alice'), 120::bigint, 'and the points are awarded then');

-- Test orders.
select is(
  tests.deliver_order('o8-test', tests.shopify_order(
    9000000000000000302,
    '[{"id": 9100000000000000008, "variant_id": 111, "title": "Chocolate Bar", "price": "3.00", "quantity": 1}]',
    5000000000000000001, 'alice@test.brobatch', '[]', '{"test": true}')),
  'ignored', 'a test order is ignored by default'
);
select is(tests.balance('alice'), 120::bigint, 'a test order earns nothing');
update public.app_settings set accept_test_orders = true;
select is(
  tests.deliver_order('o8-test-allowed', tests.shopify_order(
    9000000000000000302,
    '[{"id": 9100000000000000008, "variant_id": 111, "title": "Chocolate Bar", "price": "3.00", "quantity": 1}]',
    5000000000000000001, 'alice@test.brobatch', '[]', '{"test": true}')),
  'processed', 'with test orders switched on (a development store), it is processed'
);
select is(
  (select is_test from public.orders where shopify_order_id = 9000000000000000302), true,
  'and marked as a test'
);
update public.app_settings set accept_test_orders = false;

-- Currency.
select is(
  tests.deliver_order('o9-eur', tests.shopify_order(
    9000000000000000303,
    '[{"id": 9100000000000000009, "variant_id": 111, "title": "Chocolate Bar", "price": "3.00", "quantity": 1}]',
    5000000000000000001, 'alice@test.brobatch', '[]', '{"currency": "EUR"}')),
  'flagged', 'an order in another currency is flagged'
);
select is(
  (select count(*) from public.orders where shopify_order_id = 9000000000000000303), 0::bigint,
  'and not mirrored'
);
select matches(
  (select note from public.shopify_webhook_events where id = 'wh-o9-eur'), 'currency',
  'the log says why'
);

-- An ordinary Shopify discount: points are earned on what was paid.
select is(
  tests.deliver_order('o10', tests.shopify_order(
    9000000000000000304,
    '[{"id": 9100000000000000010, "variant_id": 111, "title": "Chocolate Bar", "price": "3.00", "quantity": 3}]',
    5000000000000000003, 'cara@test.brobatch', '[{"code": "WELCOME10", "amount": "1.00"}]')),
  'processed', 'an order with an ordinary Shopify discount is processed'
);
select results_eq(
  $$ select subtotal_cents, discount_cents, reward_cents, total_cents, points_awarded
     from public.orders where shopify_order_id = 9000000000000000304 $$,
  $$ values (900::bigint, 100::bigint, 0::bigint, 800::bigint, 80::bigint) $$,
  '$9.00 of goods with $1.00 off earns 80 points, and the discount is not treated as a reward'
);

-- Tax and tips are recorded but earn nothing.
select is(
  tests.deliver_order('o11', tests.shopify_order(
    9000000000000000305,
    '[{"id": 9100000000000000011, "variant_id": 111, "title": "Chocolate Bar", "price": "3.00", "quantity": 3}]',
    5000000000000000003, 'cara@test.brobatch', '[]',
    '{"total_tax": "0.72", "total_price": "10.72", "total_tip_received": "1.00"}')),
  'processed', 'an order with tax and a tip is processed'
);
select results_eq(
  $$ select total_cents, tax_cents, grand_total_cents, points_awarded
     from public.orders where shopify_order_id = 9000000000000000305 $$,
  $$ values (900::bigint, 72::bigint, 1072::bigint, 90::bigint) $$,
  'points are earned on the $9.00 of goods, not on the $10.72 charged'
);
select is(tests.balance('cara'), 170::bigint, 'the member has 80 + 90 points');

-- Lines: unmapped variants, custom sales, zero quantities.
select is(
  tests.deliver_order('o12', tests.shopify_order(
    9000000000000000306,
    '[{"id": 9100000000000000012, "variant_id": 333, "title": "Chocolate Three-Pack", "price": "8.50", "quantity": 2},
      {"id": 9100000000000000013, "variant_id": 999, "title": "Mystery Bar", "variant_title": "Mint", "price": "3.25", "quantity": 1},
      {"id": 9100000000000000014, "variant_id": null, "title": "Custom sale", "price": "1.00", "quantity": 1},
      {"id": 9100000000000000015, "variant_id": 111, "title": "Chocolate Bar", "price": "3.00", "quantity": 0}]')),
  'processed', 'an order with mixed lines is processed'
);
select results_eq(
  $$ select product_name, flavor, bar_count, quantity, line_total_cents
     from public.order_items where order_id = tests.order_for(9000000000000000306)
     order by shopify_line_item_id $$,
  $$ values ('Chocolate Three-Pack', 'Chocolate', 3, 2, 1700::bigint),
            ('Mystery Bar', 'Mint', 1, 1, 325::bigint),
            ('Custom sale', 'Custom sale', 1, 1, 100::bigint) $$,
  'a described variant uses its bar count; an unknown one counts as one bar; a zero-quantity line is skipped'
);
select is(
  (select subtotal_cents from public.orders where shopify_order_id = 9000000000000000306), 2125::bigint,
  'the subtotal is 17.00 + 3.25 + 1.00'
);

-- Bodies that are not orders.
select throws_ok(
  $$ select public.ingest_shopify_order('wh-bad-1', 'orders/paid', 'ev', 'not json') $$,
  '22023', null, 'a body that is not JSON is refused'
);
select throws_ok(
  $$ select public.ingest_shopify_order('wh-bad-2', 'orders/paid', 'ev', '{"hello": "world"}') $$,
  '22023', null, 'a body with no order id is refused'
);
select is(
  (select count(*) from public.shopify_webhook_events where id like 'wh-bad-%'), 0::bigint,
  'refused bodies leave nothing in the log, so Shopify''s retry is processed afresh'
);

-- A closed account earns nothing.
update public.customers set shopify_customer_id = 5000000000000000077 where id = tests.id('gone');
select is(
  tests.deliver_order('o13', tests.shopify_order(
    9000000000000000307,
    '[{"id": 9100000000000000016, "variant_id": 111, "title": "Chocolate Bar", "price": "3.00", "quantity": 1}]',
    5000000000000000077, null)),
  'processed', 'an order for a closed account is mirrored'
);
select is(
  (select customer_id from public.orders where shopify_order_id = 9000000000000000307), null::uuid,
  'without attaching the closed account'
);

-- ===============================================================================
-- Refunds
-- ===============================================================================

select is(
  tests.deliver_refund('r1', tests.shopify_refund(
    9200000000000000001, 9000000000000000123,
    '[{"line_item_id": 9100000000000000001, "quantity": 1, "amount": "3.00"}]', '  wrong flavor ')),
  'processed', 'a refund for one of three bars is processed'
);
select results_eq(
  $$ select amount_cents, status, reason, note, points_reversed, shopify_refund_id,
            points_reversal_processed_at is not null
     from public.refunds where shopify_refund_id = 9200000000000000001 $$,
  $$ values (300::bigint, 'succeeded', 'other', 'wrong flavor', 30::bigint, 9200000000000000001, true) $$,
  'the refund is mirrored with its note and reverses 30 points'
);
select is(
  (select status::text from public.orders where shopify_order_id = 9000000000000000123),
  'partially_refunded', 'the order is partially refunded'
);
select is(
  (select refunded_quantity from public.order_items where shopify_line_item_id = 9100000000000000001), 1,
  'the line shows one unit refunded'
);
select is(tests.balance('alice'), 120::bigint, 'the member''s balance drops from 150 to 120');

select is(
  tests.deliver_refund('r1', tests.shopify_refund(
    9200000000000000001, 9000000000000000123,
    '[{"line_item_id": 9100000000000000001, "quantity": 1, "amount": "3.00"}]')),
  'duplicate', 'the same refund delivery again is a duplicate'
);
select is(
  tests.deliver_refund('r1-again', tests.shopify_refund(
    9200000000000000001, 9000000000000000123,
    '[{"line_item_id": 9100000000000000001, "quantity": 1, "amount": "3.00"}]')),
  'ignored', 'a second delivery about a refund already mirrored is ignored'
);
select is(tests.balance('alice'), 120::bigint, 'the points are taken back once');

select is(
  tests.deliver_refund('r2', tests.shopify_refund(
    9200000000000000002, 9000000000000000123,
    '[{"line_item_id": 9100000000000000001, "quantity": 2, "amount": "6.00"}]')),
  'processed', 'refunding the other two bars is processed'
);
select is(
  (select status::text from public.orders where shopify_order_id = 9000000000000000123),
  'refunded', 'the order is fully refunded'
);
select is(
  (select sum(points_reversed) from public.refunds
   where order_id = tests.order_for(9000000000000000123)),
  90::numeric, 'exactly the 90 points it earned are taken back'
);
select is(tests.balance('alice'), 60::bigint, 'the member keeps the 60 points from her other two orders');

-- Discounted order: Shopify reports each line's refunded value after discounts.
select is(
  tests.deliver_refund('r3', tests.shopify_refund(
    9200000000000000003, 9000000000000000304,
    '[{"line_item_id": 9100000000000000010, "quantity": 1, "amount": "2.67"}]')),
  'processed', 'a refund on a discounted order is processed'
);
select results_eq(
  $$ select amount_cents, points_reversed from public.refunds where shopify_refund_id = 9200000000000000003 $$,
  $$ values (267::bigint, 26::bigint) $$,
  '$2.67 of an $8.00 order that earned 80 points takes back 26'
);

-- A refund can never exceed what the order was worth.
select is(
  tests.deliver_refund('r4', tests.shopify_refund(
    9200000000000000004, 9000000000000000304,
    '[{"line_item_id": 9100000000000000010, "quantity": 2, "amount": "99.00"}]')),
  'processed', 'an over-stated refund is processed'
);
select is(
  (select amount_cents from public.refunds where shopify_refund_id = 9200000000000000004), 533::bigint,
  'but capped at what was left of the order (8.00 - 2.67)'
);
select is(
  (select status::text from public.orders where shopify_order_id = 9000000000000000304),
  'refunded', 'and the order is refunded'
);

-- Nothing of value refunded (for example shipping only).
select is(
  tests.deliver_refund('r5', tests.shopify_refund(9200000000000000005, 9000000000000000305, '[]')),
  'ignored', 'a refund with no goods in it is ignored'
);
select is(tests.balance('cara'), 90::bigint, 'and takes back nothing (170 - 80 from the earlier refunds)');

-- A refund that arrives before its order asks Shopify to try again.
select is(
  tests.deliver_refund('r6', tests.shopify_refund(
    9200000000000000006, 9000000000000000401,
    '[{"line_item_id": 9100000000000000020, "quantity": 1, "amount": "3.00"}]')),
  'retry', 'a refund for an order we have not seen yet asks for a retry'
);
select is(
  (select status from public.shopify_webhook_events where id = 'wh-r6'), 'retry',
  'the delivery is logged as waiting'
);
select is(
  tests.deliver_order('o14', tests.shopify_order(
    9000000000000000401,
    '[{"id": 9100000000000000020, "variant_id": 111, "title": "Chocolate Bar", "price": "3.00", "quantity": 1}]',
    5000000000000000003, 'cara@test.brobatch')),
  'processed', 'then the order arrives'
);
select is(tests.balance('cara'), 120::bigint, 'and earns 30');
select is(
  tests.deliver_refund('r6', tests.shopify_refund(
    9200000000000000006, 9000000000000000401,
    '[{"line_item_id": 9100000000000000020, "quantity": 1, "amount": "3.00"}]')),
  'processed', 'and the redelivered refund is processed'
);
select is(tests.balance('cara'), 90::bigint, 'taking the 30 back');

-- A refund for an order that never arrives is eventually set aside.
select is(
  (select array_agg(tests.deliver_refund('r7', tests.shopify_refund(
     9200000000000000007, 9000000000000000999,
     '[{"line_item_id": 1, "quantity": 1, "amount": "3.00"}]')) order by n)
   from generate_series(1, 5) n),
  array['retry', 'retry', 'retry', 'retry', 'ignored'],
  'after four retries, a refund for an unknown order is ignored'
);
select is(
  tests.deliver_refund('r7', tests.shopify_refund(
    9200000000000000007, 9000000000000000999,
    '[{"line_item_id": 1, "quantity": 1, "amount": "3.00"}]')),
  'duplicate', 'and further deliveries of it are duplicates'
);

select throws_ok(
  $$ select public.ingest_shopify_refund('wh-bad-3', 'refunds/create', 'ev', '{"id": 1}') $$,
  '22023', null, 'a refund body with no order id is refused'
);

-- A guest order's refund touches no points.
select is(
  tests.deliver_refund('r8', tests.shopify_refund(
    9200000000000000008, 9000000000000000201,
    '[{"line_item_id": 9100000000000000002, "quantity": 1, "amount": "3.00"}]')),
  'processed', 'a refund of a guest order is processed'
);
select results_eq(
  $$ select points_reversed, points_reversal_processed_at is not null
     from public.refunds where shopify_refund_id = 9200000000000000008 $$,
  $$ values (0::bigint, true) $$,
  'with no points to reverse'
);

select tests.clear_authentication();

-- ===============================================================================
-- Invariants and privileges
-- ===============================================================================

select is_empty(
  $$ select a.customer_id from public.loyalty_accounts a
     left join (select customer_id, sum(points) total from public.loyalty_transactions group by 1) t
       on t.customer_id = a.customer_id
     where a.balance <> coalesce(t.total, 0) or a.balance < 0 $$,
  'every balance equals its ledger sum and none is negative'
);
select is_empty(
  $$ select o.id from public.orders o
     join public.order_items i on i.order_id = o.id
     group by o.id, o.subtotal_cents
     having sum(i.line_total_cents) <> o.subtotal_cents $$,
  'every mirrored subtotal equals the sum of its lines'
);
select is_empty(
  $$ select o.id from public.orders o
     left join (select order_id, sum(amount_cents) total from public.refunds
                where status = 'succeeded' group by 1) r on r.order_id = o.id
     where coalesce(r.total, 0) > o.total_cents
        or (o.status = 'refunded' and coalesce(r.total, 0) <> o.total_cents)
        or (o.status = 'partially_refunded' and not (r.total > 0 and r.total < o.total_cents))
        or (o.status = 'paid' and coalesce(r.total, 0) <> 0) $$,
  'every order status agrees with what was refunded, and nothing is over-refunded'
);
select is_empty(
  $$ select o.id from public.orders o
     where o.shopify_order_id is not null
       and (select count(*) from public.loyalty_transactions t
            where t.order_id = o.id and t.kind = 'earn') > 1 $$,
  'no Shopify order earned twice'
);

select tests.authenticate_as('alice');
select throws_ok(
  $$ select public.ingest_shopify_order('wh-forged', 'orders/paid', 'ev',
       tests.shopify_order(9000000000000000777,
         '[{"id": 1, "variant_id": 111, "title": "Bar", "price": "1000.00", "quantity": 100}]',
         5000000000000000001, 'alice@test.brobatch')) $$,
  '42501', null, 'a customer cannot feed in an order to give themselves points'
);
select is_empty(
  $$ select 1 from public.shopify_webhook_events $$,
  'a customer cannot read the webhook log'
);
select tests.clear_authentication();

select tests.authenticate_as('owner');
select throws_ok(
  $$ select public.ingest_shopify_refund('wh-forged-2', 'refunds/create', 'ev', '{}') $$,
  '42501', null, 'not even an owner can feed in webhooks from a client'
);
select isnt_empty(
  $$ select 1 from public.shopify_webhook_events where status = 'flagged' $$,
  'an owner can see which deliveries were flagged'
);
select tests.clear_authentication();

select is_empty(
  $$ select p.proname::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('ingest_shopify_order', 'ingest_shopify_refund', 'pos_lookup_member',
                         'pos_rewards', 'link_shopify_customer', 'reserve_reward_for_pos',
                         'attach_reward_discount', 'expire_stale_redemptions')
       and (has_function_privilege('authenticated', p.oid, 'execute')
            or has_function_privilege('anon', p.oid, 'execute')
            or not has_function_privilege('service_role', p.oid, 'execute')) $$,
  'all eight Shopify functions are executable by the service role only'
);

select * from finish();
rollback;
