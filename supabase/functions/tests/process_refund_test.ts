import assert from 'node:assert/strict';

import { handleProcessRefund } from '../_shared/handlers/process_refund.ts';
import { respond } from '../_shared/http.ts';
import { StripeError } from '../_shared/stripe.ts';
import {
  body,
  createContext,
  EMPLOYEE_ID,
  ITEM_ID,
  MANAGER_ID,
  MANAGER_TOKEN,
  ORDER_ID,
  post,
  REFUND_ID,
  type TestContext,
} from './fakes.ts';

const REQUEST = {
  order_id: ORDER_ID,
  idempotency_key: 'refund-attempt-0001',
  items: [{ order_item_id: ITEM_ID, quantity: 3 }],
  reason: 'customer_request',
};

function refundRow(overrides: Record<string, unknown> = {}) {
  return {
    id: REFUND_ID,
    order_id: ORDER_ID,
    status: 'pending',
    amount_cents: 900,
    provider_refund_id: null,
    points_reversed: 0,
    ...overrides,
  };
}

function ready(): TestContext {
  const ctx = createContext();
  ctx.db
    .on('request_refund', () => refundRow())
    .on('record_refund_submitted', () => refundRow({ provider_refund_id: 're_test_1' }))
    .on('complete_refund', () =>
      refundRow({ status: 'succeeded', provider_refund_id: 're_test_1', points_reversed: 90 }),
    )
    .on('fail_refund', () => refundRow({ status: 'failed' }));
  return ctx;
}

const run = (ctx: TestContext, req: Request) => respond(handleProcessRefund, req, ctx.deps);

Deno.test(
  'refund: the database prices it, Stripe returns exactly that, then it is completed',
  async () => {
    const ctx = ready();
    const response = await run(ctx, post(REQUEST));

    assert.equal(response.status, 200);
    const result = await body(response);
    assert.equal(result.refund.status, 'succeeded');
    assert.equal(result.refund.points_reversed, 90);

    assert.deepEqual(ctx.db.called('request_refund')[0]!.args, {
      p_order_id: ORDER_ID,
      p_employee_id: EMPLOYEE_ID,
      p_idempotency_key: 'refund-attempt-0001',
      p_items: [{ order_item_id: ITEM_ID, quantity: 3, restock: true }],
      p_reason: 'customer_request',
      p_note: null,
      p_approved_by: null,
    });

    const stripeCall = ctx.stripe.called('createRefund')[0]!;
    assert.deepEqual(stripeCall.params, {
      paymentIntentId: 'pi_test_1',
      amountCents: 900,
      reason: 'requested_by_customer',
      metadata: { refund_id: REFUND_ID, order_id: ORDER_ID },
    });
    assert.equal(stripeCall.idempotencyKey, `refund-${REFUND_ID}`);

    assert.deepEqual(ctx.db.called('complete_refund')[0]!.args, {
      p_refund_id: REFUND_ID,
      p_provider_refund_id: 're_test_1',
      p_amount_cents: 900,
      p_source_event_id: null,
    });
    assert.deepEqual(
      ctx.db.calls.map((call) => call.fn),
      ['request_refund', 'record_refund_submitted', 'complete_refund'],
    );
  },
);

Deno.test('refund: the amount is never taken from the app', async () => {
  for (const extra of [{ amount_cents: 99999 }, { amount: 1 }, { points: 0 }]) {
    const ctx = ready();
    const response = await run(ctx, post({ ...REQUEST, ...extra }));
    assert.equal(response.status, 400, JSON.stringify(extra));
    assert.equal(ctx.db.calls.length, 0);
    assert.equal(ctx.stripe.calls.length, 0);
  }
});

Deno.test('refund: requires a signed-in user', async () => {
  const ctx = ready();
  assert.equal((await run(ctx, post(REQUEST, null))).status, 401);
  assert.equal(ctx.db.calls.length, 0);
});

Deno.test('refund: malformed requests are rejected', async () => {
  for (const bad of [
    { ...REQUEST, items: [] },
    { ...REQUEST, items: [{ order_item_id: ITEM_ID, quantity: 0 }] },
    { ...REQUEST, reason: 'because' },
    { ...REQUEST, order_id: 'nope' },
    { ...REQUEST, idempotency_key: 'x' },
  ]) {
    const ctx = ready();
    assert.equal((await run(ctx, post(bad))).status, 400, JSON.stringify(bad));
    assert.equal(ctx.db.calls.length, 0);
  }
});

Deno.test('refund: reasons map to what Stripe accepts', async () => {
  const expected: Record<string, string | null> = {
    customer_request: 'requested_by_customer',
    duplicate: 'duplicate',
    damaged: null,
    wrong_item: null,
    other: null,
  };
  for (const [reason, stripeReason] of Object.entries(expected)) {
    const ctx = ready();
    await run(ctx, post({ ...REQUEST, reason }));
    const params = ctx.stripe.called('createRefund')[0]!.params as { reason: string | null };
    assert.equal(params.reason, stripeReason, reason);
  }
});

Deno.test('refund: damaged goods are passed through as not restockable', async () => {
  const ctx = ready();
  await run(
    ctx,
    post({
      ...REQUEST,
      reason: 'damaged',
      items: [{ order_item_id: ITEM_ID, quantity: 1, restock: false }],
    }),
  );
  assert.deepEqual(ctx.db.called('request_refund')[0]!.args.p_items, [
    { order_item_id: ITEM_ID, quantity: 1, restock: false },
  ]);
});

Deno.test("refund: a manager approval is verified from the manager's own token", async () => {
  const ctx = ready();
  await run(ctx, post({ ...REQUEST, approver_access_token: MANAGER_TOKEN }));
  assert.equal(ctx.db.called('request_refund')[0]!.args.p_approved_by, MANAGER_ID);
});

Deno.test(
  'refund: a manager id in the body, or a bad manager token, is not an approval',
  async () => {
    const withId = ready();
    assert.equal((await run(withId, post({ ...REQUEST, approved_by: MANAGER_ID }))).status, 400);
    assert.equal(withId.db.calls.length, 0);

    const badToken = ready();
    const response = await run(
      badToken,
      post({ ...REQUEST, approver_access_token: 'invented-token' }),
    );
    assert.equal(response.status, 401);
    assert.equal(badToken.db.calls.length, 0);
  },
);

Deno.test(
  'refund: when approval is required the app is told so, and Stripe is not called',
  async () => {
    const ctx = createContext();
    ctx.db.fail(
      'request_refund',
      'BB008',
      'a refund of 3200 cents needs a manager (limit is 2500 cents)',
    );
    const response = await run(ctx, post(REQUEST));
    assert.equal(response.status, 403);
    assert.equal((await body(response)).error.code, 'approval_required');
    assert.equal(ctx.stripe.calls.length, 0);
  },
);

Deno.test(
  'refund: if Stripe declines, the refund is marked failed and its items are freed',
  async () => {
    const ctx = ready();
    ctx.stripe.errors.set(
      'createRefund',
      new StripeError(
        400,
        'invalid_request_error',
        'charge_already_refunded',
        'Charge already refunded.',
      ),
    );
    const response = await run(ctx, post(REQUEST));
    assert.equal(response.status, 422);
    assert.equal((await body(response)).error.code, 'refund_declined');
    assert.deepEqual(ctx.db.called('fail_refund')[0]!.args, {
      p_refund_id: REFUND_ID,
      p_failure_reason: 'charge_already_refunded',
    });
    assert.equal(ctx.db.called('complete_refund').length, 0);
  },
);

Deno.test(
  'refund: if Stripe is unreachable the refund stays pending and can be retried',
  async () => {
    const ctx = ready();
    ctx.stripe.errors.set(
      'createRefund',
      new StripeError(0, 'network_error', null, 'Could not reach Stripe.'),
    );
    const response = await run(ctx, post(REQUEST));
    assert.equal(response.status, 502);
    assert.equal(
      ctx.db.called('fail_refund').length,
      0,
      'an unknown outcome must not be recorded as failed',
    );
    assert.equal(ctx.db.called('complete_refund').length, 0);

    ctx.stripe.errors.clear();
    const retry = await run(ctx, post(REQUEST));
    assert.equal(retry.status, 200);
    const keys = ctx.stripe.called('createRefund').map((call) => call.idempotencyKey);
    assert.deepEqual(
      keys,
      [`refund-${REFUND_ID}`, `refund-${REFUND_ID}`],
      'Stripe sees one refund, not two',
    );
  },
);

Deno.test(
  'refund: a retry of a refund that already finished does not call Stripe again',
  async () => {
    const ctx = ready();
    ctx.db.on('request_refund', () =>
      refundRow({ status: 'succeeded', provider_refund_id: 're_test_1' }),
    );
    const response = await run(ctx, post(REQUEST));
    assert.equal(response.status, 200);
    assert.equal(ctx.stripe.calls.length, 0);
  },
);

Deno.test('refund: a retry of a refund that failed is refused', async () => {
  const ctx = ready();
  ctx.db.on('request_refund', () => refundRow({ status: 'failed' }));
  const response = await run(ctx, post(REQUEST));
  assert.equal(response.status, 409);
  assert.equal(ctx.stripe.calls.length, 0);
});

Deno.test(
  'refund: a refund still pending at Stripe is left for the webhook to finish',
  async () => {
    const ctx = ready();
    ctx.stripe.refund = { id: 're_test_1', status: 'pending', amount: 900 };
    const response = await run(ctx, post(REQUEST));
    assert.equal(response.status, 200);
    assert.equal((await body(response)).refund.status, 'pending');
    assert.equal(ctx.db.called('record_refund_submitted').length, 1);
    assert.equal(ctx.db.called('complete_refund').length, 0);
  },
);

Deno.test('refund: a refund Stripe reports as failed is recorded as failed', async () => {
  const ctx = ready();
  ctx.stripe.refund = {
    id: 're_test_1',
    status: 'failed',
    amount: 900,
    failure_reason: 'expired_or_canceled_card',
  };
  const response = await run(ctx, post(REQUEST));
  assert.equal(response.status, 422);
  assert.equal(ctx.db.called('fail_refund')[0]!.args.p_failure_reason, 'expired_or_canceled_card');
  assert.equal(ctx.db.called('complete_refund').length, 0);
});

Deno.test('refund: if Stripe refunds a different amount, nothing is completed', async () => {
  const ctx = ready();
  ctx.stripe.refund = { id: 're_test_1', status: 'succeeded', amount: 100 };
  const response = await run(ctx, post(REQUEST));
  assert.equal(response.status, 500);
  assert.equal(ctx.db.called('complete_refund').length, 0);
  assert.equal(
    ctx.logs.some((entry) => entry.message.includes('amount does not match')),
    true,
  );
});
