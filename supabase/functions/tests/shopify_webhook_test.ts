import assert from 'node:assert/strict';

import { DbError } from '../_shared/errors.ts';
import { handleShopifyWebhook } from '../_shared/handlers/shopify_webhook.ts';
import { respond } from '../_shared/http.ts';
import { computeWebhookHmac } from '../_shared/shopify_hmac.ts';
import { body, CLIENT_SECRET, createContext, SHOP, type TestContext } from './fakes.ts';

// An id larger than JavaScript can represent exactly, as Shopify may send.
const ORDER_BODY =
  '{"id":9000000000000000123,"financial_status":"paid","subtotal_price":"9.00","customer":{"email":"mia@example.com"}}';

async function delivery(
  rawBody: string,
  options: {
    topic?: string;
    secret?: string;
    shop?: string;
    webhookId?: string | null;
    signature?: string | null;
    sentBody?: string;
  } = {},
): Promise<Request> {
  const signature =
    options.signature === undefined
      ? await computeWebhookHmac(options.secret ?? CLIENT_SECRET, new TextEncoder().encode(rawBody))
      : options.signature;
  const headers: Record<string, string> = {
    'x-shopify-topic': options.topic ?? 'orders/paid',
    'x-shopify-shop-domain': options.shop ?? SHOP,
    'x-shopify-event-id': 'event-1',
  };
  if (options.webhookId !== null)
    headers['x-shopify-webhook-id'] = options.webhookId ?? 'webhook-1';
  if (signature !== null) headers['x-shopify-hmac-sha256'] = signature;
  return new Request('http://localhost/shopify-webhook', {
    method: 'POST',
    headers,
    body: options.sentBody ?? rawBody,
  });
}

function ready(outcome = 'processed'): TestContext {
  const ctx = createContext();
  ctx.db.on('ingest_shopify_order', () => outcome).on('ingest_shopify_refund', () => outcome);
  return ctx;
}

const run = (ctx: TestContext, req: Request) => respond(handleShopifyWebhook, req, ctx.webhookDeps);

Deno.test(
  'webhook: a signed orders/paid delivery is handed to the database untouched',
  async () => {
    const ctx = ready();
    const response = await run(ctx, await delivery(ORDER_BODY));

    assert.equal(response.status, 200);
    assert.deepEqual(await body(response), { received: true, outcome: 'processed' });
    assert.deepEqual(ctx.db.calls, [
      {
        fn: 'ingest_shopify_order',
        args: {
          p_webhook_id: 'webhook-1',
          p_topic: 'orders/paid',
          p_event_id: 'event-1',
          p_raw: ORDER_BODY,
        },
      },
    ]);
  },
);

Deno.test(
  'webhook: the body reaches the database as text, so large ids are never rounded',
  async () => {
    const ctx = ready();
    await run(ctx, await delivery(ORDER_BODY));
    const raw = ctx.db.calls[0]!.args.p_raw as string;
    assert.equal(typeof raw, 'string');
    assert.ok(raw.includes('9000000000000000123'));
    // What would have happened had it been parsed in JavaScript:
    assert.notEqual(String(JSON.parse(ORDER_BODY).id), '9000000000000000123');
  },
);

Deno.test('webhook: a refunds/create delivery goes to the refund function', async () => {
  const ctx = ready();
  const raw = '{"id":9200000000000000001,"order_id":9000000000000000123}';
  await run(ctx, await delivery(raw, { topic: 'refunds/create' }));
  assert.equal(ctx.db.calls[0]!.fn, 'ingest_shopify_refund');
  assert.equal(ctx.db.calls[0]!.args.p_raw, raw);
});

Deno.test('webhook: an unsigned delivery does nothing', async () => {
  const ctx = ready();
  const response = await run(ctx, await delivery(ORDER_BODY, { signature: null }));
  assert.equal(response.status, 401);
  assert.equal((await body(response)).error.code, 'invalid_signature');
  assert.equal(ctx.db.calls.length, 0);
});

Deno.test('webhook: a forged signature does nothing', async () => {
  const ctx = ready();
  const response = await run(ctx, await delivery(ORDER_BODY, { secret: 'shpss_attacker_guess' }));
  assert.equal(response.status, 401);
  assert.equal(ctx.db.calls.length, 0);
});

Deno.test('webhook: a body altered after signing does nothing', async () => {
  const ctx = ready();
  const response = await run(
    ctx,
    await delivery(ORDER_BODY, { sentBody: ORDER_BODY.replace('"9.00"', '"9000.00"') }),
  );
  assert.equal(response.status, 401);
  assert.equal(ctx.db.calls.length, 0);
});

Deno.test('webhook: a correctly signed delivery for another store is refused', async () => {
  const ctx = ready();
  const response = await run(
    ctx,
    await delivery(ORDER_BODY, { shop: 'someone-else.myshopify.com' }),
  );
  assert.equal(response.status, 401);
  assert.equal((await body(response)).error.code, 'wrong_shop');
  assert.equal(ctx.db.calls.length, 0);
});

Deno.test('webhook: a delivery with no webhook id is refused', async () => {
  const ctx = ready();
  const response = await run(ctx, await delivery(ORDER_BODY, { webhookId: null }));
  assert.equal(response.status, 400);
  assert.equal(ctx.db.calls.length, 0);
});

Deno.test('webhook: the rejection log never contains the body or the secret', async () => {
  const ctx = ready();
  await run(ctx, await delivery(ORDER_BODY, { secret: 'shpss_attacker_guess' }));
  const logged = JSON.stringify(ctx.logs);
  assert.equal(logged.includes('mia@example.com'), false);
  assert.equal(logged.includes(CLIENT_SECRET), false);
});

Deno.test(
  'webhook: topics we do not act on are acknowledged without touching the database',
  async () => {
    const ctx = ready();
    const response = await run(ctx, await delivery('{"id":1}', { topic: 'products/update' }));
    assert.equal(response.status, 200);
    assert.equal((await body(response)).outcome, 'unhandled');
    assert.equal(ctx.db.calls.length, 0);
  },
);

Deno.test('webhook: duplicates and ignored deliveries are acknowledged quietly', async () => {
  for (const outcome of ['duplicate', 'ignored']) {
    const ctx = ready(outcome);
    const response = await run(ctx, await delivery(ORDER_BODY));
    assert.equal(response.status, 200);
    assert.equal((await body(response)).outcome, outcome);
    assert.equal(ctx.logs.length, 0);
  }
});

Deno.test('webhook: a flagged delivery is acknowledged and logged for a person', async () => {
  const ctx = ready('flagged');
  const response = await run(ctx, await delivery(ORDER_BODY));
  assert.equal(response.status, 200, 'acknowledged so Shopify does not retry');
  assert.deepEqual(ctx.logs[0]?.detail, { topic: 'orders/paid', webhook_id: 'webhook-1' });
});

Deno.test('webhook: a refund whose order has not arrived asks Shopify to retry', async () => {
  const ctx = ready('retry');
  const response = await run(
    ctx,
    await delivery('{"id":1,"order_id":2}', { topic: 'refunds/create' }),
  );
  assert.equal(response.status, 503);
});

Deno.test(
  'webhook: if the database fails, Shopify is told to retry and learns nothing internal',
  async () => {
    const ctx = createContext();
    ctx.db.fail('ingest_shopify_order', '57014', 'canceling statement due to statement timeout');
    const response = await run(ctx, await delivery(ORDER_BODY));
    assert.equal(response.status, 500);
    assert.equal(JSON.stringify(await body(response)).includes('statement timeout'), false);
  },
);

Deno.test(
  'webhook: a signed body that is not an order is acknowledged, not retried forever',
  async () => {
    const ctx = createContext();
    ctx.db.fail('ingest_shopify_order', '22023', 'webhook body is not a Shopify order');
    const response = await run(ctx, await delivery('{"hello":"world"}'));
    assert.equal(response.status, 200);
    assert.equal((await body(response)).outcome, 'rejected');
  },
);

Deno.test('webhook: only POST is accepted', async () => {
  const ctx = ready();
  const response = await run(
    ctx,
    new Request('http://localhost/shopify-webhook', { method: 'GET' }),
  );
  assert.equal(response.status, 405);
});
