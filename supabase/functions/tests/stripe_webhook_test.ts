import assert from 'node:assert/strict';

import { handleStripeWebhook } from '../_shared/handlers/stripe_webhook.ts';
import { respond } from '../_shared/http.ts';
import { DbError } from '../_shared/errors.ts';
import { StripeError } from '../_shared/stripe.ts';
import { computeSignature } from '../_shared/webhook.ts';
import { body, createContext, NOW, ORDER_ID, REFUND_ID, type TestContext } from './fakes.ts';

const SECRET = ['whsec', 'test', 'fixture', 'secret'].join('_');

async function signedRequest(
  event: unknown,
  options: { secret?: string; timestamp?: number; tamper?: (raw: string) => string } = {},
): Promise<Request> {
  const raw = typeof event === 'string' ? event : JSON.stringify(event);
  const timestamp = options.timestamp ?? NOW;
  const signature = await computeSignature(options.secret ?? SECRET, timestamp, raw);
  return new Request('http://localhost/stripe-webhook', {
    method: 'POST',
    headers: { 'stripe-signature': `t=${timestamp},v1=${signature}` },
    body: options.tamper ? options.tamper(raw) : raw,
  });
}

function paymentSucceeded(overrides: Record<string, unknown> = {}) {
  return {
    id: 'evt_test_paid_1',
    type: 'payment_intent.succeeded',
    created: NOW,
    livemode: false,
    data: {
      object: {
        id: 'pi_test_1',
        object: 'payment_intent',
        status: 'succeeded',
        amount: 900,
        amount_received: 900,
        currency: 'usd',
        latest_charge: 'ch_test_1',
        metadata: { order_id: ORDER_ID, reader_type: 'tap_to_pay' },
        receipt_email: 'someone@example.com',
        ...overrides,
      },
    },
  };
}

function refundEvent(type: string, object: Record<string, unknown> = {}) {
  return {
    id: 'evt_test_refund_1',
    type,
    created: NOW,
    livemode: false,
    data: {
      object: {
        id: 're_test_1',
        object: 'refund',
        status: 'succeeded',
        amount: 900,
        currency: 'usd',
        payment_intent: 'pi_test_1',
        metadata: { refund_id: REFUND_ID, order_id: ORDER_ID },
        ...object,
      },
    },
  };
}

function ready(outcome = 'processed'): TestContext {
  const ctx = createContext();
  ctx.db
    .on('handle_payment_succeeded', () => outcome)
    .on('handle_payment_intent_update', () => outcome)
    .on('handle_refund_update', () => outcome);
  return ctx;
}

const run = (ctx: TestContext, req: Request) =>
  respond(handleStripeWebhook, req, ctx.webhookDeps(SECRET));

Deno.test('webhook: a signed payment confirmation is passed to the database', async () => {
  const ctx = ready();
  const response = await run(ctx, await signedRequest(paymentSucceeded()));

  assert.equal(response.status, 200);
  assert.deepEqual(await body(response), { received: true, outcome: 'processed' });

  const call = ctx.db.called('handle_payment_succeeded')[0]!;
  assert.equal(call.args.p_event_id, 'evt_test_paid_1');
  assert.equal(call.args.p_event_type, 'payment_intent.succeeded');
  assert.equal(call.args.p_payment_intent, 'pi_test_1');
  assert.equal(call.args.p_amount_cents, 900);
  assert.equal(call.args.p_charge_id, 'ch_test_1');
  assert.equal(call.args.p_card_brand, 'visa');
  assert.equal(call.args.p_card_last4, '4242');
  assert.equal(call.args.p_reader_type, 'tap_to_pay');
});

Deno.test(
  'webhook: the amount recorded is what Stripe received, not what was requested',
  async () => {
    const ctx = ready();
    await run(ctx, await signedRequest(paymentSucceeded({ amount: 900, amount_received: 450 })));
    assert.equal(ctx.db.called('handle_payment_succeeded')[0]!.args.p_amount_cents, 450);
  },
);

Deno.test('webhook: the stored event summary leaves out customer details', async () => {
  const ctx = ready();
  await run(ctx, await signedRequest(paymentSucceeded()));
  const stored = JSON.stringify(ctx.db.called('handle_payment_succeeded')[0]!.args.p_payload);
  assert.equal(stored.includes('someone@example.com'), false);
  assert.equal(stored.includes('evt_test_paid_1'), true);
  assert.equal(stored.includes('pi_test_1'), true);
});

Deno.test('webhook: an unsigned request does nothing', async () => {
  const ctx = ready();
  const response = await run(
    ctx,
    new Request('http://localhost/stripe-webhook', {
      method: 'POST',
      body: JSON.stringify(paymentSucceeded()),
    }),
  );
  assert.equal(response.status, 400);
  assert.equal((await body(response)).error.code, 'invalid_signature');
  assert.equal(ctx.db.calls.length, 0);
  assert.equal(ctx.stripe.calls.length, 0);
});

Deno.test('webhook: a forged signature does nothing', async () => {
  const ctx = ready();
  const response = await run(
    ctx,
    await signedRequest(paymentSucceeded(), { secret: 'whsec_attacker_guess' }),
  );
  assert.equal(response.status, 400);
  assert.equal(ctx.db.calls.length, 0);
});

Deno.test('webhook: a body altered after signing does nothing', async () => {
  const ctx = ready();
  const response = await run(
    ctx,
    await signedRequest(paymentSucceeded({ amount_received: 900 }), {
      // Signed for one PaymentIntent, delivered naming another.
      tamper: (raw) => raw.replace('pi_test_1', 'pi_test_2'),
    }),
  );
  assert.equal(response.status, 400);
  assert.equal(ctx.db.calls.length, 0);
});

Deno.test('webhook: a captured delivery replayed later does nothing', async () => {
  const ctx = ready();
  const response = await run(
    ctx,
    await signedRequest(paymentSucceeded(), { timestamp: NOW - 3600 }),
  );
  assert.equal(response.status, 400);
  assert.equal(ctx.db.calls.length, 0);
  assert.equal(ctx.logs[0]?.detail?.reason, 'timestamp_out_of_tolerance');
});

Deno.test('webhook: the rejection log never contains the body or the secret', async () => {
  const ctx = ready();
  await run(ctx, await signedRequest(paymentSucceeded(), { secret: 'whsec_attacker_guess' }));
  const logged = JSON.stringify(ctx.logs);
  assert.equal(logged.includes('pi_test_1'), false);
  assert.equal(logged.includes(SECRET), false);
});

Deno.test('webhook: signed but malformed events are refused', async () => {
  for (const bad of [
    'not json at all',
    {},
    { id: 'evt_x', type: 'payment_intent.succeeded' },
    {
      id: 'not-an-event-id',
      type: 'payment_intent.succeeded',
      livemode: false,
      data: { object: {} },
    },
    {
      id: 'evt_x',
      type: 'payment_intent.succeeded',
      livemode: false,
      data: { object: { amount_received: 900 } },
    },
  ]) {
    const ctx = ready();
    const response = await run(ctx, await signedRequest(bad));
    assert.equal(response.status, 400, JSON.stringify(bad));
    assert.equal(ctx.db.calls.length, 0);
  }
});

Deno.test('webhook: a live-mode event is refused by a test-mode deployment', async () => {
  const ctx = ready();
  const event = { ...paymentSucceeded(), livemode: true };
  const response = await run(ctx, await signedRequest(event));
  assert.equal(response.status, 400);
  assert.equal((await body(response)).error.code, 'mode_mismatch');
  assert.equal(ctx.db.calls.length, 0);
});

Deno.test(
  'webhook: a payment in another currency is passed on as an impossible amount',
  async () => {
    const ctx = ready('failed:amount_mismatch');
    await run(ctx, await signedRequest(paymentSucceeded({ currency: 'eur' })));
    assert.equal(ctx.db.called('handle_payment_succeeded')[0]!.args.p_amount_cents, -1);
  },
);

Deno.test('webhook: an unknown reader type in metadata is dropped', async () => {
  const ctx = ready();
  await run(ctx, await signedRequest(paymentSucceeded({ metadata: { reader_type: 'x' } })));
  assert.equal(ctx.db.called('handle_payment_succeeded')[0]!.args.p_reader_type, null);
});

Deno.test('webhook: if card details cannot be loaded the payment is still recorded', async () => {
  const ctx = ready();
  ctx.stripe.errors.set('retrieveCharge', new StripeError(0, 'network_error', null, 'x'));
  const response = await run(ctx, await signedRequest(paymentSucceeded()));
  assert.equal(response.status, 200);
  const call = ctx.db.called('handle_payment_succeeded')[0]!;
  assert.equal(call.args.p_charge_id, 'ch_test_1');
  assert.equal(call.args.p_card_brand, null);
  assert.equal(call.args.p_card_last4, null);
});

Deno.test('webhook: duplicates and events that are not ours are acknowledged', async () => {
  for (const outcome of ['duplicate', 'ignored']) {
    const ctx = ready(outcome);
    const response = await run(ctx, await signedRequest(paymentSucceeded()));
    assert.equal(response.status, 200);
    assert.equal((await body(response)).outcome, outcome);
    assert.equal(ctx.logs.length, 0);
  }
});

Deno.test(
  'webhook: flagged events are acknowledged and logged for a person to handle',
  async () => {
    for (const outcome of [
      'failed:amount_mismatch',
      'failed:order_not_pending',
      'failed:duplicate_payment',
    ]) {
      const ctx = ready(outcome);
      const response = await run(ctx, await signedRequest(paymentSucceeded()));
      assert.equal(response.status, 200, 'acknowledged so Stripe does not retry forever');
      assert.equal((await body(response)).outcome, outcome);
      assert.deepEqual(ctx.logs[0]?.detail, {
        event_id: 'evt_test_paid_1',
        type: 'payment_intent.succeeded',
        outcome,
      });
    }
  },
);

Deno.test('webhook: if the database fails, Stripe is told to retry', async () => {
  const ctx = createContext();
  ctx.db.on('handle_payment_succeeded', () => {
    throw new DbError('57014', 'canceling statement due to statement timeout');
  });
  const response = await run(ctx, await signedRequest(paymentSucceeded()));
  assert.equal(response.status, 500);
  assert.equal(JSON.stringify(await body(response)).includes('statement timeout'), false);
});

Deno.test(
  'webhook: declined, processing and cancelled payments map to the right status',
  async () => {
    const expected: Record<string, string> = {
      'payment_intent.payment_failed': 'requires_payment_method',
      'payment_intent.processing': 'processing',
      'payment_intent.canceled': 'canceled',
    };
    for (const [type, status] of Object.entries(expected)) {
      const ctx = ready();
      const event = { ...paymentSucceeded(), id: 'evt_test_update_1', type };
      const response = await run(ctx, await signedRequest(event));
      assert.equal(response.status, 200, type);
      const call = ctx.db.called('handle_payment_intent_update')[0]!;
      assert.equal(call.args.p_status, status);
      assert.equal(call.args.p_payment_intent, 'pi_test_1');
      assert.equal(
        ctx.db.called('handle_payment_succeeded').length,
        0,
        'never treated as a success',
      );
    }
  },
);

Deno.test('webhook: refund events carry our refund id from the metadata', async () => {
  for (const type of ['refund.created', 'refund.updated', 'charge.refund.updated']) {
    const ctx = ready();
    const response = await run(ctx, await signedRequest(refundEvent(type)));
    assert.equal(response.status, 200, type);
    assert.deepEqual(
      { ...ctx.db.called('handle_refund_update')[0]!.args, p_payload: undefined },
      {
        p_event_id: 'evt_test_refund_1',
        p_event_type: type,
        p_payload: undefined,
        p_provider_refund_id: 're_test_1',
        p_status: 'succeeded',
        p_amount_cents: 900,
        p_refund_id: REFUND_ID,
        p_failure_reason: null,
      },
    );
  }
});

Deno.test('webhook: a failed refund passes on the reason', async () => {
  const ctx = ready();
  await run(
    ctx,
    await signedRequest(
      refundEvent('refund.failed', { status: 'failed', failure_reason: 'lost_or_stolen_card' }),
    ),
  );
  const call = ctx.db.called('handle_refund_update')[0]!;
  assert.equal(call.args.p_status, 'failed');
  assert.equal(call.args.p_failure_reason, 'lost_or_stolen_card');
});

Deno.test(
  'webhook: a refund made outside the app has no refund id and is still reported',
  async () => {
    const ctx = ready('failed:unknown_refund');
    const response = await run(
      ctx,
      await signedRequest(refundEvent('refund.created', { metadata: {} })),
    );
    assert.equal(response.status, 200);
    assert.equal(ctx.db.called('handle_refund_update')[0]!.args.p_refund_id, null);
    assert.equal(ctx.logs.length, 1);
  },
);

Deno.test('webhook: a refund id in metadata that is not a uuid is ignored', async () => {
  const ctx = ready();
  await run(
    ctx,
    await signedRequest(
      refundEvent('refund.created', { metadata: { refund_id: "x'; drop table refunds;--" } }),
    ),
  );
  assert.equal(ctx.db.called('handle_refund_update')[0]!.args.p_refund_id, null);
});

Deno.test(
  'webhook: event types we do not act on are acknowledged without touching the database',
  async () => {
    const ctx = ready();
    const event = { ...paymentSucceeded(), id: 'evt_test_other', type: 'customer.created' };
    const response = await run(ctx, await signedRequest(event));
    assert.equal(response.status, 200);
    assert.equal((await body(response)).outcome, 'unhandled');
    assert.equal(ctx.db.calls.length, 0);
  },
);

Deno.test('webhook: only POST is accepted', async () => {
  const ctx = ready();
  const response = await run(
    ctx,
    new Request('http://localhost/stripe-webhook', { method: 'GET' }),
  );
  assert.equal(response.status, 405);
});
