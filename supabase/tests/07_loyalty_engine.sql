-- The loyalty engine. Every "Example N" below is the executable form of the
-- same-numbered worked example in docs/LOYALTY.md. If you change one, change
-- the other.
begin;
set local search_path = public, extensions;

select plan(106);

-- Fixtures (created as the test runner) -----------------------------------------
select tests.create_employee('owner', 'owner');
select tests.create_employee('cashier', 'employee');

select tests.create_customer(name)
from unnest(array[
  'alice', 'ron', 'dana', 'rita', 'rex', 'pia', 'remy', 'fay', 'dee', 'tia',
  'fred', 'pat', 'penny', 'cap', 'zed', 'rae', 'sam', 'pen', 'gone'
]) as t(name);

select tests.create_order('o_alice', 'alice', 900);
select tests.create_order('o_alice_pending', 'alice', 900, 'pending');
select tests.create_order('o_ron_9', 'ron', 9);
select tests.create_order('o_ron_99', 'ron', 99);
select tests.create_order('o_ron_1005', 'ron', 1005);
select tests.create_order('o_dana', 'dana', 800, 'paid', 100, 300);
select tests.create_order('o_walkin', null, 900);
select tests.create_order('o_rita_before', 'rita', 900);
select tests.create_order('o_rita_after', 'rita', 900);
select tests.create_order('o_rex', 'rex', 3000);
select tests.create_order('o_pia', 'pia', 2990);
select tests.create_order('o_remy', 'remy', 10000);
select tests.create_order('o_fay', 'fay', 3000);
select tests.create_order('o_fay_pending', 'fay', 500, 'pending');
select tests.create_order('o_dee', 'dee', 3000);
select tests.create_order('o_dee_paid', 'dee', 600);
select tests.create_order('o_tia', 'tia', 10000);
select tests.create_order('o_fred', 'fred', 900);
select tests.create_order('o_pat', 'pat', 900);
select tests.create_order('o_penny', 'penny', 1005);
select tests.create_order('o_cap_a', 'cap', 900);
select tests.create_order('o_cap_b', 'cap', 2500);
select tests.create_order('o_cap_paid', 'cap', 400);
select tests.create_order('o_cap_later', 'cap', 500);
select tests.create_order('o_zed_a', 'zed', 900);
select tests.create_order('o_zed_b', 'zed', 2100);
select tests.create_order('o_zed_paid', 'zed', 400);
select tests.create_order('o_rae', 'rae', 900);
select tests.create_order('o_sam_earn', 'sam', 3000);
select tests.create_order('o_sam_buy', 'sam', 600, 'paid', 0, 300);
select tests.create_order('o_pen', 'pen', 900);
select tests.create_order('o_gone', 'gone', 900);

select tests.create_refund('r_fred', 'o_fred', 900);
select tests.create_refund('r_pat_1', 'o_pat', 300);
select tests.create_refund('r_pat_2', 'o_pat', 600);
select tests.create_refund('r_penny_1', 'o_penny', 335);
select tests.create_refund('r_penny_2', 'o_penny', 335);
select tests.create_refund('r_penny_3', 'o_penny', 335);
select tests.create_refund('r_cap', 'o_cap_a', 900);
select tests.create_refund('r_zed', 'o_zed_a', 900);
select tests.create_refund('r_rae', 'o_rae', 900);
select tests.create_refund('r_sam', 'o_sam_buy', 600);
select tests.create_refund('r_pen', 'o_pen', 900, 'pending');

update public.customers
  set deleted_at = now(), email = null, full_name = 'Deleted customer'
  where id = tests.id('gone');

-- Everything from here runs as the server (service role), like an Edge Function.
select tests.authenticate_as_service_role();

-- ===============================================================================
-- Earning
-- ===============================================================================

-- Example 1 ---------------------------------------------------------------------
select is(
  public.award_points_for_order(tests.id('o_alice'), 'evt_test_alice_1'), 90::bigint,
  'Example 1: a $9.00 purchase earns 90 points'
);
select is(tests.balance('alice'), 90::bigint, 'Example 1: the balance is 90');
select is(
  (select points_awarded from public.orders where id = tests.id('o_alice')), 90::bigint,
  'Example 1: the order records the points it earned'
);

-- Example 2 ---------------------------------------------------------------------
select is(
  public.award_points_for_order(tests.id('o_ron_99')), 9::bigint,
  'Example 2: $0.99 earns 9 points (9.9 rounds down)'
);
select is(
  public.award_points_for_order(tests.id('o_ron_1005')), 100::bigint,
  'Example 2: $10.05 earns 100 points (100.5 rounds down)'
);
select is(
  public.award_points_for_order(tests.id('o_ron_9')), 0::bigint,
  'Example 2: $0.09 earns nothing'
);
select is(
  (select count(*) from public.loyalty_transactions where customer_id = tests.id('ron')), 2::bigint,
  'Example 2: a zero-point purchase writes no ledger row'
);
select is(tests.balance('ron'), 109::bigint, 'Example 2: the balance is 9 + 100 = 109');

-- Example 3 ---------------------------------------------------------------------
select is(
  public.award_points_for_order(tests.id('o_dana')), 80::bigint,
  'Example 3: $12.00 of goods less a $1.00 discount and a $3.00 reward earns on the $8.00 paid'
);

-- Example 4 ---------------------------------------------------------------------
select is(
  public.award_points_for_order(tests.id('o_walkin')), 0::bigint,
  'Example 4: a sale with no customer attached earns nothing'
);
select is(
  public.award_points_for_order(tests.id('o_gone')), 0::bigint,
  'Example 4: an order for a closed account earns nothing'
);

-- Example 5 ---------------------------------------------------------------------
select is(
  (select array_agg(public.award_points_for_order(tests.id('o_alice'), 'evt_test_alice_1'))
   from generate_series(1, 5)),
  array[90, 90, 90, 90, 90]::bigint[],
  'Example 5: replaying the same payment event five times returns 90 each time'
);
select is(
  public.award_points_for_order(tests.id('o_alice'), 'evt_test_alice_other'), 90::bigint,
  'Example 5: a different event for the same order also returns 90'
);
select is(
  (select count(*) from public.loyalty_transactions
   where order_id = tests.id('o_alice') and kind = 'earn'),
  1::bigint,
  'Example 5: there is still exactly one earn row for the order'
);
select is(tests.balance('alice'), 90::bigint, 'Example 5: the balance is still 90');

-- Example 6 ---------------------------------------------------------------------
select throws_ok(
  $$ select public.award_points_for_order(tests.id('o_alice_pending')) $$,
  'BB002', null,
  'Example 6: an unpaid order cannot earn points'
);
select throws_ok(
  $$ select public.award_points_for_order(gen_random_uuid()) $$,
  'BB006', null,
  'Example 6: an unknown order is an error, not a silent zero'
);
select is(tests.balance('alice'), 90::bigint, 'Example 6: nothing was awarded');

-- Example 7 ---------------------------------------------------------------------
select is(
  public.award_points_for_order(tests.id('o_rita_before')), 90::bigint,
  'Example 7: at 10 points per dollar, $9.00 earns 90'
);
update public.app_settings set points_per_dollar = 20;
select is(
  public.award_points_for_order(tests.id('o_rita_after')), 180::bigint,
  'Example 7: after the owner doubles the rate, $9.00 earns 180'
);
select is(
  public.award_points_for_order(tests.id('o_rita_before')), 90::bigint,
  'Example 7: the earlier order keeps the 90 it earned'
);
select is(tests.balance('rita'), 270::bigint, 'Example 7: the balance is 90 + 180 = 270');
update public.app_settings set points_per_dollar = 10;

-- ===============================================================================
-- Redeeming
-- ===============================================================================

-- Example 8 ---------------------------------------------------------------------
select public.award_points_for_order(tests.id('o_rex'));
select is(tests.balance('rex'), 300::bigint, 'Example 8: Rex starts with 300 points');
select results_eq(
  $$ select status::text, points_cost
     from public.redeem_points(tests.id('rex'), tests.reward('Free protein bar'), 'test-key-rex-1') $$,
  $$ values ('reserved', 300::bigint) $$,
  'Example 8: redeeming a free bar reserves it at a cost of 300'
);
select is(tests.balance('rex'), 0::bigint, 'Example 8: the 300 points are debited immediately');
select results_eq(
  $$ select kind, points, balance_after from public.loyalty_transactions
     where customer_id = tests.id('rex') order by created_at, points desc $$,
  $$ values ('earn', 300::bigint, 300::bigint), ('redeem', -300::bigint, 0::bigint) $$,
  'Example 8: the ledger shows the earn and the redemption with running balances'
);

-- Example 9 ---------------------------------------------------------------------
select public.award_points_for_order(tests.id('o_pia'));
select is(tests.balance('pia'), 299::bigint, 'Example 9: Pia has 299 points');
select throws_ok(
  $$ select public.redeem_points(tests.id('pia'), tests.reward('Free protein bar'), 'test-key-pia-1') $$,
  'BB001', null,
  'Example 9: one point short of a 300-point reward is refused'
);
select is(tests.balance('pia'), 299::bigint, 'Example 9: the balance is untouched');
select is(
  (select count(*) from public.redemptions where customer_id = tests.id('pia')), 0::bigint,
  'Example 9: no redemption was created'
);

-- Example 10 --------------------------------------------------------------------
select public.award_points_for_order(tests.id('o_remy'));
select is(
  (select count(distinct r.id)
   from generate_series(1, 5),
        lateral public.redeem_points(tests.id('remy'), tests.reward('Free protein bar'), 'test-key-remy-1') r),
  1::bigint,
  'Example 10: five attempts with the same key return the same redemption'
);
select is(tests.balance('remy'), 700::bigint, 'Example 10: 1,000 - 300 once = 700');
select throws_ok(
  $$ select public.redeem_points(tests.id('remy'), tests.reward('Free three-pack'), 'test-key-remy-1') $$,
  'BB003', null,
  'Example 10: reusing the key for a different reward is refused'
);
select throws_ok(
  $$ select public.redeem_points(tests.id('rex'), tests.reward('Free protein bar'), 'test-key-remy-1') $$,
  'BB003', null,
  'Example 10: reusing the key for a different customer is refused'
);
select lives_ok(
  $$ select public.redeem_points(tests.id('remy'), tests.reward('Free protein bar'), 'test-key-remy-2') $$,
  'Example 10: a new key is a new redemption'
);
select is(tests.balance('remy'), 400::bigint, 'Example 10: 700 - 300 = 400');
select throws_ok(
  $$ select public.redeem_points(tests.id('remy'), tests.reward('Free protein bar'), 'short') $$,
  '22023', null,
  'Example 10: a missing or too-short key is refused'
);

-- Example 11 --------------------------------------------------------------------
select public.award_points_for_order(tests.id('o_fay'));
insert into tests.fixtures (name, id)
select 'red_fay', r.id
from public.redeem_points(
  tests.id('fay'), tests.reward('Free protein bar'), 'test-key-fay-1', tests.id('o_fay_pending')
) r;
select is(tests.balance('fay'), 0::bigint, 'Example 11: the reward is reserved for the open order');
select is(
  (select status::text from public.release_redemption(tests.id('red_fay'))), 'released',
  'Example 11: when the payment fails the reservation is released'
);
select is(tests.balance('fay'), 300::bigint, 'Example 11: the 300 points are back');
select is(
  (select status::text from public.release_redemption(tests.id('red_fay'))), 'released',
  'Example 11: releasing again changes nothing'
);
select is(tests.balance('fay'), 300::bigint, 'Example 11: the points are returned only once');
select throws_ok(
  $$ select public.fulfill_redemption(tests.id('red_fay'), tests.id('o_fay')) $$,
  'BB005', null,
  'Example 11: a released reservation cannot be fulfilled afterwards'
);

-- Example 12 --------------------------------------------------------------------
select public.award_points_for_order(tests.id('o_dee'));
insert into tests.fixtures (name, id)
select 'red_dee', r.id
from public.redeem_points(tests.id('dee'), tests.reward('Free protein bar'), 'test-key-dee-1') r;
select results_eq(
  $$ select status::text, order_id, fulfilled_at is not null
     from public.fulfill_redemption(tests.id('red_dee'), tests.id('o_dee_paid')) $$,
  $$ select 'fulfilled', tests.id('o_dee_paid'), true $$,
  'Example 12: once the order is paid the reservation is fulfilled'
);
select is(
  (select status::text from public.fulfill_redemption(tests.id('red_dee'), tests.id('o_dee_paid'))),
  'fulfilled',
  'Example 12: fulfilling again changes nothing'
);
select throws_ok(
  $$ select public.release_redemption(tests.id('red_dee')) $$,
  'BB005', null,
  'Example 12: a fulfilled reward cannot be released: redeemed points stay spent'
);
select throws_ok(
  $$ update public.redemptions set status = 'reserved', fulfilled_at = null
     where id = tests.id('red_dee') $$,
  'BB005', null,
  'Example 12: not even the server can flip a fulfilled redemption back'
);
select is(tests.balance('dee'), 0::bigint, 'Example 12: the balance stays at 0');
select throws_ok(
  $$ select public.fulfill_redemption(tests.id('red_fay'), tests.id('o_dee_paid')) $$,
  'BB005', null,
  'Example 12: a reservation cannot be fulfilled twice or on the wrong state'
);

-- A reward can only be fulfilled on a paid order that belongs to the same customer.
insert into tests.fixtures (name, id)
select 'red_fay_2', r.id
from public.redeem_points(tests.id('fay'), tests.reward('Free protein bar'), 'test-key-fay-2') r;
select throws_ok(
  $$ select public.fulfill_redemption(tests.id('red_fay_2'), tests.id('o_fay_pending')) $$,
  'BB002', null,
  'Example 12: a reward cannot be fulfilled on an order that is not paid'
);
select throws_ok(
  $$ select public.fulfill_redemption(tests.id('red_fay_2'), tests.id('o_dee_paid')) $$,
  'BB002', null,
  'Example 12: a reward cannot be fulfilled on another customer''s order'
);
select public.release_redemption(tests.id('red_fay_2'));

insert into tests.fixtures (name, id)
select 'red_fay_3', r.id
from public.redeem_points(
  tests.id('fay'), tests.reward('Free protein bar'), 'test-key-fay-3', tests.id('o_fay_pending')
) r;
select throws_ok(
  $$ select public.fulfill_redemption(tests.id('red_fay_3'), tests.id('o_fay')) $$,
  'BB005', null,
  'Example 12: a reward reserved for one order cannot be fulfilled on a different one'
);
select is(
  (select status::text from public.release_redemption(tests.id('red_fay_3'), true)), 'expired',
  'Example 12: a reservation that times out is released as expired'
);
select is(tests.balance('fay'), 300::bigint, 'Example 12: and its points are returned');
select throws_ok(
  $$ select public.redeem_points(
       tests.id('fay'), tests.reward('Free protein bar'), 'test-key-fay-4', tests.id('o_dee_paid')) $$,
  'BB002', null,
  'Example 12: a reward cannot be reserved against another customer''s order'
);
select throws_ok(
  $$ select public.redeem_points(
       tests.id('fay'), tests.reward('Free protein bar'), 'test-key-fay-5', tests.id('o_fay')) $$,
  'BB002', null,
  'Example 12: a reward cannot be reserved against an order that is already paid'
);

-- Example 13 --------------------------------------------------------------------
select public.award_points_for_order(tests.id('o_tia'));
insert into tests.fixtures (name, id)
select 'red_tia', r.id
from public.redeem_points(tests.id('tia'), tests.reward('Free protein bar'), 'test-key-tia-1') r;
update public.rewards set points_cost = 400 where name = 'Free protein bar';
select is(
  (select points_cost from public.redeem_points(
     tests.id('tia'), tests.reward('Free protein bar'), 'test-key-tia-2')),
  400::bigint,
  'Example 13: after the threshold is raised to 400, a new redemption costs 400'
);
select is(tests.balance('tia'), 300::bigint, 'Example 13: 1,000 - 300 - 400 = 300');
select public.release_redemption(tests.id('red_tia'));
select is(
  tests.balance('tia'), 600::bigint,
  'Example 13: releasing the earlier reservation returns the 300 it cost, not 400'
);
update public.rewards set is_active = false where name = 'Free protein bar';
select throws_ok(
  $$ select public.redeem_points(tests.id('tia'), tests.reward('Free protein bar'), 'test-key-tia-3') $$,
  'BB004', null,
  'Example 13: a retired reward cannot be redeemed'
);
select throws_ok(
  $$ select public.redeem_points(tests.id('tia'), gen_random_uuid(), 'test-key-tia-4') $$,
  'BB004', null,
  'Example 13: an unknown reward cannot be redeemed'
);
update public.rewards set is_active = true, points_cost = 300 where name = 'Free protein bar';
update public.rewards set ends_at = now() - interval '1 minute', starts_at = now() - interval '1 day'
  where name = 'Free three-pack';
select throws_ok(
  $$ select public.redeem_points(tests.id('tia'), tests.reward('Free three-pack'), 'test-key-tia-5') $$,
  'BB004', null,
  'Example 13: a reward whose window has ended cannot be redeemed'
);
update public.rewards set ends_at = null, starts_at = null where name = 'Free three-pack';
select throws_ok(
  $$ select public.redeem_points(tests.id('gone'), tests.reward('Free protein bar'), 'test-key-gone-1') $$,
  'BB004', null,
  'Example 13: a closed account cannot redeem'
);

-- ===============================================================================
-- Refunds
-- ===============================================================================

-- Example 14 --------------------------------------------------------------------
select public.award_points_for_order(tests.id('o_fred'));
select is(
  public.reverse_points_for_refund(tests.id('r_fred'), 'evt_test_fred_refund'), 90::bigint,
  'Example 14: a full refund of a $9.00 order takes back the 90 points it earned'
);
select is(tests.balance('fred'), 0::bigint, 'Example 14: the balance is back to 0');
select results_eq(
  $$ select points_reversed, points_reversal_processed_at is not null
     from public.refunds where id = tests.id('r_fred') $$,
  $$ values (90::bigint, true) $$,
  'Example 14: the refund records what was reversed'
);

-- Example 15 --------------------------------------------------------------------
select public.award_points_for_order(tests.id('o_pat'));
select is(
  public.reverse_points_for_refund(tests.id('r_pat_1')), 30::bigint,
  'Example 15: refunding $3.00 of a $9.00 order takes back 30 of its 90 points'
);
select is(
  public.reverse_points_for_refund(tests.id('r_pat_2')), 60::bigint,
  'Example 15: refunding the remaining $6.00 takes back the other 60'
);
select is(tests.balance('pat'), 0::bigint, 'Example 15: the balance is 0');

select public.award_points_for_order(tests.id('o_penny'));
select is(
  array[
    public.reverse_points_for_refund(tests.id('r_penny_1')),
    public.reverse_points_for_refund(tests.id('r_penny_2')),
    public.reverse_points_for_refund(tests.id('r_penny_3'))
  ],
  array[33, 33, 34]::bigint[],
  'Example 15: three $3.35 refunds of a $10.05 order take back 33 + 33 + 34 = 100, with no rounding loss'
);
select is(tests.balance('penny'), 0::bigint, 'Example 15: exactly the 100 earned points are gone');

-- Example 16 --------------------------------------------------------------------
select public.award_points_for_order(tests.id('o_cap_a'));
select public.award_points_for_order(tests.id('o_cap_b'));
insert into tests.fixtures (name, id)
select 'red_cap', r.id
from public.redeem_points(tests.id('cap'), tests.reward('Free protein bar'), 'test-key-cap-1') r;
select public.fulfill_redemption(tests.id('red_cap'), tests.id('o_cap_paid'));
select is(tests.balance('cap'), 40::bigint, 'Example 16: 90 + 250 earned, 300 spent, 40 left');
select is(
  public.reverse_points_for_refund(tests.id('r_cap')), 40::bigint,
  'Example 16: refunding the 90-point order takes back only the 40 points that remain'
);
select is(tests.balance('cap'), 0::bigint, 'Example 16: the balance stops at 0, never negative');
select matches(
  (select reason from public.loyalty_transactions where refund_id = tests.id('r_cap')),
  'capped at balance: 40 of 90',
  'Example 16: the ledger row says the reversal was capped'
);
select is(
  public.award_points_for_order(tests.id('o_cap_later')), 50::bigint,
  'Example 16: a later $5.00 purchase earns its normal 50 points'
);
select is(
  tests.balance('cap'), 50::bigint,
  'Example 16: the forfeited 50 points are not collected from later earnings'
);

select public.award_points_for_order(tests.id('o_zed_a'));
select public.award_points_for_order(tests.id('o_zed_b'));
insert into tests.fixtures (name, id)
select 'red_zed', r.id
from public.redeem_points(tests.id('zed'), tests.reward('Free protein bar'), 'test-key-zed-1') r;
select public.fulfill_redemption(tests.id('red_zed'), tests.id('o_zed_paid'));
select is(
  public.reverse_points_for_refund(tests.id('r_zed')), 0::bigint,
  'Example 16: with a balance of 0, a refund takes back nothing'
);
select is(
  (select count(*) from public.loyalty_transactions where refund_id = tests.id('r_zed')), 0::bigint,
  'Example 16: and writes no ledger row'
);
select results_eq(
  $$ select points_reversed, points_reversal_processed_at is not null
     from public.refunds where id = tests.id('r_zed') $$,
  $$ values (0::bigint, true) $$,
  'Example 16: the refund is still marked as processed'
);

-- Example 17 --------------------------------------------------------------------
select public.award_points_for_order(tests.id('o_rae'));
select is(
  (select array_agg(public.reverse_points_for_refund(tests.id('r_rae'), 'evt_test_rae_refund'))
   from generate_series(1, 5)),
  array[90, 90, 90, 90, 90]::bigint[],
  'Example 17: replaying the refund event five times returns 90 each time'
);
select is(
  (select count(*) from public.loyalty_transactions where refund_id = tests.id('r_rae')), 1::bigint,
  'Example 17: there is exactly one reversal row'
);
select is(tests.balance('rae'), 0::bigint, 'Example 17: the points were taken back once');
select throws_ok(
  $$ update public.refunds set points_reversed = 0 where id = tests.id('r_rae') $$,
  '23001', null,
  'Example 17: a recorded reversal cannot be altered'
);

-- Example 18 --------------------------------------------------------------------
select public.award_points_for_order(tests.id('o_sam_earn'));
insert into tests.fixtures (name, id)
select 'red_sam', r.id
from public.redeem_points(tests.id('sam'), tests.reward('Free protein bar'), 'test-key-sam-1') r;
select public.fulfill_redemption(tests.id('red_sam'), tests.id('o_sam_buy'));
select is(
  public.award_points_for_order(tests.id('o_sam_buy')), 60::bigint,
  'Example 18: an order with a free bar and $6.00 paid earns 60 points'
);
select is(tests.balance('sam'), 60::bigint, 'Example 18: 300 earned, 300 spent, 60 earned = 60');
select is(
  public.reverse_points_for_refund(tests.id('r_sam')), 60::bigint,
  'Example 18: refunding that order takes back the 60 it earned'
);
select is(
  tests.balance('sam'), 0::bigint,
  'Example 18: the 300 points spent on the reward are not restored'
);
select is(
  (select status::text from public.redemptions where id = tests.id('red_sam')), 'fulfilled',
  'Example 18: the redemption stays fulfilled'
);

-- Example 19 --------------------------------------------------------------------
select public.award_points_for_order(tests.id('o_pen'));
select throws_ok(
  $$ select public.reverse_points_for_refund(tests.id('r_pen')) $$,
  'BB002', null,
  'Example 19: a refund that has not succeeded reverses nothing'
);
select is(tests.balance('pen'), 90::bigint, 'Example 19: the points are untouched');
select throws_ok(
  $$ select public.reverse_points_for_refund(gen_random_uuid()) $$,
  'BB006', null,
  'Example 19: an unknown refund is an error'
);

-- ===============================================================================
-- Guards
-- ===============================================================================

-- Example 20 --------------------------------------------------------------------
select is(
  private.points_for_amount(900, 10), 90::bigint,
  'Example 20: the SQL formula agrees with the brief'
);

-- INSERT ... ON CONFLICT DO NOTHING that skips the row must not move the balance.
insert into public.loyalty_transactions (customer_id, kind, points, order_id, source_event_id)
values (tests.id('alice'), 'earn', 5000, tests.id('o_alice'), 'evt_test_alice_1')
on conflict do nothing;
select is(
  tests.balance('alice'), 90::bigint,
  'Example 20: a skipped duplicate insert leaves the balance alone'
);

select throws_ok(
  $$ insert into public.loyalty_transactions (customer_id, kind, points, reason, created_by)
     values (tests.id('alice'), 'adjust', 10, 'test: first', tests.id('owner')),
            (tests.id('alice'), 'adjust', 10, 'test: second', tests.id('owner')) $$,
  '23001', null,
  'Example 20: two ledger rows for one customer in a single statement are refused'
);
select is(tests.balance('alice'), 90::bigint, 'Example 20: and nothing was applied');

select throws_ok(
  $$ insert into public.redemptions (customer_id, reward_id, points_cost, status, idempotency_key, fulfilled_at)
     values (tests.id('alice'), tests.reward('Free protein bar'), 300, 'fulfilled', 'test-key-direct', now()) $$,
  'BB005', null,
  'Example 20: a redemption cannot be created already fulfilled'
);
select throws_ok(
  $$ update public.redemptions set points_cost = 1 where id = tests.id('red_dee') $$,
  '23001', null,
  'Example 20: the cost of a redemption cannot be changed'
);
select throws_ok(
  $$ delete from public.redemptions where id = tests.id('red_dee') $$,
  '23001', null,
  'Example 20: redemptions cannot be deleted'
);

select tests.clear_authentication();

select is_empty(
  $$ select a.customer_id
     from public.loyalty_accounts a
     left join (
       select customer_id, sum(points) as total
       from public.loyalty_transactions group by customer_id
     ) t on t.customer_id = a.customer_id
     where a.balance <> coalesce(t.total, 0) or a.balance < 0 $$,
  'Example 20: after every example, each balance equals its ledger sum and none is negative'
);

-- Only the server may call the engine.
select tests.authenticate_as('alice');
select throws_ok(
  $$ select public.award_points_for_order(tests.id('o_alice_pending')) $$,
  '42501', null, 'Example 20: a customer cannot award points'
);
select throws_ok(
  $$ select public.redeem_points(tests.id('alice'), tests.reward('Free protein bar'), 'test-key-self') $$,
  '42501', null, 'Example 20: a customer cannot call redeem_points directly'
);
select throws_ok(
  $$ select public.release_redemption(tests.id('red_dee')) $$,
  '42501', null, 'Example 20: a customer cannot release a redemption'
);
select tests.clear_authentication();

select tests.authenticate_as('owner');
select throws_ok(
  $$ select public.award_points_for_order(tests.id('o_alice_pending')) $$,
  '42501', null, 'Example 20: not even an owner can award points from a client'
);
select throws_ok(
  $$ select public.reverse_points_for_refund(tests.id('r_pen')) $$,
  '42501', null, 'Example 20: not even an owner can reverse points from a client'
);
select tests.clear_authentication();

select set_eq(
  $$ select p.proname::text
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('award_points_for_order', 'reverse_points_for_refund', 'redeem_points',
                         'release_redemption', 'fulfill_redemption')
       and has_function_privilege('service_role', p.oid, 'execute')
       and not has_function_privilege('authenticated', p.oid, 'execute')
       and not has_function_privilege('anon', p.oid, 'execute') $$,
  array['award_points_for_order', 'reverse_points_for_refund', 'redeem_points',
        'release_redemption', 'fulfill_redemption'],
  'Example 20: all five engine functions are executable by the service role only'
);

select * from finish();
rollback;
