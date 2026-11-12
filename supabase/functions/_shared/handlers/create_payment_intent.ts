// POST /create-payment-intent
//
// Starts a checkout. The app sends what is being bought; the database prices
// it. If money is due, a Stripe PaymentIntent is created for exactly that
// amount and its client secret is returned so the Terminal SDK can collect
// the card. The order is NOT paid here: only the signed webhook can do that.
import { z } from 'zod';

import { requireUserId, resolveApprover } from '../auth.ts';
import type { Deps, OrderRow } from '../deps.ts';
import { AppError } from '../errors.ts';
import { json, readJson, requirePost } from '../http.ts';
import { accessTokenSchema, idempotencyKeySchema, parseBody } from '../validate.ts';

// .strict(): a field the server does not know (a price, a total, points) is
// rejected rather than silently ignored.
const bodySchema = z
  .object({
    idempotency_key: idempotencyKeySchema,
    items: z
      .array(
        z.object({ product_id: z.uuid(), quantity: z.number().int().min(1).max(999) }).strict(),
      )
      .min(1)
      .max(100),
    customer_id: z.uuid().nullish(),
    rewards: z
      .array(z.object({ reward_id: z.uuid(), product_id: z.uuid() }).strict())
      .max(20)
      .default([]),
    discount_cents: z.number().int().min(0).max(100_000_000).default(0),
    discount_reason: z.string().max(200).nullish(),
    approver_access_token: accessTokenSchema.nullish(),
    reader_type: z.enum(['tap_to_pay', 'reader', 'simulated']).default('tap_to_pay'),
  })
  .strict();

export async function handleCreatePaymentIntent(req: Request, deps: Deps): Promise<Response> {
  requirePost(req);
  const employeeId = await requireUserId(req, deps);
  const body = parseBody(bodySchema, await readJson(req));
  const approverId = await resolveApprover(body.approver_access_token, deps);

  const order = await deps.db.rpc<OrderRow>('create_order', {
    p_employee_id: employeeId,
    p_idempotency_key: body.idempotency_key,
    p_items: body.items,
    p_customer_id: body.customer_id ?? null,
    p_rewards: body.rewards,
    p_discount_cents: body.discount_cents,
    p_discount_reason: body.discount_reason ?? null,
    p_discount_approved_by: approverId,
  });

  // Fully covered by rewards: already complete, nothing to charge.
  if (order.status === 'paid' && order.total_cents === 0) {
    return json(200, { order, payment_intent: null });
  }
  if (order.status !== 'pending') {
    throw new AppError(
      409,
      'invalid_state',
      `This checkout is already ${order.status}. Start a new one.`,
    );
  }

  // The key ties the PaymentIntent to the order: a retry gets the same one.
  const paymentIntent = await deps.stripe.createPaymentIntent(
    {
      amountCents: order.total_cents,
      metadata: {
        order_id: order.id,
        order_number: String(order.order_number),
        reader_type: body.reader_type,
      },
    },
    `order-${order.id}`,
  );

  if (paymentIntent.amount !== order.total_cents || paymentIntent.currency !== 'usd') {
    deps.log('payment intent does not match order', {
      order_id: order.id,
      order_total: order.total_cents,
      intent_amount: paymentIntent.amount,
      intent_currency: paymentIntent.currency,
    });
    throw new Error('payment intent does not match order');
  }
  if (paymentIntent.status === 'canceled') {
    throw new AppError(409, 'invalid_state', 'This checkout was cancelled. Start a new one.');
  }

  await deps.db.rpc('record_payment_intent', {
    p_order_id: order.id,
    p_payment_intent: paymentIntent.id,
    p_amount_cents: paymentIntent.amount,
  });

  return json(200, {
    order,
    payment_intent: { id: paymentIntent.id, client_secret: paymentIntent.client_secret },
  });
}
