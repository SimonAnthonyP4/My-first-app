import assert from 'node:assert/strict';

import { handlePosMember, membershipCodeFromScan } from '../_shared/handlers/pos_member.ts';
import { handlePosReleaseReward } from '../_shared/handlers/pos_release_reward.ts';
import { handlePosReserveReward } from '../_shared/handlers/pos_reserve_reward.ts';
import { respond } from '../_shared/http.ts';
import { ShopifyError } from '../_shared/shopify_admin.ts';
import { parseMembershipQr } from '../../../packages/contracts/src/membership.ts';
import {
  body,
  createContext,
  CUSTOMER_ID,
  idToken,
  member,
  MEMBERSHIP_CODE,
  NOW,
  posRequest,
  redemption,
  REDEMPTION_ID,
  reward,
  REWARD_ID,
  SHOPIFY_CUSTOMER_ID,
  SHOPIFY_USER_ID,
  type TestContext,
} from './fakes.ts';

// ---------------------------------------------------------------------------
// pos-member
// ---------------------------------------------------------------------------

function memberContext(found = member()): TestContext {
  const ctx = createContext();
  ctx.db
    .on('pos_lookup_member', () => (found ? [found] : []))
    .on('pos_rewards', () => [
      reward(),
      reward({ id: 'r2', name: 'Free three-pack', points_cost: 750, shopify_collection_id: null }),
      reward({ id: 'r3', name: 'Free six-pack', points_cost: 1400 }),
    ])
    .on('link_shopify_customer', () => ({}));
  return ctx;
}

Deno.test(
  'member: a scanned QR code returns the member, their points and the rewards',
  async () => {
    const ctx = memberContext();
    const response = await respond(
      handlePosMember,
      await posRequest({ membership_code: `brobatch:member:${MEMBERSHIP_CODE}` }),
      ctx.deps,
    );
    assert.equal(response.status, 200);
    const result = await body(response);
    assert.deepEqual(result.member, {
      customer_id: CUSTOMER_ID,
      full_name: 'Mia Member',
      points_balance: 1000,
      shopify_customer_id: SHOPIFY_CUSTOMER_ID,
    });
    assert.equal(result.points_per_dollar, 10);
    assert.deepEqual(
      result.rewards.map((r: Record<string, unknown>) => [
        r.name,
        r.affordable,
        r.available_at_pos,
      ]),
      [
        ['Free protein bar', true, true],
        ['Free three-pack', true, false],
        ['Free six-pack', false, true],
      ],
    );
    assert.deepEqual(ctx.db.called('pos_lookup_member')[0]!.args, {
      p_membership_code: MEMBERSHIP_CODE,
      p_shopify_customer_id: null,
      p_customer_id: null,
    });
    assert.equal(ctx.shopify.calls.length, 0, 'an already linked member needs no Shopify call');
  },
);

Deno.test("member: the response never contains the member's email or phone", async () => {
  const ctx = memberContext();
  const response = await respond(
    handlePosMember,
    await posRequest({ membership_code: MEMBERSHIP_CODE }),
    ctx.deps,
  );
  const text = JSON.stringify(await body(response));
  assert.equal(text.includes('mia@example.com'), false);
  assert.equal(text.includes('email'), false);
});

Deno.test(
  'member: a first-time member is matched to their Shopify customer by email and linked',
  async () => {
    const ctx = memberContext(member({ shopify_customer_id: null }));
    const response = await respond(
      handlePosMember,
      await posRequest({ membership_code: MEMBERSHIP_CODE }),
      ctx.deps,
    );
    assert.equal(response.status, 200);
    assert.equal((await body(response)).member.shopify_customer_id, SHOPIFY_CUSTOMER_ID);
    assert.deepEqual(ctx.shopify.called('findCustomerIdByEmail')[0]!.params, 'mia@example.com');
    assert.equal(ctx.shopify.called('createCustomer').length, 0);
    assert.deepEqual(ctx.db.called('link_shopify_customer')[0]!.args, {
      p_customer_id: CUSTOMER_ID,
      p_shopify_customer_id: SHOPIFY_CUSTOMER_ID,
    });
  },
);

Deno.test('member: if Shopify has no such customer, one is created and linked', async () => {
  const ctx = memberContext(member({ shopify_customer_id: null }));
  ctx.shopify.customerIdByEmail = null;
  const response = await respond(
    handlePosMember,
    await posRequest({ membership_code: MEMBERSHIP_CODE }),
    ctx.deps,
  );
  assert.equal(response.status, 200);
  assert.deepEqual(ctx.shopify.called('createCustomer')[0]!.params, {
    email: 'mia@example.com',
    fullName: 'Mia Member',
  });
  assert.equal(
    ctx.db.called('link_shopify_customer')[0]!.args.p_shopify_customer_id,
    '6000000000000000999',
  );
});

Deno.test('member: can be found by the Shopify customer already on the cart', async () => {
  const ctx = memberContext();
  await respond(
    handlePosMember,
    await posRequest({ shopify_customer_id: 6000000000000 }),
    ctx.deps,
  );
  assert.deepEqual(ctx.db.called('pos_lookup_member')[0]!.args, {
    p_membership_code: null,
    p_shopify_customer_id: '6000000000000',
    p_customer_id: null,
  });
});

Deno.test(
  'member: an unknown or malformed code is "not a member", and Shopify is not called',
  async () => {
    for (const code of [MEMBERSHIP_CODE, 'https://example.com/some-other-qr', "x' or 1=1 --"]) {
      const ctx = memberContext();
      ctx.db.on('pos_lookup_member', () => []);
      const response = await respond(
        handlePosMember,
        await posRequest({ membership_code: code }),
        ctx.deps,
      );
      assert.equal(response.status, 404, code);
      assert.equal((await body(response)).error.code, 'not_a_member');
      assert.equal(ctx.shopify.calls.length, 0);
    }
  },
);

Deno.test('member: requests that are not from our Shopify POS are refused', async () => {
  const cases: (string | null)[] = [
    null,
    'not-a-token',
    await idToken({}, { secret: 'shpss_attacker_guess' }),
    await idToken({ exp: NOW - 3600 }),
    await idToken({ aud: 'another-app' }),
    await idToken({ iss: 'https://evil.myshopify.com/admin', dest: 'https://evil.myshopify.com' }),
  ];
  for (const token of cases) {
    const ctx = memberContext();
    const response = await respond(
      handlePosMember,
      await posRequest({ membership_code: MEMBERSHIP_CODE }, token),
      ctx.deps,
    );
    assert.equal(response.status, 401);
    assert.equal(ctx.db.calls.length, 0, 'nothing is looked up');
    assert.equal(ctx.shopify.calls.length, 0);
  }
});

Deno.test('member: the body must name exactly one way to find the member', async () => {
  for (const bad of [
    {},
    { membership_code: MEMBERSHIP_CODE, shopify_customer_id: 1 },
    { email: 'mia@example.com' },
    { shopify_customer_id: -1 },
  ]) {
    const ctx = memberContext();
    const response = await respond(handlePosMember, await posRequest(bad), ctx.deps);
    assert.equal(response.status, 400, JSON.stringify(bad));
    assert.equal(ctx.db.calls.length, 0);
  }
});

Deno.test(
  'member: if Shopify is down while linking, the till is told to retry and nothing is linked',
  async () => {
    const ctx = memberContext(member({ shopify_customer_id: null }));
    ctx.shopify.errors.set(
      'findCustomerIdByEmail',
      new ShopifyError(0, 'network', 'Could not reach Shopify.'),
    );
    const response = await respond(
      handlePosMember,
      await posRequest({ membership_code: MEMBERSHIP_CODE }),
      ctx.deps,
    );
    assert.equal(response.status, 502);
    assert.equal((await body(response)).error.code, 'shopify_unavailable');
    assert.equal(ctx.db.called('link_shopify_customer').length, 0);
  },
);

Deno.test('member: the scan parser agrees with the shared contracts package', () => {
  for (const scanned of [
    MEMBERSHIP_CODE,
    `brobatch:member:${MEMBERSHIP_CODE}`,
    `  BROBATCH:MEMBER:${MEMBERSHIP_CODE.toUpperCase()}\n`,
    'https://example.com/',
    'brobatch:member:xyz',
    `${MEMBERSHIP_CODE}0`,
    '',
  ]) {
    assert.equal(
      membershipCodeFromScan(scanned),
      parseMembershipQr(scanned),
      JSON.stringify(scanned),
    );
  }
});

// ---------------------------------------------------------------------------
// pos-reserve-reward
// ---------------------------------------------------------------------------

const RESERVE = {
  customer_id: CUSTOMER_ID,
  reward_id: REWARD_ID,
  idempotency_key: 'pos-apply-0001',
  variant_id: 111,
};

function reserveContext(): TestContext {
  const ctx = createContext();
  ctx.db
    .on('pos_lookup_member', () => [member()])
    .on('pos_rewards', () => [reward()])
    .on('reserve_reward_for_pos', () => redemption())
    .on('attach_reward_discount', () =>
      redemption({ shopify_discount_id: 'gid://shopify/DiscountCodeNode/555' }),
    )
    .on('release_redemption', () => redemption({ status: 'released' }));
  return ctx;
}

const reserve = async (ctx: TestContext, request: unknown = RESERVE, token?: string | null) =>
  respond(handlePosReserveReward, await posRequest(request, token), ctx.deps);

Deno.test(
  'reserve: prices the reward from Shopify, debits the points, then creates the code',
  async () => {
    const ctx = reserveContext();
    const response = await reserve(ctx);

    assert.equal(response.status, 200);
    const result = await body(response);
    assert.deepEqual(result.redemption, {
      id: REDEMPTION_ID,
      discount_code: 'BB-ABCD-EFGH-JKMN',
      expires_at: '2027-01-15T08:15:00+00:00',
      points_cost: 300,
      discount_cents: 300,
      reward_name: 'Free protein bar',
    });

    assert.deepEqual(ctx.shopify.called('getVariantForReward')[0]!.params, {
      shopifyVariantId: '111',
      shopifyCollectionId: '4000000000001',
    });
    assert.deepEqual(ctx.db.called('reserve_reward_for_pos')[0]!.args, {
      p_customer_id: CUSTOMER_ID,
      p_reward_id: REWARD_ID,
      p_idempotency_key: 'pos-apply-0001',
      p_shopify_variant_id: '111',
      p_discount_cents: 300,
      p_shopify_user_id: SHOPIFY_USER_ID,
    });
    assert.deepEqual(ctx.shopify.called('createRewardDiscount')[0]!.params, {
      code: 'BB-ABCD-EFGH-JKMN',
      title: 'Bro Batch reward: Free protein bar',
      shopifyCustomerId: SHOPIFY_CUSTOMER_ID,
      shopifyVariantId: '111',
      amountCents: 300,
      startsAt: new Date(NOW * 1000).toISOString(),
      endsAt: '2027-01-15T08:15:00+00:00',
    });
    assert.deepEqual(ctx.db.called('attach_reward_discount')[0]!.args, {
      p_redemption_id: REDEMPTION_ID,
      p_shopify_discount_id: 'gid://shopify/DiscountCodeNode/555',
    });

    // Order matters: the points are held before the code exists in Shopify.
    const order = [...ctx.db.calls.map((call) => call.fn)].filter((fn) =>
      ['reserve_reward_for_pos', 'attach_reward_discount'].includes(fn),
    );
    assert.deepEqual(order, ['reserve_reward_for_pos', 'attach_reward_discount']);
  },
);

Deno.test(
  "reserve: the discount amount comes from Shopify's price, times the reward quantity",
  async () => {
    const ctx = reserveContext();
    ctx.shopify.variant = { title: 'Chocolate Bar', priceCents: 325, inCollection: true };
    ctx.db.on('pos_rewards', () => [reward({ quantity: 2 })]);
    await reserve(ctx);
    assert.equal(ctx.db.called('reserve_reward_for_pos')[0]!.args.p_discount_cents, 650);
    assert.equal(
      (ctx.shopify.called('createRewardDiscount')[0]!.params as { amountCents: number })
        .amountCents,
      650,
    );
  },
);

Deno.test('reserve: an amount, price or points value sent by the till is rejected', async () => {
  for (const extra of [
    { discount_cents: 99999 },
    { amount: '100.00' },
    { points_cost: 1 },
    { shopify_customer_id: 1 },
  ]) {
    const ctx = reserveContext();
    const response = await reserve(ctx, { ...RESERVE, ...extra });
    assert.equal(response.status, 400, JSON.stringify(extra));
    assert.equal(ctx.db.calls.length, 0);
    assert.equal(ctx.shopify.calls.length, 0);
  }
});

Deno.test(
  "reserve: a product outside the reward's collection is refused before any points move",
  async () => {
    const ctx = reserveContext();
    ctx.shopify.variant = { title: 'Variety Six-Pack', priceCents: 1600, inCollection: false };
    const response = await reserve(ctx);
    assert.equal(response.status, 422);
    const result = await body(response);
    assert.equal(result.error.code, 'reward_not_applicable');
    assert.equal(result.error.message, '"Free protein bar" cannot be used on Variety Six-Pack.');
    assert.equal(ctx.db.called('reserve_reward_for_pos').length, 0);
    assert.equal(ctx.shopify.called('createRewardDiscount').length, 0);
  },
);

Deno.test(
  'reserve: an unknown product, a free product, a retired reward and an unconfigured reward are refused',
  async () => {
    const unknown = reserveContext();
    unknown.shopify.variant = null;
    assert.equal((await reserve(unknown)).status, 422);

    const free = reserveContext();
    free.shopify.variant = { title: 'Sample', priceCents: 0, inCollection: true };
    assert.equal((await reserve(free)).status, 422);

    const retired = reserveContext();
    retired.db.on('pos_rewards', () => [reward({ is_live: false })]);
    assert.equal((await reserve(retired)).status, 409);

    const unconfigured = reserveContext();
    unconfigured.db.on('pos_rewards', () => [reward({ shopify_collection_id: null })]);
    const response = await reserve(unconfigured);
    assert.equal(response.status, 409);
    assert.equal((await body(response)).error.code, 'not_available');

    for (const ctx of [unknown, free, retired, unconfigured]) {
      assert.equal(ctx.db.called('reserve_reward_for_pos').length, 0);
    }
  },
);

Deno.test('reserve: not enough points is reported clearly and no code is created', async () => {
  const ctx = reserveContext();
  ctx.db.fail(
    'reserve_reward_for_pos',
    'BB001',
    'insufficient points: balance is 299, reward costs 300',
  );
  const response = await reserve(ctx);
  assert.equal(response.status, 409);
  assert.equal((await body(response)).error.code, 'insufficient_points');
  assert.equal(ctx.shopify.called('createRewardDiscount').length, 0);
});

Deno.test(
  'reserve: if Shopify cannot create the code, the points are given straight back',
  async () => {
    const ctx = reserveContext();
    ctx.shopify.errors.set(
      'createRewardDiscount',
      new ShopifyError(503, 'http', 'Shopify answered 503.'),
    );
    const response = await reserve(ctx);
    assert.equal(response.status, 502);
    assert.deepEqual(ctx.db.called('release_redemption')[0]!.args, {
      p_redemption_id: REDEMPTION_ID,
      p_expired: false,
    });
    assert.equal(ctx.db.called('attach_reward_discount').length, 0);
  },
);

Deno.test('reserve: a retry after the code was created does not create a second one', async () => {
  const ctx = reserveContext();
  ctx.db.on('reserve_reward_for_pos', () =>
    redemption({ shopify_discount_id: 'gid://shopify/DiscountCodeNode/555' }),
  );
  const response = await reserve(ctx);
  assert.equal(response.status, 200);
  assert.equal((await body(response)).redemption.discount_code, 'BB-ABCD-EFGH-JKMN');
  assert.equal(ctx.shopify.called('createRewardDiscount').length, 0);
});

Deno.test(
  'reserve: a retry of an attempt that was already used or cancelled is refused',
  async () => {
    for (const status of ['fulfilled', 'released', 'expired']) {
      const ctx = reserveContext();
      ctx.db.on('reserve_reward_for_pos', () => redemption({ status }));
      const response = await reserve(ctx);
      assert.equal(response.status, 409, status);
      assert.equal(ctx.shopify.called('createRewardDiscount').length, 0);
    }
  },
);

Deno.test(
  'reserve: a member who has not been scanned (not linked) cannot be given a code',
  async () => {
    const ctx = reserveContext();
    ctx.db.on('pos_lookup_member', () => [member({ shopify_customer_id: null })]);
    const response = await reserve(ctx);
    assert.equal(response.status, 409);
    assert.equal(ctx.db.called('reserve_reward_for_pos').length, 0);
  },
);

Deno.test('reserve: requires a valid Shopify POS session', async () => {
  const ctx = reserveContext();
  assert.equal((await reserve(ctx, RESERVE, null)).status, 401);
  assert.equal((await reserve(ctx, RESERVE, await idToken({}, { secret: 'wrong' }))).status, 401);
  assert.equal(ctx.db.calls.length, 0);
  assert.equal(ctx.shopify.calls.length, 0);
});

Deno.test(
  'reserve: variant ids are accepted as numbers or digit strings and kept exact',
  async () => {
    const ctx = reserveContext();
    await reserve(ctx, { ...RESERVE, variant_id: '9007199254740993' });
    assert.equal(
      ctx.db.called('reserve_reward_for_pos')[0]!.args.p_shopify_variant_id,
      '9007199254740993',
    );
    for (const bad of ['abc', '-1', '1.5', 0, '']) {
      const refused = reserveContext();
      assert.equal(
        (await reserve(refused, { ...RESERVE, variant_id: bad })).status,
        400,
        String(bad),
      );
    }
  },
);

// ---------------------------------------------------------------------------
// pos-release-reward
// ---------------------------------------------------------------------------

function releaseContext(
  existing = redemption({ shopify_discount_id: 'gid://shopify/DiscountCodeNode/555' }),
): TestContext {
  const ctx = createContext();
  ctx.db.redemption = existing;
  ctx.db
    .on('release_redemption', () => redemption({ status: 'released' }))
    .on('pos_lookup_member', () => [member({ points_balance: 1000 })]);
  return ctx;
}

const release = async (ctx: TestContext, token?: string | null) =>
  respond(
    handlePosReleaseReward,
    await posRequest({ redemption_id: REDEMPTION_ID }, token),
    ctx.deps,
  );

Deno.test('release: the Shopify code is deleted first, then the points are returned', async () => {
  const ctx = releaseContext();
  const response = await release(ctx);
  assert.equal(response.status, 200);
  assert.deepEqual(await body(response), {
    redemption: { id: REDEMPTION_ID, status: 'released' },
    points_balance: 1000,
  });
  assert.deepEqual(
    ctx.shopify.called('deleteDiscount')[0]!.params,
    'gid://shopify/DiscountCodeNode/555',
  );
  assert.deepEqual(ctx.db.called('release_redemption')[0]!.args, {
    p_redemption_id: REDEMPTION_ID,
    p_expired: false,
  });
});

Deno.test('release: if Shopify cannot be reached the points stay held', async () => {
  const ctx = releaseContext();
  ctx.shopify.errors.set(
    'deleteDiscount',
    new ShopifyError(0, 'network', 'Could not reach Shopify.'),
  );
  const response = await release(ctx);
  assert.equal(response.status, 502);
  assert.equal(ctx.db.called('release_redemption').length, 0, 'the code might still be usable');
});

Deno.test('release: a reward already used on a paid order cannot be released', async () => {
  const ctx = releaseContext(
    redemption({ status: 'fulfilled', shopify_discount_id: 'gid://shopify/DiscountCodeNode/555' }),
  );
  ctx.db.fail(
    'release_redemption',
    'BB005',
    'redemption is fulfilled and cannot be released; redeemed points stay spent',
  );
  const response = await release(ctx);
  assert.equal(response.status, 409);
  assert.equal((await body(response)).error.code, 'redemption_final');
  assert.equal(ctx.shopify.called('deleteDiscount').length, 0, 'the used code is left alone');
});

Deno.test('release: an unknown reward is 404; a missing session is 401', async () => {
  const missing = releaseContext();
  missing.db.redemption = null;
  assert.equal((await release(missing)).status, 404);

  const ctx = releaseContext();
  assert.equal((await release(ctx, null)).status, 401);
  assert.equal(ctx.shopify.calls.length, 0);
});
