-- Rewards at the Shopify till: finding the member, issuing a single-use
-- discount code for a reward, fulfilling it when Shopify reports the code
-- used, and returning the points when it is not.
begin;
set local search_path = public, extensions;

select plan(80);

-- Fixtures ----------------------------------------------------------------------
select tests.create_employee('owner', 'owner');
select tests.create_customer(name)
from unnest(array['mia', 'ned', 'pam', 'quin', 'rob', 'sue', 'tom', 'una', 'gone']) as t(name);

update public.customers set shopify_customer_id = 6000000000000000001 where id = tests.id('mia');
update public.customers set shopify_customer_id = 6000000000000000003 where id = tests.id('pam');
update public.customers set shopify_customer_id = 6000000000000000004 where id = tests.id('quin');
update public.customers set shopify_customer_id = 6000000000000000005 where id = tests.id('rob');
update public.customers set shopify_customer_id = 6000000000000000006 where id = tests.id('sue');
update public.customers set shopify_customer_id = 6000000000000000007 where id = tests.id('tom');
update public.customers set deleted_at = now(), email = null where id = tests.id('gone');

select tests.grant_points('mia', 1000);
select tests.grant_points('ned', 500);
select tests.grant_points('pam', 299);
select tests.grant_points('quin', 300);
select tests.grant_points('rob', 300);
select tests.grant_points('sue', 300);
select tests.grant_points('tom', 600);
select tests.grant_points('una', 300);   -- has the points, but is not linked to Shopify

-- The free-bar reward is set up for the till; the others are not yet.
update public.rewards set shopify_collection_id = 4000000000001 where name = 'Free protein bar';

select tests.authenticate_as_service_role();

-- ===============================================================================
-- Finding the member
-- ===============================================================================

select results_eq(
  $$ select customer_id, full_name, email, points_balance, shopify_customer_id
     from public.pos_lookup_member('  ' || upper(tests.membership_code('mia')) || ' ') $$,
  $$ select tests.id('mia'), 'Mia', 'mia@test.brobatch', 1000::bigint, '6000000000000000001' $$,
  'a scanned membership code finds the member, their balance and their Shopify customer'
);
select results_eq(
  $$ select customer_id from public.pos_lookup_member(null, 6000000000000000001) $$,
  $$ select tests.id('mia') $$,
  'a member can also be found by the Shopify customer already on the cart'
);
select is_empty(
  $$ select 1 from public.pos_lookup_member(repeat('f', 32)) $$,
  'an unknown code finds nobody'
);
select is_empty(
  $$ select 1 from public.pos_lookup_member(tests.membership_code('gone')) $$,
  'a closed account is not found'
);
select is_empty(
  $$ select 1 from public.pos_lookup_member(null, null) $$,
  'a lookup with nothing to look up finds nobody'
);
select results_eq(
  $$ select full_name from public.pos_lookup_member(null, null, tests.id('pam')) $$,
  array['Pam'], 'a member can be found by id'
);

-- The rewards the till can offer.
select results_eq(
  $$ select name, points_cost, shopify_collection_id, is_live from public.pos_rewards() $$,
  $$ values ('Free protein bar', 300::bigint, '4000000000001', true),
            ('Free three-pack', 750::bigint, null, true),
            ('Free six-pack', 1400::bigint, null, true) $$,
  'the till sees the live rewards, cheapest first, and which are set up for it'
);
update public.rewards set is_active = false where name = 'Free six-pack';
select is(
  (select count(*) from public.pos_rewards()), 2::bigint, 'a retired reward is not offered'
);
select results_eq(
  $$ select name, is_live from public.pos_rewards(tests.reward('Free six-pack')) $$,
  $$ values ('Free six-pack', false) $$,
  'but can still be looked up by id, marked as not live'
);
update public.rewards set is_active = true where name = 'Free six-pack';

-- Linking a member to their Shopify customer.
select is(
  (select shopify_customer_id from public.link_shopify_customer(tests.id('ned'), 6000000000000000002)),
  6000000000000000002, 'a member is linked to a Shopify customer'
);
select lives_ok(
  $$ select public.link_shopify_customer(tests.id('ned'), 6000000000000000002) $$,
  'linking again to the same Shopify customer changes nothing'
);
select throws_ok(
  $$ select public.link_shopify_customer(tests.id('ned'), 6000000000000000099) $$,
  'BB003', null, 'a linked member cannot be re-linked to a different Shopify customer'
);
select throws_ok(
  $$ select public.link_shopify_customer(tests.id('ned'), 6000000000000000001) $$,
  'BB003', null, 'a Shopify customer cannot be shared by two members'
);
select throws_ok(
  $$ select public.link_shopify_customer(tests.id('gone'), 6000000000000000098) $$,
  'BB006', null, 'a closed account cannot be linked'
);
select throws_ok(
  $$ select public.link_shopify_customer(tests.id('ned'), null) $$,
  '22023', null, 'a Shopify customer id is required'
);

-- ===============================================================================
-- Issuing a reward code
-- ===============================================================================

insert into tests.fixtures (name, id)
select 'red_mia', r.id
from public.reserve_reward_for_pos(
  tests.id('mia'), tests.reward('Free protein bar'), 'pos-reserve-mia-1', 111, 300, 80000000001) r;

select results_eq(
  $$ select status::text, points_cost, discount_cents, shopify_variant_id,
            reserved_by_shopify_user_id, order_id,
            discount_code ~ '^BB-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$',
            expires_at between now() + interval '14 minutes' and now() + interval '16 minutes'
     from public.redemptions where id = tests.id('red_mia') $$,
  $$ values ('reserved', 300::bigint, 300::bigint, 111::bigint, 80000000001, null::uuid, true, true) $$,
  'reserving a free bar issues a code worth $3.00 that is held for 15 minutes'
);
select is(tests.balance('mia'), 700::bigint, 'the 300 points are debited when the code is issued');

select is(
  (select discount_code from public.reserve_reward_for_pos(
     tests.id('mia'), tests.reward('Free protein bar'), 'pos-reserve-mia-1', 111, 300)),
  (select discount_code from public.redemptions where id = tests.id('red_mia')),
  'retrying with the same key returns the same code'
);
select is(tests.balance('mia'), 700::bigint, 'and debits nothing more');
select is(
  (select count(*) from public.redemptions where customer_id = tests.id('mia')), 1::bigint,
  'one redemption exists'
);

select isnt(
  (select discount_code from public.reserve_reward_for_pos(
     tests.id('mia'), tests.reward('Free protein bar'), 'pos-reserve-mia-2', 111, 300)),
  (select discount_code from public.redemptions where id = tests.id('red_mia')),
  'a second reward gets its own code'
);
select is(tests.balance('mia'), 400::bigint, 'and its own debit');

-- The owner changes how long rewards are held.
update public.app_settings set reward_hold_minutes = 5;
select ok(
  (select expires_at between now() + interval '4 minutes' and now() + interval '6 minutes'
   from public.reserve_reward_for_pos(
     tests.id('tom'), tests.reward('Free protein bar'), 'pos-reserve-tom-0', 111, 300)),
  'a new hold uses the current hold time'
);
update public.app_settings set reward_hold_minutes = 15;

-- Refusals.
select throws_ok(
  $$ select public.reserve_reward_for_pos(
       tests.id('pam'), tests.reward('Free protein bar'), 'pos-reserve-pam-1', 111, 300) $$,
  'BB001', null, 'a member one point short cannot reserve the reward'
);
select throws_ok(
  $$ select public.reserve_reward_for_pos(
       tests.id('mia'), tests.reward('Free three-pack'), 'pos-reserve-mia-3', 333, 850) $$,
  'BB004', null, 'a reward with no Shopify collection cannot be used at the till yet'
);
select throws_ok(
  $$ select public.reserve_reward_for_pos(
       tests.id('gone'), tests.reward('Free protein bar'), 'pos-reserve-gone', 111, 300) $$,
  'BB002', null, 'a closed, unlinked account cannot reserve'
);
update public.rewards set is_active = false where name = 'Free protein bar';
select throws_ok(
  $$ select public.reserve_reward_for_pos(
       tests.id('mia'), tests.reward('Free protein bar'), 'pos-reserve-mia-4', 111, 300) $$,
  'BB004', null, 'a retired reward cannot be reserved'
);
update public.rewards set is_active = true where name = 'Free protein bar';
select throws_ok(
  $$ select public.reserve_reward_for_pos(
       tests.id('mia'), tests.reward('Free protein bar'), 'pos-reserve-mia-5', 111, 0) $$,
  '22023', null, 'a reward must be worth something'
);
select throws_ok(
  $$ select public.reserve_reward_for_pos(
       tests.id('mia'), tests.reward('Free protein bar'), 'pos-reserve-mia-6', null, 300) $$,
  '22023', null, 'a reward must name the product it pays for'
);
select is(tests.balance('mia'), 400::bigint, 'none of the refusals touched the balance');
select is(tests.balance('pam'), 299::bigint, 'nor the other member''s');

-- An unlinked member must be linked first.
select throws_ok(
  $$ select public.reserve_reward_for_pos(
       tests.id('una'), tests.reward('Free protein bar'), 'pos-reserve-una', 111, 300) $$,
  'BB002', null, 'a member who is not linked to a Shopify customer cannot reserve yet'
);

-- The Shopify discount that carries the code.
select is(
  (select shopify_discount_id from public.attach_reward_discount(
     tests.id('red_mia'), 'gid://shopify/DiscountCodeNode/123')),
  'gid://shopify/DiscountCodeNode/123', 'the Shopify discount is recorded on the redemption'
);
select lives_ok(
  $$ select public.attach_reward_discount(tests.id('red_mia'), 'gid://shopify/DiscountCodeNode/123') $$,
  'recording it again changes nothing'
);
select throws_ok(
  $$ select public.attach_reward_discount(tests.id('red_mia'), 'gid://shopify/DiscountCodeNode/999') $$,
  'BB003', null, 'a redemption cannot be attached to a second discount'
);
select throws_ok(
  $$ select public.attach_reward_discount(gen_random_uuid(), 'gid://shopify/DiscountCodeNode/1') $$,
  'BB006', null, 'an unknown redemption is an error'
);

-- Codes are hard to guess and do not repeat.
select is(
  (select count(distinct private.new_reward_code()) from generate_series(1, 2000)), 2000::bigint,
  '2,000 generated codes are all different'
);
select is(
  (select count(*) from generate_series(1, 500)
   where private.new_reward_code() !~ '^BB-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$'
      or private.new_reward_code() ~ '[01ILO]'),
  0::bigint,
  'codes use only unambiguous characters (no 0, 1, I, L or O)'
);

-- ===============================================================================
-- The code is used
-- ===============================================================================

-- Mia buys two bars; one is paid for by the reward. Shopify reports the code
-- in lower case, as typed.
select is(
  tests.deliver_order('rw1', tests.shopify_order(
    9000000000000001001,
    '[{"id": 9100000000000001001, "variant_id": 111, "title": "Chocolate Bar", "price": "3.00", "quantity": 2}]',
    6000000000000000001, 'mia@test.brobatch',
    jsonb_build_array(jsonb_build_object(
      'code', lower((select discount_code from public.redemptions where id = tests.id('red_mia'))),
      'amount', '3.00', 'type', 'fixed_amount')))),
  'processed', 'an order that used the reward code is processed'
);
select results_eq(
  $$ select status::text, order_id, fulfilled_at is not null
     from public.redemptions where id = tests.id('red_mia') $$,
  $$ select 'fulfilled', tests.order_for(9000000000000001001), true $$,
  'the reward is fulfilled on that order'
);
select results_eq(
  $$ select subtotal_cents, discount_cents, reward_cents, total_cents, points_reserved, points_awarded
     from public.orders where shopify_order_id = 9000000000000001001 $$,
  $$ values (600::bigint, 0::bigint, 300::bigint, 300::bigint, 300::bigint, 30::bigint) $$,
  'the order records $3.00 as a reward, not a discount, and earns 30 points on the $3.00 paid'
);
select is(tests.balance('mia'), 430::bigint, '400 + 30 earned; the free bar itself earns nothing');

-- A reward alongside an ordinary Shopify discount.
insert into tests.fixtures (name, id)
select 'red_tom', r.id
from public.reserve_reward_for_pos(
  tests.id('tom'), tests.reward('Free protein bar'), 'pos-reserve-tom-1', 111, 300) r;
select is(
  tests.deliver_order('rw2', tests.shopify_order(
    9000000000000001002,
    '[{"id": 9100000000000001002, "variant_id": 111, "title": "Chocolate Bar", "price": "3.00", "quantity": 4}]',
    6000000000000000007, 'tom@test.brobatch',
    jsonb_build_array(
      jsonb_build_object('code', (select discount_code from public.redemptions where id = tests.id('red_tom')), 'amount', '3.00'),
      jsonb_build_object('code', 'STAFF10', 'amount', '0.90')))),
  'processed', 'an order with a reward and an ordinary discount is processed'
);
select results_eq(
  $$ select subtotal_cents, discount_cents, reward_cents, total_cents, points_awarded
     from public.orders where shopify_order_id = 9000000000000001002 $$,
  $$ values (1200::bigint, 90::bigint, 300::bigint, 810::bigint, 81::bigint) $$,
  'the reward and the discount are kept apart, and points are earned on the $8.10 paid'
);

-- Refunding an order that included a reward does not give the reward's points back.
select is(
  tests.deliver_refund('rw1-refund', tests.shopify_refund(
    9200000000000001001, 9000000000000001001,
    '[{"line_item_id": 9100000000000001001, "quantity": 2, "amount": "3.00"}]')),
  'processed', 'the reward order is refunded'
);
select is(
  tests.balance('mia'), 400::bigint,
  'the 30 earned points are taken back; the 300 spent on the reward are not restored'
);
select is(
  (select status::text from public.redemptions where id = tests.id('red_mia')), 'fulfilled',
  'the redemption stays fulfilled'
);

-- A code used on someone else's order is flagged, not honoured.
insert into tests.fixtures (name, id)
select 'red_quin', r.id
from public.reserve_reward_for_pos(
  tests.id('quin'), tests.reward('Free protein bar'), 'pos-reserve-quin-1', 111, 300) r;
select is(
  tests.deliver_order('rw3', tests.shopify_order(
    9000000000000001003,
    '[{"id": 9100000000000001003, "variant_id": 111, "title": "Chocolate Bar", "price": "3.00", "quantity": 2}]',
    6000000000000000003, 'pam@test.brobatch',
    jsonb_build_array(jsonb_build_object(
      'code', (select discount_code from public.redemptions where id = tests.id('red_quin')),
      'amount', '3.00')))),
  'flagged', 'a reward code used on another customer''s order is flagged'
);
select is(
  (select status::text from public.redemptions where id = tests.id('red_quin')), 'reserved',
  'the reward is not fulfilled for the wrong customer'
);
select matches(
  (select note from public.shopify_webhook_events where id = 'wh-rw3'), 'different customer',
  'the log says why'
);
select is(
  (select points_awarded from public.orders where shopify_order_id = 9000000000000001003), 30::bigint,
  'the order is still mirrored and its buyer still earns on what they paid'
);

-- ===============================================================================
-- The code is not used
-- ===============================================================================

insert into tests.fixtures (name, id)
select 'red_rob', r.id
from public.reserve_reward_for_pos(
  tests.id('rob'), tests.reward('Free protein bar'), 'pos-reserve-rob-1', 111, 300) r;
select is(tests.balance('rob'), 0::bigint, 'a reward is held for Rob');

select is(public.expire_stale_redemptions(), 0, 'a hold that has not lapsed is left alone');

update public.redemptions set expires_at = now() - interval '2 minutes' where id = tests.id('red_rob');
select is(
  public.expire_stale_redemptions(), 0,
  'a hold that lapsed two minutes ago is still inside the five-minute grace period'
);
select is(tests.balance('rob'), 0::bigint, 'the points are still held');

update public.redemptions set expires_at = now() - interval '6 minutes' where id = tests.id('red_rob');
select is(public.expire_stale_redemptions(), 1, 'past the grace period, the hold is released');
select is(
  (select status::text from public.redemptions where id = tests.id('red_rob')), 'expired',
  'the redemption is marked expired'
);
select is(tests.balance('rob'), 300::bigint, 'and the 300 points are back');
select is(public.expire_stale_redemptions(), 0, 'running the expiry again releases nothing more');
select is(tests.balance('rob'), 300::bigint, 'and returns nothing more');

-- Fulfilled and already-released rewards are never touched by the expiry.
update public.redemptions set expires_at = now() - interval '1 hour'
  where id = (select id from public.redemptions where idempotency_key = 'pos-reserve-mia-2');
select public.release_redemption((select id from public.redemptions where idempotency_key = 'pos-reserve-mia-2'));
select is(public.expire_stale_redemptions(), 0, 'a released reward is not released again');

-- ===============================================================================
-- The code is used after its hold lapsed
-- ===============================================================================

-- Rob's code expired and his points went back, but the sale had in fact gone
-- through: the webhook was just slow. The reward is paid for again.
select is(
  tests.deliver_order('rw4', tests.shopify_order(
    9000000000000001004,
    '[{"id": 9100000000000001004, "variant_id": 111, "title": "Chocolate Bar", "price": "3.00", "quantity": 2}]',
    6000000000000000005, 'rob@test.brobatch',
    jsonb_build_array(jsonb_build_object(
      'code', (select discount_code from public.redemptions where id = tests.id('red_rob')),
      'amount', '3.00')))),
  'processed', 'an order using a code whose hold had lapsed is processed'
);
select results_eq(
  $$ select status::text, points_cost, order_id, discount_code
     from public.redemptions where replaces_redemption_id = tests.id('red_rob') $$,
  $$ select 'fulfilled', 300::bigint, tests.order_for(9000000000000001004), null::text $$,
  'a replacement redemption is created and fulfilled on the order'
);
select is(
  (select status::text from public.redemptions where id = tests.id('red_rob')), 'expired',
  'the original stays expired'
);
select is(tests.balance('rob'), 30::bigint, '300 returned, 300 taken again, 30 earned on the $3.00 paid');
select is(
  (select points_reserved from public.orders where shopify_order_id = 9000000000000001004), 300::bigint,
  'the order records the 300 points'
);

-- The same, but the member spent the returned points in the meantime.
insert into tests.fixtures (name, id)
select 'red_sue', r.id
from public.reserve_reward_for_pos(
  tests.id('sue'), tests.reward('Free protein bar'), 'pos-reserve-sue-1', 111, 300) r;
update public.redemptions set expires_at = now() - interval '10 minutes' where id = tests.id('red_sue');
select public.expire_stale_redemptions();
select public.reserve_reward_for_pos(
  tests.id('sue'), tests.reward('Free protein bar'), 'pos-reserve-sue-2', 111, 300);
select is(tests.balance('sue'), 0::bigint, 'Sue''s points came back and she spent them on another reward');

select is(
  tests.deliver_order('rw5', tests.shopify_order(
    9000000000000001005,
    '[{"id": 9100000000000001005, "variant_id": 111, "title": "Chocolate Bar", "price": "3.00", "quantity": 2}]',
    6000000000000000006, 'sue@test.brobatch',
    jsonb_build_array(jsonb_build_object(
      'code', (select discount_code from public.redemptions where id = tests.id('red_sue')),
      'amount', '3.00')))),
  'flagged', 'a lapsed code whose points can no longer be taken is flagged for a person'
);
select matches(
  (select note from public.shopify_webhook_events where id = 'wh-rw5'), 'could not be taken again',
  'the log says why'
);
select is(
  (select points_awarded from public.orders where shopify_order_id = 9000000000000001005), 30::bigint,
  'the order is still mirrored and still earns'
);
select is(tests.balance('sue'), 30::bigint, 'the balance never goes negative');

-- The owner can see what was flagged.
select tests.clear_authentication();
select tests.authenticate_as('owner');
select is(
  (select count(*) from public.shopify_webhook_events where status = 'flagged'), 2::bigint,
  'the owner sees both flagged deliveries'
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
  $$ select r.id from public.redemptions r
     where r.status = 'fulfilled'
       and not exists (select 1 from public.loyalty_transactions t
                       where t.redemption_id = r.id and t.kind = 'redeem') $$,
  'every fulfilled reward has its points debit'
);
select is_empty(
  $$ select r.id from public.redemptions r
     where r.status in ('released', 'expired')
       and not exists (select 1 from public.loyalty_transactions t
                       where t.redemption_id = r.id and t.kind = 'reverse_redeem') $$,
  'every released or expired reward has its points returned'
);

select tests.authenticate_as('mia');
select throws_ok(
  $$ select public.reserve_reward_for_pos(
       tests.id('mia'), tests.reward('Free protein bar'), 'pos-reserve-self', 111, 300) $$,
  '42501', null, 'a customer cannot issue themselves a reward code'
);
select throws_ok(
  $$ select * from public.pos_lookup_member(null, 6000000000000000003) $$,
  '42501', null, 'a customer cannot look up other members'
);
select throws_ok(
  $$ select public.link_shopify_customer(tests.id('mia'), 6000000000000000042) $$,
  '42501', null, 'a customer cannot re-link their account'
);
select throws_ok(
  $$ select public.expire_stale_redemptions() $$,
  '42501', null, 'a customer cannot run the expiry'
);
select is(
  (select count(*) from public.redemptions where discount_code is not null), 2::bigint,
  'a customer sees their own redemptions (and their codes) only'
);
select tests.clear_authentication();

select * from finish();
rollback;
