// POST /shopify-webhook
//
// Shopify tells us here that an order was paid or refunded. This is the only
// way points are earned or taken back. Every delivery must carry a valid
// signature over the exact bytes received.
//
// What the response tells Shopify:
//   2xx  handled, or deliberately not acted on (duplicate, ignored, flagged)
//   401  bad signature or wrong store: never acted on
//   503  not ready for this one yet (a refund whose order has not arrived):
//        Shopify retries, up to 8 times over 4 hours
//   500  our side failed: Shopify retries, and every handler is idempotent
import type { WebhookDeps } from '../deps.ts';
import { AppError, DbError } from '../errors.ts';
import { errorResponse, json, requirePost } from '../http.ts';
import { verifyWebhookHmac } from '../shopify_hmac.ts';

const MAX_BODY_BYTES = 2 * 1024 * 1024;

const HANDLERS: Readonly<Record<string, string>> = {
  'orders/paid': 'ingest_shopify_order',
  'refunds/create': 'ingest_shopify_refund',
};

export async function handleShopifyWebhook(req: Request, deps: WebhookDeps): Promise<Response> {
  requirePost(req);

  const rawBody = new Uint8Array(await req.arrayBuffer());
  if (rawBody.length > MAX_BODY_BYTES) {
    throw new AppError(413, 'payload_too_large', 'The request is too large.');
  }

  const signed = await verifyWebhookHmac(
    rawBody,
    req.headers.get('x-shopify-hmac-sha256'),
    deps.webhookSecret,
  );
  if (!signed) {
    deps.log('shopify webhook signature rejected');
    return errorResponse(401, 'invalid_signature', 'Signature verification failed.');
  }

  // Signed with our app's secret, so it is from Shopify. It must also be
  // about our store.
  const shop = (req.headers.get('x-shopify-shop-domain') ?? '').toLowerCase();
  if (shop !== deps.shopDomain.toLowerCase()) {
    deps.log('shopify webhook for another shop', { shop });
    return errorResponse(401, 'wrong_shop', 'This webhook is for a different store.');
  }

  const topic = req.headers.get('x-shopify-topic') ?? '';
  const webhookId = req.headers.get('x-shopify-webhook-id') ?? '';
  const eventId = req.headers.get('x-shopify-event-id');
  if (!topic || !webhookId || webhookId.length > 200) {
    return errorResponse(400, 'invalid_webhook', 'Missing webhook headers.');
  }

  const fn = HANDLERS[topic];
  if (!fn) {
    // A topic this endpoint is subscribed to by mistake. Acknowledge it.
    return json(200, { received: true, outcome: 'unhandled' });
  }

  // The body goes to the database as text, untouched. Shopify ids can be
  // larger than a JavaScript number holds exactly, so it is never parsed here.
  let raw: string;
  try {
    raw = new TextDecoder('utf-8', { fatal: true }).decode(rawBody);
  } catch {
    return errorResponse(400, 'invalid_webhook', 'The body is not valid UTF-8.');
  }

  let outcome: string;
  try {
    outcome = await deps.db.rpc<string>(fn, {
      p_webhook_id: webhookId,
      p_topic: topic,
      p_event_id: eventId,
      p_raw: raw,
    });
  } catch (error) {
    if (error instanceof DbError && error.sqlstate === '22023') {
      // Signed by Shopify but not the shape we expect. Retrying cannot fix it.
      deps.log('shopify webhook body rejected', { topic, webhook_id: webhookId });
      return json(200, { received: true, outcome: 'rejected' });
    }
    throw error;
  }

  if (outcome === 'retry') {
    return json(503, { received: true, outcome });
  }
  if (outcome === 'flagged') {
    // Recorded in shopify_webhook_events with the reason; needs a person.
    deps.log('shopify webhook needs attention', { topic, webhook_id: webhookId });
  }
  return json(200, { received: true, outcome });
}
