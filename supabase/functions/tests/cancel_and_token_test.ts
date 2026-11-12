import assert from 'node:assert/strict';

import { handleCancelOrder } from '../_shared/handlers/cancel_order.ts';
import { handleConnectionToken } from '../_shared/handlers/connection_token.ts';
import { respond } from '../_shared/http.ts';
import { StripeError } from '../_shared/stripe.ts';
import { body, createContext, EMPLOYEE_ID, EMPLOYEE_TOKEN, ORDER_ID, post } from './fakes.ts';

function unexpectedState(status: string): StripeError {
  return new StripeError(
    400,
    'invalid_request_error',
    'payment_intent_unexpected_state',
    `You cannot cancel this PaymentIntent because it has a status of ${status}.`,
    { id: 'pi_test_1', status },
  );
}

Deno.test('cancel: cancels the PaymentIntent at Stripe first, then the order', async () => {
  const ctx = createContext();
  ctx.db.openPaymentIntents = ['pi_test_1'];
  ctx.db.on('cancel_order', () => ({ id: ORDER_ID, status: 'cancelled' }));

  const response = await respond(handleCancelOrder, post({ order_id: ORDER_ID }), ctx.deps);

  assert.equal(response.status, 200);
  assert.equal((await body(response)).order.status, 'cancelled');
  assert.deepEqual(ctx.stripe.called('cancelPaymentIntent')[0]!.params, 'pi_test_1');
  assert.deepEqual(ctx.db.called('cancel_order')[0]!.args, {
    p_order_id: ORDER_ID,
    p_employee_id: EMPLOYEE_ID,
  });
});

Deno.test('cancel: if the payment already went through, the order is not cancelled', async () => {
  for (const status of ['succeeded', 'processing']) {
    const ctx = createContext();
    ctx.db.openPaymentIntents = ['pi_test_1'];
    ctx.db.on('cancel_order', () => ({ id: ORDER_ID, status: 'cancelled' }));
    ctx.stripe.errors.set('cancelPaymentIntent', unexpectedState(status));

    const response = await respond(handleCancelOrder, post({ order_id: ORDER_ID }), ctx.deps);

    assert.equal(response.status, 409, status);
    assert.equal((await body(response)).error.code, 'already_paid');
    assert.equal(ctx.db.called('cancel_order').length, 0, 'a paid order must never be cancelled');
  }
});

Deno.test('cancel: a PaymentIntent that is already cancelled is fine', async () => {
  const ctx = createContext();
  ctx.db.openPaymentIntents = ['pi_test_1'];
  ctx.db.on('cancel_order', () => ({ id: ORDER_ID, status: 'cancelled' }));
  ctx.stripe.errors.set('cancelPaymentIntent', unexpectedState('canceled'));
  const response = await respond(handleCancelOrder, post({ order_id: ORDER_ID }), ctx.deps);
  assert.equal(response.status, 200);
  assert.equal(ctx.db.called('cancel_order').length, 1);
});

Deno.test('cancel: if Stripe cannot be reached, the order is left as it is', async () => {
  const ctx = createContext();
  ctx.db.openPaymentIntents = ['pi_test_1'];
  ctx.db.on('cancel_order', () => ({ id: ORDER_ID, status: 'cancelled' }));
  ctx.stripe.errors.set('cancelPaymentIntent', new StripeError(0, 'network_error', null, 'x'));
  const response = await respond(handleCancelOrder, post({ order_id: ORDER_ID }), ctx.deps);
  assert.equal(response.status, 502);
  assert.equal(ctx.db.called('cancel_order').length, 0);
});

Deno.test(
  'cancel: an order with no PaymentIntent yet is cancelled without calling Stripe',
  async () => {
    const ctx = createContext();
    ctx.db.on('cancel_order', () => ({ id: ORDER_ID, status: 'cancelled' }));
    const response = await respond(handleCancelOrder, post({ order_id: ORDER_ID }), ctx.deps);
    assert.equal(response.status, 200);
    assert.equal(ctx.stripe.calls.length, 0);
  },
);

Deno.test('cancel: requires sign-in and a valid order id', async () => {
  const ctx = createContext();
  assert.equal(
    (await respond(handleCancelOrder, post({ order_id: ORDER_ID }, null), ctx.deps)).status,
    401,
  );
  assert.equal((await respond(handleCancelOrder, post({ order_id: 'x' }), ctx.deps)).status, 400);
  assert.equal(ctx.db.calls.length, 0);
});

Deno.test('cancel: a paid order reported by the database is passed on as a conflict', async () => {
  const ctx = createContext();
  ctx.db.fail('cancel_order', 'BB002', 'order is paid and cannot be cancelled');
  const response = await respond(handleCancelOrder, post({ order_id: ORDER_ID }), ctx.deps);
  assert.equal(response.status, 409);
});

Deno.test('connection token: an active employee gets a token', async () => {
  const ctx = createContext();
  const response = await respond(handleConnectionToken, post({}), ctx.deps);
  assert.equal(response.status, 200);
  assert.deepEqual(await body(response), { secret: 'pst_test_connection_token' });
});

Deno.test('connection token: a deactivated employee is refused', async () => {
  const ctx = createContext();
  ctx.db.activeEmployees.clear();
  const response = await respond(handleConnectionToken, post({}, EMPLOYEE_TOKEN), ctx.deps);
  assert.equal(response.status, 403);
  assert.equal(ctx.stripe.calls.length, 0, 'no token is requested from Stripe');
});

Deno.test('connection token: a signed-in customer (not an employee) is refused', async () => {
  const ctx = createContext();
  ctx.auth.tokens.set('customer-token', '99999999-9999-4999-8999-999999999999');
  const response = await respond(handleConnectionToken, post({}, 'customer-token'), ctx.deps);
  assert.equal(response.status, 403);
  assert.equal(ctx.stripe.calls.length, 0);
});

Deno.test('connection token: requires sign-in', async () => {
  const ctx = createContext();
  assert.equal((await respond(handleConnectionToken, post({}, null), ctx.deps)).status, 401);
  assert.equal(ctx.stripe.calls.length, 0);
});
