// POST /process-refund
//
// The database decides whether the refund is allowed and how much money it
// is. Stripe is then asked to return exactly that amount. Stock and points
// move only once Stripe confirms, here or through the webhook, whichever
// comes first; the other one changes nothing.
import { z } from 'zod';

import { requireUserId, resolveApprover } from '../auth.ts';
import type { Deps, RefundRow } from '../deps.ts';
import { AppError } from '../errors.ts';
import { json, readJson, requirePost } from '../http.ts';
import { StripeError } from '../stripe.ts';
import { accessTokenSchema, parseBody } from '../validate.ts';

const REASONS = ['customer_request', 'damaged', 'wrong_item', 'duplicate', 'other'] as const;

const bodySchema = z
  .object({
    order_id: z.uuid(),
    idempotency_key: z.string().min(8).max(200),
    items: z
      .array(
        z
          .object({
            order_item_id: z.uuid(),
            quantity: z.number().int().min(1).max(999),
            restock: z.boolean().default(true),
          })
          .strict(),
      )
      .min(1)
      .max(100),
    reason: z.enum(REASONS),
    note: z.string().max(500).nullish(),
    approver_access_token: accessTokenSchema.nullish(),
  })
  .strict();

function stripeReason(
  reason: (typeof REASONS)[number],
): 'requested_by_customer' | 'duplicate' | null {
  if (reason === 'customer_request') return 'requested_by_customer';
  if (reason === 'duplicate') return 'duplicate';
  return null;
}

export async function handleProcessRefund(req: Request, deps: Deps): Promise<Response> {
  requirePost(req);
  const employeeId = await requireUserId(req, deps);
  const body = parseBody(bodySchema, await readJson(req));
  const approverId = await resolveApprover(body.approver_access_token, deps);

  let refund = await deps.db.rpc<RefundRow>('request_refund', {
    p_order_id: body.order_id,
    p_employee_id: employeeId,
    p_idempotency_key: body.idempotency_key,
    p_items: body.items,
    p_reason: body.reason,
    p_note: body.note ?? null,
    p_approved_by: approverId,
  });

  // A retry of a request that already finished.
  if (refund.status === 'succeeded') {
    return json(200, { refund });
  }
  if (refund.status !== 'pending') {
    throw new AppError(409, 'refund_failed', 'This refund did not go through. Start a new one.');
  }

  const paymentIntentId = await deps.db.getRefundPaymentIntent(refund.id);
  if (!paymentIntentId) {
    throw new Error(`refund ${refund.id} has no payment intent`);
  }

  let stripeRefund;
  try {
    stripeRefund = await deps.stripe.createRefund(
      {
        paymentIntentId,
        amountCents: refund.amount_cents,
        reason: stripeReason(body.reason),
        // Lets the webhook find our row even if it arrives before this call returns.
        metadata: { refund_id: refund.id, order_id: refund.order_id },
      },
      `refund-${refund.id}`,
    );
  } catch (error) {
    if (error instanceof StripeError && !error.retryable) {
      // Stripe said no and will keep saying no. Free the items for a new attempt.
      await deps.db.rpc('fail_refund', {
        p_refund_id: refund.id,
        p_failure_reason: error.code ?? error.type,
      });
      throw new AppError(422, 'refund_declined', 'The payment provider declined this refund.');
    }
    // Unknown outcome: leave the refund pending. Retrying with the same key
    // resumes it, and Stripe's idempotency key prevents a second refund.
    throw error;
  }

  if (stripeRefund.amount !== refund.amount_cents) {
    deps.log('stripe refund amount does not match', {
      refund_id: refund.id,
      requested: refund.amount_cents,
      refunded: stripeRefund.amount,
    });
    throw new Error('stripe refund amount does not match');
  }

  refund = await deps.db.rpc<RefundRow>('record_refund_submitted', {
    p_refund_id: refund.id,
    p_provider_refund_id: stripeRefund.id,
  });

  if (stripeRefund.status === 'succeeded') {
    refund = await deps.db.rpc<RefundRow>('complete_refund', {
      p_refund_id: refund.id,
      p_provider_refund_id: stripeRefund.id,
      p_amount_cents: stripeRefund.amount,
      p_source_event_id: null,
    });
  } else if (stripeRefund.status === 'failed' || stripeRefund.status === 'canceled') {
    await deps.db.rpc('fail_refund', {
      p_refund_id: refund.id,
      p_failure_reason: stripeRefund.failure_reason ?? stripeRefund.status,
      p_canceled: stripeRefund.status === 'canceled',
    });
    throw new AppError(422, 'refund_declined', 'The payment provider declined this refund.');
  }
  // Otherwise still pending at Stripe; the webhook will finish it.

  return json(200, { refund });
}
