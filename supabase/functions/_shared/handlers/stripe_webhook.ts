// POST /stripe-webhook
//
// The only way an order becomes paid or a refund becomes final. Every
// delivery must carry a valid Stripe signature over the exact bytes received.
//
// Responses tell Stripe whether to retry:
//   2xx  handled, or deliberately not acted on (duplicate, not ours, flagged)
//   400  bad signature or malformed event: retrying will not help
//   500  our side failed: Stripe retries with backoff, and because every
//        handler is idempotent a retry is always safe
import type { WebhookDeps } from '../deps.ts';
import { AppError } from '../errors.ts';
import { errorResponse, json, requirePost } from '../http.ts';
import { verifyStripeSignature } from '../webhook.ts';

const MAX_BODY_BYTES = 1024 * 1024;
const READER_TYPES = new Set(['tap_to_pay', 'reader', 'simulated']);

type Json = Record<string, unknown>;

function isRecord(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

function integer(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : null;
}

/**
 * What we keep of an event in stripe_events: enough to audit and reconcile,
 * without storing the whole object (which can include customer details).
 */
function summarize(event: Json, object: Json): Json {
  return {
    id: event.id,
    type: event.type,
    created: event.created,
    livemode: event.livemode,
    object: {
      id: object.id,
      object: object.object,
      status: object.status,
      amount: object.amount,
      amount_received: object.amount_received,
      currency: object.currency,
      payment_intent: object.payment_intent,
      latest_charge: isRecord(object.latest_charge)
        ? object.latest_charge.id
        : object.latest_charge,
      metadata: object.metadata,
      failure_reason: object.failure_reason,
    },
  };
}

export async function handleStripeWebhook(req: Request, deps: WebhookDeps): Promise<Response> {
  requirePost(req);

  const rawBody = await req.text();
  if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) {
    throw new AppError(413, 'payload_too_large', 'The request is too large.');
  }

  const signature = await verifyStripeSignature(
    rawBody,
    req.headers.get('stripe-signature'),
    deps.webhookSecret,
    deps.now(),
  );
  if (!signature.ok) {
    deps.log('webhook signature rejected', { reason: signature.reason });
    return errorResponse(400, 'invalid_signature', 'Signature verification failed.');
  }

  let event: unknown;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return errorResponse(400, 'invalid_event', 'The event is not valid JSON.');
  }
  const eventId = isRecord(event) ? text(event.id) : null;
  const eventType = isRecord(event) ? text(event.type) : null;
  const object = isRecord(event) && isRecord(event.data) ? event.data.object : null;
  if (
    !isRecord(event) ||
    !eventId ||
    !/^evt_[A-Za-z0-9_]+$/.test(eventId) ||
    !eventType ||
    !isRecord(object)
  ) {
    return errorResponse(400, 'invalid_event', 'The event is malformed.');
  }

  // A live event reaching a test deployment (or the reverse) means the
  // endpoint or secret is misconfigured. Never act on it.
  if ((event.livemode === true) !== (deps.stripeMode === 'live')) {
    deps.log('webhook mode mismatch', { event_id: eventId, livemode: event.livemode });
    return errorResponse(400, 'mode_mismatch', 'Event mode does not match this deployment.');
  }

  const payload = summarize(event, object);
  let outcome: string;

  switch (eventType) {
    case 'payment_intent.succeeded': {
      const paymentIntentId = text(object.id);
      if (!paymentIntentId) {
        return errorResponse(400, 'invalid_event', 'The event is malformed.');
      }
      // Only US dollars are accepted. Any other currency is passed on as an
      // impossible amount, so the database rejects it as a mismatch.
      const amount = object.currency === 'usd' ? integer(object.amount_received) : null;
      const chargeId = isRecord(object.latest_charge)
        ? text(object.latest_charge.id)
        : text(object.latest_charge);
      const metadata = isRecord(object.metadata) ? object.metadata : {};
      const readerType = text(metadata.reader_type);

      // Card brand and last four digits, for receipts. Best effort only: a
      // failure here must never stop the payment from being recorded.
      let cardBrand: string | null = null;
      let cardLast4: string | null = null;
      if (chargeId) {
        try {
          const charge = await deps.stripe.retrieveCharge(chargeId);
          cardBrand = charge.card_brand;
          cardLast4 = charge.card_last4;
        } catch {
          deps.log('could not load charge details', { event_id: eventId });
        }
      }

      outcome = await deps.db.rpc<string>('handle_payment_succeeded', {
        p_event_id: eventId,
        p_event_type: eventType,
        p_payload: payload,
        p_payment_intent: paymentIntentId,
        p_amount_cents: amount ?? -1,
        p_charge_id: chargeId,
        p_card_brand: cardBrand,
        p_card_last4: cardLast4,
        p_reader_type: readerType && READER_TYPES.has(readerType) ? readerType : null,
      });
      break;
    }

    case 'payment_intent.payment_failed':
    case 'payment_intent.processing':
    case 'payment_intent.canceled': {
      const paymentIntentId = text(object.id);
      if (!paymentIntentId) {
        return errorResponse(400, 'invalid_event', 'The event is malformed.');
      }
      const status =
        eventType === 'payment_intent.canceled'
          ? 'canceled'
          : eventType === 'payment_intent.processing'
            ? 'processing'
            : 'requires_payment_method';
      outcome = await deps.db.rpc<string>('handle_payment_intent_update', {
        p_event_id: eventId,
        p_event_type: eventType,
        p_payload: payload,
        p_payment_intent: paymentIntentId,
        p_status: status,
      });
      break;
    }

    case 'refund.created':
    case 'refund.updated':
    case 'refund.failed':
    case 'charge.refund.updated': {
      const providerRefundId = text(object.id);
      const status = text(object.status);
      const amount = integer(object.amount);
      if (!providerRefundId || !status || amount === null) {
        return errorResponse(400, 'invalid_event', 'The event is malformed.');
      }
      const metadata = isRecord(object.metadata) ? object.metadata : {};
      const ourRefundId = text(metadata.refund_id);
      outcome = await deps.db.rpc<string>('handle_refund_update', {
        p_event_id: eventId,
        p_event_type: eventType,
        p_payload: payload,
        p_provider_refund_id: providerRefundId,
        p_status: status,
        p_amount_cents: object.currency === 'usd' ? amount : -1,
        p_refund_id: ourRefundId && /^[0-9a-f-]{36}$/i.test(ourRefundId) ? ourRefundId : null,
        p_failure_reason: text(object.failure_reason),
      });
      break;
    }

    default:
      // An event type this endpoint is not subscribed to act on.
      return json(200, { received: true, outcome: 'unhandled' });
  }

  if (outcome.startsWith('failed')) {
    // Needs a person: wrong amount, money for a cancelled order, a refund made
    // outside the app. Recorded in stripe_events; acknowledged so Stripe does
    // not retry something that will never succeed on its own.
    deps.log('webhook event needs attention', { event_id: eventId, type: eventType, outcome });
  }
  return json(200, { received: true, outcome });
}
