-- Rewards a member is holding: what the rewards screen is told when it is
-- opened again after a reward was applied.
begin;
set local search_path = public, extensions;

select plan(13);

-- Fixtures ----------------------------------------------------------------------
select tests.create_employee('owner', 'owner');
select tests.create_customer(name) from unnest(array['hal', 'ivy', 'jo']) as t(name);

update public.customers set shopify_customer_id = 6100000000000000001 where id = tests.id('hal');
update public.customers set shopify_customer_id = 6100000000000000002 where id = tests.id('ivy');
update public.customers set shopify_customer_id = 6100000000000000003 where id = tests.id('jo');

select tests.grant_points('hal', 1000);
select tests.grant_points('ivy', 300);
select tests.grant_points('jo', 300);

update public.rewards set shopify_collection_id = 4000000000001 where name = 'Free protein bar';

select tests.authenticate_as_service_role();

-- Nothing held -------------------------------------------------------------------
select is_empty(
  $$ select 1 from public.pos_held_rewards(tests.id('hal')) $$,
  'a member with no reward on hold has nothing listed'
);

-- A code that never reached Shopify ----------------------------------------------
insert into tests.fixtures (name, id)
select 'held_hal', r.id
from public.reserve_reward_for_pos(
  tests.id('hal'), tests.reward('Free protein bar'), 'held-hal-1', 111, 350) r;

select is_empty(
  $$ select 1 from public.pos_held_rewards(tests.id('hal')) $$,
  'a reservation whose discount was never created in Shopify is not listed: the till cannot use it'
);

-- A live hold ---------------------------------------------------------------------
select public.attach_reward_discount(tests.id('held_hal'), 'gid://shopify/DiscountCodeNode/501');

select results_eq(
  $$ select h.id, h.discount_code, h.points_cost, h.discount_cents, h.reward_name,
            h.expires_at between now() + interval '14 minutes' and now() + interval '16 minutes'
     from public.pos_held_rewards(tests.id('hal')) h $$,
  $$ select r.id, r.discount_code, 300::bigint, 350::bigint, 'Free protein bar', true
     from public.redemptions r where r.id = tests.id('held_hal') $$,
  'a held reward is listed with its code, cost, value, name and time limit'
);
select is_empty(
  $$ select 1 from public.pos_held_rewards(tests.id('ivy')) $$,
  'one member''s hold is not listed for another member'
);
select is_empty(
  $$ select 1 from public.pos_held_rewards(null) $$,
  'no member, no holds'
);

-- Newest first ---------------------------------------------------------------------
insert into tests.fixtures (name, id)
select 'held_hal_2', r.id
from public.reserve_reward_for_pos(
  tests.id('hal'), tests.reward('Free protein bar'), 'held-hal-2', 112, 350) r;
select public.attach_reward_discount(tests.id('held_hal_2'), 'gid://shopify/DiscountCodeNode/502');
update public.redemptions set created_at = created_at - interval '1 minute'
  where id = tests.id('held_hal');

select results_eq(
  $$ select id from public.pos_held_rewards(tests.id('hal')) $$,
  $$ values (tests.id('held_hal_2')), (tests.id('held_hal')) $$,
  'two holds are listed newest first'
);

-- Released --------------------------------------------------------------------------
select public.release_redemption(tests.id('held_hal_2'));
select results_eq(
  $$ select id from public.pos_held_rewards(tests.id('hal')) $$,
  $$ values (tests.id('held_hal')) $$,
  'a released reward is no longer listed'
);

-- Past its time limit ----------------------------------------------------------------
insert into tests.fixtures (name, id)
select 'held_ivy', r.id
from public.reserve_reward_for_pos(
  tests.id('ivy'), tests.reward('Free protein bar'), 'held-ivy-1', 111, 350) r;
select public.attach_reward_discount(tests.id('held_ivy'), 'gid://shopify/DiscountCodeNode/503');
select isnt_empty(
  $$ select 1 from public.pos_held_rewards(tests.id('ivy')) $$,
  'a fresh hold is listed'
);
update public.redemptions set expires_at = now() - interval '1 second'
  where id = tests.id('held_ivy');
select is_empty(
  $$ select 1 from public.pos_held_rewards(tests.id('ivy')) $$,
  'a hold past its time limit is not listed, even before the clean-up job has run'
);

-- Used -----------------------------------------------------------------------------
insert into tests.fixtures (name, id)
select 'held_jo', r.id
from public.reserve_reward_for_pos(
  tests.id('jo'), tests.reward('Free protein bar'), 'held-jo-1', 111, 350) r;
select public.attach_reward_discount(tests.id('held_jo'), 'gid://shopify/DiscountCodeNode/504');

select tests.deliver_order('held1', tests.shopify_order(
  9000000000000002001,
  '[{"id": 9100000000000002001, "variant_id": 111, "title": "Chocolate Bar", "price": "3.50", "quantity": 2}]',
  6100000000000000003, 'jo@test.brobatch',
  jsonb_build_array(jsonb_build_object(
    'code', (select discount_code from public.redemptions where id = tests.id('held_jo')),
    'amount', '3.50', 'type', 'fixed_amount'))));
select is(
  (select status::text from public.redemptions where id = tests.id('held_jo')),
  'fulfilled', 'the order that used the code fulfils the reward'
);
select is_empty(
  $$ select 1 from public.pos_held_rewards(tests.id('jo')) $$,
  'a reward that has been used is no longer listed'
);

-- Who may ask -------------------------------------------------------------------------
select tests.authenticate_as('owner');
select throws_ok(
  $$ select * from public.pos_held_rewards(tests.id('hal')) $$,
  '42501', null, 'not even an owner can call it from a client'
);
select tests.authenticate_as('hal');
select throws_ok(
  $$ select * from public.pos_held_rewards(tests.id('hal')) $$,
  '42501', null, 'a member cannot call it for themselves'
);
select tests.clear_authentication();

select * from finish();
rollback;
