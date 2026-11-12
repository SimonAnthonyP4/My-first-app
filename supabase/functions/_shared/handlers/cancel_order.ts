// POST /cancel-order
//
// The cashier abandons a checkout before it is paid. The PaymentIntent is
// cancelled at Stripe first. If Stripe says the payment already went through,
// the order is left alone: it will be completed by the webhook and must be
// refunded instead.
import { z } from 'zod';

import { requireUserId } from '../auth.ts';
import type { Deps, OrderRow } from '../deps.ts';
import { AppError } from '../errors.ts';
import { json, readJson, requirePost } from '../http.ts';
import { StripeError } from '../stripe.ts';
import { parseBody } from '../validate.ts';

const bodySchema = z.object({ order_id: z.uuid() }).strict();

export async function handleCancelOrder(req: Request, deps: Deps): Promise<Response> {
  requirePost(req);
  const employeeId = await requireUserId(req, deps);
  const body = parseBody(bodySchema, await readJson(req));

  for (const paymentIntentId of await deps.db.listOpenPaymentIntents(body.order_id)) {
    try {
      await deps.stripe.cancelPaymentIntent(paymentIntentId);
    } catch (error) {
      if (!(error instanceof StripeError) || error.code !== 'payment_intent_unexpected_state') {
        throw error;
      }
      const status = error.object?.status;
      if (status === 'canceled') {
        continue;
      }
      if (status === 'succeeded' || status === 'processing' || status === 'requires_capture') {
        throw new AppError(
          409,
          'already_paid',
          'This order has already been paid. Refund it instead of cancelling.',
        );
      }
      throw error;
    }
  }

  const order = await deps.db.rpc<OrderRow>('cancel_order', {
    p_order_id: body.order_id,
    p_employee_id: employeeId,
  });
  return json(200, { order });
}
