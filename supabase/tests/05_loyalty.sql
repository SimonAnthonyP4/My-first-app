-- Loyalty: the ledger owns the balance, the balance never goes negative,
-- duplicates are impossible, and customers see only their own points.
-- (How many points to award or reverse is decided by the M2 functions; these
-- tests cover the structure they will run on.)
begin;
set local search_path = public, extensions;

select plan(40);

select tests.create_employee('owner',   'owner');
select tests.create_employee('manager', 'manager');
select tests.create_employee('cashier', 'employee');
select tests.create_customer('alice');
select tests.create_customer('bob');

insert into public.products (id, sku, name, flavor, category, bar_count, price_cents)
values ('00000000-0000-4000-a000-000000000001', 'T-BAR', 'Test Bar', 'Test Vanilla', 'bar', 1, 300);

insert into tests.fixtures (name, id) values
  ('order_1', tests.create_paid_order(
     tests.id('alice'), tests.id('cashier'), '00000000-0000-4000-a000-000000000001', 3)),
  ('order_2', tests.create_paid_order(
     tests.id('alice'), tests.id('cashier'), '00000000-0000-4000-a000-000000000001', 30)),
  ('bob_order', tests.create_paid_order(
     tests.id('bob'), tests.id('cashier'), '00000000-0000-4000-a000-000000000001', 1));

-- Launch configuration ---------------------------------------------------------
select results_eq(
  $$ select name, points_cost, grants_category from public.rewards order by points_cost $$,
  $$ values ('Free protein bar', 300::bigint, 'bar'),
            ('Free three-pack',  750::bigint, 'three_pack'),
            ('Free six-pack',   1400::bigint, 'six_pack') $$,
  'the three launch rewards exist with the agreed thresholds'
);
select is(
  (select points_per_dollar from public.app_settings), 10,
  'the earn rate starts at 10 points per dollar'
);

-- The ledger drives the balance -------------------------------------------------
select tests.authenticate_as_service_role();

select lives_ok(
  $$ insert into public.loyalty_transactions (customer_id, kind, points, order_id, source_event_id)
     values (tests.id('alice'), 'earn', 90, tests.id('order_1'), 'evt_test_earn_1') $$,
  'the server can record an earn'
);
select results_eq(
  $$ select balance, lifetime_earned from public.loyalty_accounts
     where customer_id = tests.id('alice') $$,
  $$ values (90::bigint, 90::bigint) $$,
  'earning 90 points makes the balance 90'
);
select is(
  (select balance_after from public.loyalty_transactions where source_event_id = 'evt_test_earn_1'),
  90::bigint, 'the ledger row records the balance after it was applied'
);

-- Duplicate-event protection.
select throws_ok(
  $$ insert into public.loyalty_transactions (customer_id, kind, points, order_id, source_event_id)
     values (tests.id('alice'), 'earn', 90, tests.id('order_2'), 'evt_test_earn_1') $$,
  '23505', null, 'the same webhook event cannot award points twice'
);
select throws_ok(
  $$ insert into public.loyalty_transactions (customer_id, kind, points, order_id, source_event_id)
     values (tests.id('alice'), 'earn', 90, tests.id('order_1'), 'evt_test_earn_other') $$,
  '23505', null, 'an order cannot earn twice, even under a different event id'
);
select is(
  (select balance from public.loyalty_accounts where customer_id = tests.id('alice')),
  90::bigint, 'rejected duplicates leave the balance untouched'
);

select lives_ok(
  $$ insert into public.loyalty_transactions (customer_id, kind, points, order_id, source_event_id)
     values (tests.id('alice'), 'earn', 900, tests.id('order_2'), 'evt_test_earn_2') $$,
  'a second order earns separately'
);

-- Redemption: reserve a reward, debit the points.
insert into public.redemptions (id, customer_id, reward_id, points_cost, idempotency_key)
select '00000000-0000-4000-e000-000000000001', tests.id('alice'), r.id, r.points_cost, 'test-redeem-1'
from public.rewards r where r.name = 'Free protein bar';

select lives_ok(
  $$ insert into public.loyalty_transactions (customer_id, kind, points, redemption_id)
     values (tests.id('alice'), 'redeem', -300, '00000000-0000-4000-e000-000000000001') $$,
  'the server can debit points for a redemption'
);
select results_eq(
  $$ select balance, lifetime_earned from public.loyalty_accounts
     where customer_id = tests.id('alice') $$,
  $$ values (690::bigint, 990::bigint) $$,
  '90 + 900 - 300 = 690; lifetime earned counts earns only'
);
select throws_ok(
  $$ insert into public.loyalty_transactions (customer_id, kind, points, redemption_id)
     values (tests.id('alice'), 'redeem', -300, '00000000-0000-4000-e000-000000000001') $$,
  '23505', null, 'a redemption cannot be debited twice'
);
select throws_ok(
  $$ insert into public.redemptions (customer_id, reward_id, points_cost, idempotency_key)
     select tests.id('alice'), r.id, r.points_cost, 'test-redeem-1'
     from public.rewards r where r.name = 'Free protein bar' $$,
  '23505', null, 'a redemption idempotency key can be used once'
);

-- Checked while Alice still has points, so the sign rule itself is what rejects it.
select throws_ok(
  $$ insert into public.loyalty_transactions (customer_id, kind, points, order_id)
     values (tests.id('alice'), 'earn', -10, tests.id('order_1')) $$,
  '23514', null, 'an earn must be positive'
);

-- The balance can never go negative.
insert into public.redemptions (id, customer_id, reward_id, points_cost, idempotency_key)
select '00000000-0000-4000-e000-000000000002', tests.id('alice'), r.id, r.points_cost, 'test-redeem-2'
from public.rewards r where r.name = 'Free six-pack';

select throws_ok(
  $$ insert into public.loyalty_transactions (customer_id, kind, points, redemption_id)
     values (tests.id('alice'), 'redeem', -1400, '00000000-0000-4000-e000-000000000002') $$,
  'BB001', null, 'a debit larger than the balance is rejected (690 < 1400)'
);
select is(
  (select balance from public.loyalty_accounts where customer_id = tests.id('alice')),
  690::bigint, 'the rejected debit leaves the balance untouched'
);
select lives_ok(
  $$ insert into public.loyalty_transactions (customer_id, kind, points, reason, created_by)
     values (tests.id('alice'), 'adjust', -690, 'test: drain to zero', tests.id('owner')) $$,
  'the balance can be taken to exactly zero'
);
select throws_ok(
  $$ insert into public.loyalty_transactions (customer_id, kind, points, reason, created_by)
     values (tests.id('alice'), 'adjust', -1, 'test: below zero', tests.id('owner')) $$,
  'BB001', null, 'one point below zero is rejected'
);

-- Shape rules.
select throws_ok(
  $$ insert into public.loyalty_transactions (customer_id, kind, points)
     values (tests.id('bob'), 'earn', 10) $$,
  '23514', null, 'an earn must reference an order'
);
select throws_ok(
  $$ insert into public.loyalty_transactions (customer_id, kind, points, order_id)
     values (tests.id('bob'), 'earn', 0, tests.id('bob_order')) $$,
  '23514', null, 'a zero-point row is rejected'
);
select throws_ok(
  $$ insert into public.loyalty_transactions (customer_id, kind, points)
     values (tests.id('bob'), 'adjust', 50) $$,
  '23514', null, 'a manual adjustment needs a reason and the employee who made it'
);

-- The ledger is append-only and the cache cannot be edited, even by the server.
select throws_ok(
  $$ update public.loyalty_transactions set points = 1000000 $$,
  '23001', null, 'ledger rows cannot be edited'
);
select throws_ok(
  $$ delete from public.loyalty_transactions $$,
  '23001', null, 'ledger rows cannot be deleted'
);
select throws_ok(
  $$ truncate public.loyalty_transactions $$,
  '23001', null, 'the ledger cannot be truncated'
);
select throws_ok(
  $$ update public.loyalty_accounts set balance = 1000000 where customer_id = tests.id('bob') $$,
  '23001', 'loyalty balances change only through loyalty_transactions',
  'not even the service role can set a balance directly'
);
select throws_ok(
  $$ delete from public.loyalty_accounts where customer_id = tests.id('bob') $$,
  '23001', null, 'loyalty accounts cannot be deleted'
);
select tests.clear_authentication();

-- The cached balance equals the ledger sum for every account.
select is_empty(
  $$ select a.customer_id
     from public.loyalty_accounts a
     left join (
       select customer_id, sum(points) as total
       from public.loyalty_transactions group by customer_id
     ) t on t.customer_id = a.customer_id
     where a.balance <> coalesce(t.total, 0) $$,
  'every cached balance equals the sum of its ledger rows'
);

-- Customers: own points only, read-only ---------------------------------------
select tests.authenticate_as('bob');
select is_empty(
  $$ select 1 from public.loyalty_transactions $$,
  'a customer cannot see another customer''s ledger'
);
select results_eq(
  $$ select balance from public.loyalty_accounts $$,
  array[0::bigint],
  'a customer sees only their own balance'
);
select throws_ok(
  $$ insert into public.loyalty_transactions (customer_id, kind, points, reason, created_by)
     values (tests.id('bob'), 'adjust', 100000, 'free points', tests.id('owner')) $$,
  '42501', null, 'a customer cannot write to the ledger'
);
select throws_ok(
  $$ update public.loyalty_accounts set balance = 100000 $$,
  '42501', null, 'a customer cannot edit a balance'
);
select throws_ok(
  $$ insert into public.redemptions (customer_id, reward_id, points_cost, idempotency_key)
     select tests.id('bob'), r.id, 1, 'test-bob-cheap' from public.rewards r limit 1 $$,
  '42501', null, 'a customer cannot create a redemption directly'
);
select is_empty(
  $$ select 1 from public.redemptions $$,
  'a customer cannot see another customer''s redemptions'
);
select is(
  (select count(*) from public.rewards), 3::bigint,
  'customers can browse the live rewards'
);
select lives_ok(
  $$ update public.rewards set points_cost = 1 $$,
  'a customer editing reward costs raises no error...'
);
select tests.clear_authentication();
select is(
  (select min(points_cost) from public.rewards), 300::bigint,
  '...and changes nothing'
);

-- Staff -----------------------------------------------------------------------
select tests.authenticate_as('cashier');
select throws_ok(
  $$ insert into public.loyalty_transactions (customer_id, kind, points, reason, created_by)
     values (tests.id('bob'), 'adjust', 500, 'for my friend', tests.id('cashier')) $$,
  '42501', null, 'a cashier cannot grant points'
);
select tests.clear_authentication();

select tests.authenticate_as('manager');
select lives_ok(
  $$ update public.rewards set points_cost = 350 where name = 'Free protein bar' $$,
  'a manager can change a reward threshold'
);
select lives_ok(
  $$ update public.rewards set is_active = false where name = 'Free six-pack' $$,
  'a manager can retire a reward'
);
select tests.clear_authentication();

select tests.authenticate_as('bob');
select set_eq(
  $$ select name, points_cost from public.rewards $$,
  $$ values ('Free protein bar', 350::bigint), ('Free three-pack', 750::bigint) $$,
  'customers see the new threshold and no longer see the retired reward'
);
select tests.clear_authentication();

select * from finish();
rollback;
