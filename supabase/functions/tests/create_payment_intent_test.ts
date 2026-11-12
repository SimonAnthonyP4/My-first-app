import assert from 'node:assert/strict';

import { handleCreatePaymentIntent } from '../_shared/handlers/create_payment_intent.ts';
import { respond } from '../_shared/http.ts';
import { StripeError } from '../_shared/stripe.ts';
import {
  body,
  createContext,
  CUSTOMER_ID,
  EMPLOYEE_ID,
  MANAGER_ID,
  MANAGER_TOKEN,
  ORDER_ID,
  post,
  PRODUCT_ID,
  type TestContext,
} from './fakes.ts';

const REQUEST = {
  idempotency_key: 'checkout-attempt-0001',
  items: [{ product_id: PRODUCT_ID, quantity: 3 }],
};

function pendingOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: ORDER_ID,
    order_number: 42,
    status: 'pending',
    subtotal_cents: 900,
    discount_cents: 0,
    reward_cents: 0,
    total_cents: 900,
    points_reserved: 0,
    customer_id: null,
    ...overrides,
  };
}

function ready(order = pendingOrder()): TestContext {
  const ctx = createContext();
  ctx.db.on('create_order', () => order).on('record_payment_intent', () => ({}));
  return ctx;
}

const run = (ctx: TestContext, req: Request) => respond(handleCreatePaymentIntent, req, ctx.deps);

Deno.test(
  'checkout: creates the order, then a PaymentIntent for exactly the order total',
  async () => {
    const ctx = ready();
    const response = await run(ctx, post({ ...REQUEST, customer_id: CUSTOMER_ID }));

    assert.equal(response.status, 200);
    const result = await body(response);
    assert.equal(result.order.id, ORDER_ID);
    assert.deepEqual(result.payment_intent, {
      id: 'pi_test_1',
      client_secret: 'pi_test_1_secret_abc',
    });

    assert.deepEqual(ctx.db.called('create_order')[0]!.args, {
      p_employee_id: EMPLOYEE_ID,
      p_idempotency_key: 'checkout-attempt-0001',
      p_items: [{ product_id: PRODUCT_ID, quantity: 3 }],
      p_customer_id: CUSTOMER_ID,
      p_rewards: [],
      p_discount_cents: 0,
      p_discount_reason: null,
      p_discount_approved_by: null,
    });

    const stripeCall = ctx.stripe.called('createPaymentIntent')[0]!;
    assert.deepEqual(stripeCall.params, {
      amountCents: 900,
      metadata: { order_id: ORDER_ID, order_number: '42', reader_type: 'tap_to_pay' },
    });
    assert.equal(stripeCall.idempotencyKey, `order-${ORDER_ID}`);

    assert.deepEqual(ctx.db.called('record_payment_intent')[0]!.args, {
      p_order_id: ORDER_ID,
      p_payment_intent: 'pi_test_1',
      p_amount_cents: 900,
    });
  },
);

Deno.test(
  'checkout: the employee is taken from the verified token, never from the body',
  async () => {
    const ctx = ready();
    const response = await run(ctx, post({ ...REQUEST, employee_id: MANAGER_ID }));
    assert.equal(response.status, 400, 'an employee_id field is not accepted');
    assert.equal(ctx.db.calls.length, 0);
  },
);

Deno.test('checkout: a client-supplied price or total is rejected, not ignored', async () => {
  for (const extra of [
    { total_cents: 1 },
    { price_cents: 1 },
    { points: 100000 },
    { items: [{ product_id: PRODUCT_ID, quantity: 1, unit_price_cents: 1 }] },
  ]) {
    const ctx = ready();
    const response = await run(ctx, post({ ...REQUEST, ...extra }));
    assert.equal(response.status, 400, JSON.stringify(extra));
    assert.equal(ctx.db.calls.length, 0, 'nothing reached the database');
    assert.equal(ctx.stripe.calls.length, 0, 'nothing reached Stripe');
  }
});

Deno.test('checkout: requires a signed-in user', async () => {
  const ctx = ready();
  assert.equal((await run(ctx, post(REQUEST, null))).status, 401);
  assert.equal((await run(ctx, post(REQUEST, 'expired-or-forged-token'))).status, 401);
  assert.equal(ctx.db.calls.length, 0);
  assert.equal(ctx.stripe.calls.length, 0);
});

Deno.test('checkout: only POST is accepted', async () => {
  const ctx = ready();
  const response = await run(ctx, new Request('http://localhost/fn', { method: 'GET' }));
  assert.equal(response.status, 405);
});

Deno.test('checkout: malformed requests are rejected before any side effect', async () => {
  const cases: unknown[] = [
    {},
    { ...REQUEST, items: [] },
    { ...REQUEST, items: [{ product_id: 'not-a-uuid', quantity: 1 }] },
    { ...REQUEST, items: [{ product_id: PRODUCT_ID, quantity: 0 }] },
    { ...REQUEST, items: [{ product_id: PRODUCT_ID, quantity: 1.5 }] },
    { ...REQUEST, items: [{ product_id: PRODUCT_ID, quantity: -3 }] },
    { ...REQUEST, idempotency_key: 'short' },
    { ...REQUEST, discount_cents: -1 },
    { ...REQUEST, discount_cents: 9.99 },
    { ...REQUEST, reader_type: 'magstripe' },
    '{not json',
  ];
  for (const bad of cases) {
    const ctx = ready();
    const response = await run(ctx, post(bad));
    assert.equal(response.status, 400, JSON.stringify(bad));
    assert.equal((await body(response)).error.code, 'invalid_request');
    assert.equal(ctx.db.calls.length, 0);
  }
});

Deno.test('checkout: an order fully covered by rewards needs no PaymentIntent', async () => {
  const ctx = ready(
    pendingOrder({ status: 'paid', total_cents: 0, reward_cents: 300, subtotal_cents: 300 }),
  );
  const response = await run(ctx, post(REQUEST));
  assert.equal(response.status, 200);
  assert.equal((await body(response)).payment_intent, null);
  assert.equal(ctx.stripe.calls.length, 0);
  assert.equal(ctx.db.called('record_payment_intent').length, 0);
});

Deno.test('checkout: a retry of a cancelled or already-paid checkout is refused', async () => {
  for (const status of ['cancelled', 'paid', 'refunded']) {
    const ctx = ready(pendingOrder({ status }));
    const response = await run(ctx, post(REQUEST));
    assert.equal(response.status, 409, status);
    assert.equal(ctx.stripe.calls.length, 0);
  }
});

Deno.test("checkout: a manager override is verified from the manager's own token", async () => {
  const ctx = ready(pendingOrder({ discount_cents: 100, total_cents: 800 }));
  ctx.stripe.paymentIntent = { ...ctx.stripe.paymentIntent, amount: 800 };
  const response = await run(
    ctx,
    post({
      ...REQUEST,
      discount_cents: 100,
      discount_reason: 'regular',
      approver_access_token: MANAGER_TOKEN,
    }),
  );
  assert.equal(response.status, 200);
  assert.equal(ctx.db.called('create_order')[0]!.args.p_discount_approved_by, MANAGER_ID);
});

Deno.test('checkout: an invalid manager token is refused outright', async () => {
  const ctx = ready();
  const response = await run(
    ctx,
    post({
      ...REQUEST,
      discount_cents: 100,
      discount_reason: 'x',
      approver_access_token: 'made-up-token',
    }),
  );
  assert.equal(response.status, 401);
  assert.equal((await body(response)).error.code, 'approver_unauthenticated');
  assert.equal(ctx.db.calls.length, 0);
});

Deno.test('checkout: a manager id typed into the body is not an approval', async () => {
  const ctx = ready();
  const response = await run(
    ctx,
    post({
      ...REQUEST,
      discount_cents: 100,
      discount_reason: 'x',
      discount_approved_by: MANAGER_ID,
    }),
  );
  assert.equal(response.status, 400);
  assert.equal(ctx.db.calls.length, 0);
});

Deno.test('checkout: database refusals reach the app with a clear code', async () => {
  const cases: [string, number, string][] = [
    ['BB001', 409, 'insufficient_points'],
    ['BB004', 409, 'not_available'],
    ['BB007', 422, 'below_minimum_charge'],
    ['BB008', 403, 'approval_required'],
    ['BB009', 422, 'reward_not_applicable'],
    ['42501', 403, 'forbidden'],
    ['22023', 400, 'invalid_request'],
  ];
  for (const [sqlstate, status, code] of cases) {
    const ctx = createContext();
    ctx.db.fail('create_order', sqlstate, 'a message written for people');
    const response = await run(ctx, post(REQUEST));
    assert.equal(response.status, status, sqlstate);
    const result = await body(response);
    assert.equal(result.error.code, code);
    assert.equal(result.error.message, 'a message written for people');
    assert.equal(ctx.stripe.calls.length, 0, 'Stripe is not called when the order is refused');
  }
});

Deno.test('checkout: an unexpected database error is hidden from the app', async () => {
  const ctx = createContext();
  ctx.db.fail('create_order', '40P01', 'deadlock detected on relation "loyalty_accounts"');
  const response = await run(ctx, post(REQUEST));
  assert.equal(response.status, 500);
  const result = await body(response);
  assert.equal(result.error.code, 'internal_error');
  assert.equal(JSON.stringify(result).includes('loyalty_accounts'), false);
  assert.equal(ctx.logs.length, 1, 'but it is logged');
});

Deno.test(
  'checkout: if Stripe is down the app gets 502 and can retry with the same key',
  async () => {
    const ctx = ready();
    ctx.stripe.errors.set(
      'createPaymentIntent',
      new StripeError(0, 'network_error', null, 'Could not reach Stripe.'),
    );
    const response = await run(ctx, post(REQUEST));
    assert.equal(response.status, 502);
    assert.equal((await body(response)).error.code, 'payment_provider_error');
    assert.equal(ctx.db.called('record_payment_intent').length, 0);

    // The retry: same key -> same order -> same Stripe idempotency key.
    ctx.stripe.errors.clear();
    const retry = await run(ctx, post(REQUEST));
    assert.equal(retry.status, 200);
    const keys = ctx.stripe.called('createPaymentIntent').map((call) => call.idempotencyKey);
    assert.deepEqual(keys, [`order-${ORDER_ID}`, `order-${ORDER_ID}`]);
  },
);

Deno.test(
  'checkout: a PaymentIntent for the wrong amount or currency is never recorded',
  async () => {
    for (const wrong of [{ amount: 100 }, { currency: 'eur' }]) {
      const ctx = ready();
      ctx.stripe.paymentIntent = { ...ctx.stripe.paymentIntent, ...wrong };
      const response = await run(ctx, post(REQUEST));
      assert.equal(response.status, 500, JSON.stringify(wrong));
      assert.equal(ctx.db.called('record_payment_intent').length, 0);
    }
  },
);

Deno.test('checkout: a replayed, already-cancelled PaymentIntent is refused', async () => {
  const ctx = ready();
  ctx.stripe.paymentIntent = { ...ctx.stripe.paymentIntent, status: 'canceled' };
  const response = await run(ctx, post(REQUEST));
  assert.equal(response.status, 409);
  assert.equal(ctx.db.called('record_payment_intent').length, 0);
});

Deno.test('checkout: the response never contains a secret key', async () => {
  const ctx = ready();
  const response = await run(ctx, post(REQUEST));
  const textBody = JSON.stringify(await body(response));
  assert.equal(/sk_(test|live)_|whsec_|service_role/.test(textBody), false);
});
