import assert from 'node:assert/strict';

import {
  assertKeyMatchesMode,
  createStripeClient,
  encodeForm,
  StripeError,
} from '../_shared/stripe.ts';

// Assembled from parts so secret scanners do not flag this test file.
const TEST_KEY = ['sk', 'test', 'x'.repeat(24)].join('_');
const LIVE_KEY = ['sk', 'live', 'y'.repeat(24)].join('_');

interface Captured {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
}

function fakeFetch(status: number, payload: unknown, captured: Captured[] = []): typeof fetch {
  return ((input: string | URL | Request, init?: RequestInit) => {
    captured.push({
      url: String(input),
      method: init?.method ?? 'GET',
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: typeof init?.body === 'string' ? init.body : null,
    });
    return Promise.resolve(
      new Response(JSON.stringify(payload), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
    );
  }) as typeof fetch;
}

Deno.test('encodeForm: nested objects and arrays use Stripe bracket syntax', () => {
  assert.equal(
    encodeForm({
      amount: 900,
      currency: 'usd',
      payment_method_types: ['card_present'],
      metadata: { order_id: 'abc', note: 'a b&c' },
      skipped: null,
      missing: undefined,
    }),
    'amount=900&currency=usd&payment_method_types%5B0%5D=card_present' +
      '&metadata%5Border_id%5D=abc&metadata%5Bnote%5D=a%20b%26c',
  );
});

Deno.test(
  'createPaymentIntent: sends the amount, card_present, metadata and idempotency key',
  async () => {
    const captured: Captured[] = [];
    const stripe = createStripeClient({
      secretKey: TEST_KEY,
      mode: 'test',
      apiVersion: '2024-06-20',
      fetch: fakeFetch(
        200,
        {
          id: 'pi_1',
          status: 'requires_payment_method',
          amount: 900,
          currency: 'usd',
          client_secret: 'pi_1_secret',
        },
        captured,
      ),
    });

    const intent = await stripe.createPaymentIntent(
      { amountCents: 900, metadata: { order_id: 'o1' } },
      'order-o1',
    );

    assert.deepEqual(intent, {
      id: 'pi_1',
      status: 'requires_payment_method',
      amount: 900,
      currency: 'usd',
      client_secret: 'pi_1_secret',
    });
    assert.equal(captured.length, 1);
    const call = captured[0]!;
    assert.equal(call.url, 'https://api.stripe.com/v1/payment_intents');
    assert.equal(call.method, 'POST');
    assert.equal(call.headers.authorization, `Bearer ${TEST_KEY}`);
    assert.equal(call.headers['idempotency-key'], 'order-o1');
    assert.equal(call.headers['stripe-version'], '2024-06-20');
    const params = new URLSearchParams(call.body ?? '');
    assert.equal(params.get('amount'), '900');
    assert.equal(params.get('currency'), 'usd');
    assert.equal(params.get('payment_method_types[0]'), 'card_present');
    assert.equal(params.get('capture_method'), 'automatic');
    assert.equal(params.get('metadata[order_id]'), 'o1');
  },
);

Deno.test(
  'createRefund: refunds a payment intent for an exact amount with our ids in metadata',
  async () => {
    const captured: Captured[] = [];
    const stripe = createStripeClient({
      secretKey: TEST_KEY,
      mode: 'test',
      fetch: fakeFetch(200, { id: 're_1', status: 'succeeded', amount: 300 }, captured),
    });

    const refund = await stripe.createRefund(
      {
        paymentIntentId: 'pi_1',
        amountCents: 300,
        reason: 'requested_by_customer',
        metadata: { refund_id: 'r1', order_id: 'o1' },
      },
      'refund-r1',
    );

    assert.deepEqual(refund, {
      id: 're_1',
      status: 'succeeded',
      amount: 300,
      failure_reason: null,
    });
    const call = captured[0]!;
    assert.equal(call.url, 'https://api.stripe.com/v1/refunds');
    assert.equal(call.headers['idempotency-key'], 'refund-r1');
    assert.equal(call.headers['stripe-version'], undefined, 'no version header unless pinned');
    const params = new URLSearchParams(call.body ?? '');
    assert.equal(params.get('payment_intent'), 'pi_1');
    assert.equal(params.get('amount'), '300');
    assert.equal(params.get('reason'), 'requested_by_customer');
    assert.equal(params.get('metadata[refund_id]'), 'r1');
  },
);

Deno.test('createRefund: a null reason is left out', async () => {
  const captured: Captured[] = [];
  const stripe = createStripeClient({
    secretKey: TEST_KEY,
    mode: 'test',
    fetch: fakeFetch(200, { id: 're_1', status: 'pending', amount: 300 }, captured),
  });
  await stripe.createRefund(
    { paymentIntentId: 'pi_1', amountCents: 300, reason: null, metadata: {} },
    'refund-r2',
  );
  assert.equal(new URLSearchParams(captured[0]!.body ?? '').has('reason'), false);
});

Deno.test('cancelPaymentIntent and createConnectionToken hit the right endpoints', async () => {
  const captured: Captured[] = [];
  const stripe = createStripeClient({
    secretKey: TEST_KEY,
    mode: 'test',
    fetch: fakeFetch(
      200,
      { id: 'pi_1', status: 'canceled', amount: 900, currency: 'usd', secret: 'pst_test_1' },
      captured,
    ),
  });
  await stripe.cancelPaymentIntent('pi_1');
  const token = await stripe.createConnectionToken();
  assert.equal(captured[0]!.url, 'https://api.stripe.com/v1/payment_intents/pi_1/cancel');
  assert.equal(captured[1]!.url, 'https://api.stripe.com/v1/terminal/connection_tokens');
  assert.equal(token.secret, 'pst_test_1');
});

Deno.test('retrieveCharge: returns brand and last four digits only', async () => {
  const stripe = createStripeClient({
    secretKey: TEST_KEY,
    mode: 'test',
    fetch: fakeFetch(200, {
      id: 'ch_1',
      payment_method_details: {
        card_present: {
          brand: 'visa',
          last4: '4242',
          fingerprint: 'fp_x',
          exp_month: 12,
          exp_year: 2030,
        },
      },
    }),
  });
  assert.deepEqual(await stripe.retrieveCharge('ch_1'), {
    id: 'ch_1',
    card_brand: 'visa',
    card_last4: '4242',
  });
});

Deno.test('retrieveCharge: a last4 that is not four digits is dropped', async () => {
  const stripe = createStripeClient({
    secretKey: TEST_KEY,
    mode: 'test',
    fetch: fakeFetch(200, {
      id: 'ch_1',
      payment_method_details: { card_present: { brand: 'visa', last4: '4242424242424242' } },
    }),
  });
  assert.equal((await stripe.retrieveCharge('ch_1')).card_last4, null);
});

Deno.test(
  'errors: a Stripe error becomes a StripeError with type, code and attached object',
  async () => {
    const stripe = createStripeClient({
      secretKey: TEST_KEY,
      mode: 'test',
      fetch: fakeFetch(400, {
        error: {
          type: 'invalid_request_error',
          code: 'payment_intent_unexpected_state',
          message: 'You cannot cancel this PaymentIntent because it has a status of succeeded.',
          payment_intent: { id: 'pi_1', status: 'succeeded' },
        },
      }),
    });
    await assert.rejects(
      () => stripe.cancelPaymentIntent('pi_1'),
      (error: unknown) => {
        assert.ok(error instanceof StripeError);
        assert.equal(error.status, 400);
        assert.equal(error.type, 'invalid_request_error');
        assert.equal(error.code, 'payment_intent_unexpected_state');
        assert.equal(error.object?.status, 'succeeded');
        assert.equal(error.retryable, false);
        return true;
      },
    );
  },
);

Deno.test(
  'errors: rate limits, conflicts and server errors are retryable; card errors are not',
  () => {
    assert.equal(new StripeError(429, 'rate_limit_error', null, '').retryable, true);
    assert.equal(new StripeError(409, 'idempotency_error', null, '').retryable, true);
    assert.equal(new StripeError(500, 'api_error', null, '').retryable, true);
    assert.equal(new StripeError(0, 'network_error', null, '').retryable, true);
    assert.equal(new StripeError(402, 'card_error', 'card_declined', '').retryable, false);
    assert.equal(new StripeError(400, 'invalid_request_error', null, '').retryable, false);
  },
);

Deno.test('errors: a network failure never exposes the secret key', async () => {
  const stripe = createStripeClient({
    secretKey: TEST_KEY,
    mode: 'test',
    fetch: (() =>
      Promise.reject(new Error(`connect failed, headers: Bearer ${TEST_KEY}`))) as typeof fetch,
  });
  await assert.rejects(
    () => stripe.createConnectionToken(),
    (error: unknown) => {
      assert.ok(error instanceof StripeError);
      assert.equal(error.status, 0);
      assert.equal(error.type, 'network_error');
      assert.equal(String(error.message).includes(TEST_KEY), false);
      assert.equal(JSON.stringify(error).includes(TEST_KEY), false);
      return true;
    },
  );
});

Deno.test('errors: an unreadable response is reported, not crashed on', async () => {
  const stripe = createStripeClient({
    secretKey: TEST_KEY,
    mode: 'test',
    fetch: (() =>
      Promise.resolve(new Response('<html>bad gateway</html>', { status: 502 }))) as typeof fetch,
  });
  await assert.rejects(() => stripe.createConnectionToken(), StripeError);
});

Deno.test('mode guard: a live key is refused in test mode, and the reverse', () => {
  assert.doesNotThrow(() => assertKeyMatchesMode(TEST_KEY, 'test'));
  assert.doesNotThrow(() => assertKeyMatchesMode(LIVE_KEY, 'live'));
  assert.throws(() => assertKeyMatchesMode(LIVE_KEY, 'test'), /STRIPE_MODE is "test"/);
  assert.throws(() => assertKeyMatchesMode(TEST_KEY, 'live'), /STRIPE_MODE is "live"/);
  assert.throws(
    () => assertKeyMatchesMode('pk_test_publishable', 'test'),
    /not a Stripe secret key/,
  );
  assert.throws(() => assertKeyMatchesMode('', 'test'));
});

Deno.test('mode guard: the error message never contains the key', () => {
  try {
    assertKeyMatchesMode(LIVE_KEY, 'test');
    assert.fail('expected a throw');
  } catch (error) {
    assert.equal(String(error).includes(LIVE_KEY), false);
  }
});

Deno.test('mode guard: the client cannot be constructed with a mismatched key', () => {
  assert.throws(() => createStripeClient({ secretKey: LIVE_KEY, mode: 'test' }));
});
