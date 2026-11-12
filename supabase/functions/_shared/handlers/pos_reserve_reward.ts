// POST /pos-reserve-reward
//
// The cashier applies a reward to an item in the cart. The server checks the
// item qualifies and looks up its price in Shopify, debits the points, and
// creates a Shopify discount code that only this customer can use, once, on
// that item, for that amount, for a few minutes. The extension then applies
// the code to the cart. The till never chooses the amount.
import { z } from 'zod';

import { requirePosCaller } from '../auth.ts';
import type { Deps, RedemptionRow } from '../deps.ts';
import { AppError } from '../errors.ts';
import { json, readJson, requirePost } from '../http.ts';
import { findMember, getReward } from '../members.ts';
import { idempotencyKeySchema, parseBody, shopifyIdSchema } from '../validate.ts';

const bodySchema = z
  .object({
    customer_id: z.uuid(),
    reward_id: z.uuid(),
    idempotency_key: idempotencyKeySchema,
    /** The Shopify variant in the cart that the reward pays for. */
    variant_id: shopifyIdSchema,
  })
  .strict();

export async function handlePosReserveReward(req: Request, deps: Deps): Promise<Response> {
  requirePost(req);
  const caller = await requirePosCaller(req, deps);
  const body = parseBody(bodySchema, await readJson(req));

  const member = await findMember(deps.db, { customerId: body.customer_id });
  if (!member) {
    throw new AppError(404, 'not_a_member', 'No rewards member was found.');
  }
  if (!member.shopify_customer_id) {
    throw new AppError(409, 'invalid_state', "Scan the member's code first.");
  }

  const reward = await getReward(deps.db, body.reward_id);
  if (!reward || !reward.is_live) {
    throw new AppError(409, 'not_available', 'That reward is not available.');
  }
  if (!reward.shopify_collection_id) {
    throw new AppError(409, 'not_available', `"${reward.name}" is not set up for the till yet.`);
  }

  const variant = await deps.shopify.getVariantForReward(
    body.variant_id,
    reward.shopify_collection_id,
  );
  if (!variant) {
    throw new AppError(422, 'product_not_found', 'That product was not found in Shopify.');
  }
  if (!variant.inCollection) {
    throw new AppError(
      422,
      'reward_not_applicable',
      `"${reward.name}" cannot be used on ${variant.title}.`,
    );
  }
  const amountCents = variant.priceCents * reward.quantity;
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    throw new AppError(422, 'reward_not_applicable', `${variant.title} has no price to discount.`);
  }

  let redemption = await deps.db.rpc<RedemptionRow>('reserve_reward_for_pos', {
    p_customer_id: member.customer_id,
    p_reward_id: reward.id,
    p_idempotency_key: body.idempotency_key,
    p_shopify_variant_id: body.variant_id,
    p_discount_cents: amountCents,
    p_shopify_user_id: caller.shopifyUserId,
  });

  if (redemption.status !== 'reserved' || !redemption.discount_code || !redemption.expires_at) {
    // A retry of an attempt that was already used or cancelled.
    throw new AppError(409, 'redemption_final', 'That reward attempt is finished. Apply it again.');
  }

  if (!redemption.shopify_discount_id) {
    let discountId: string;
    try {
      discountId = await deps.shopify.createRewardDiscount({
        code: redemption.discount_code,
        title: `Bro Batch reward: ${reward.name}`,
        shopifyCustomerId: member.shopify_customer_id,
        shopifyVariantId: body.variant_id,
        amountCents,
        startsAt: new Date(deps.now() * 1000).toISOString(),
        endsAt: redemption.expires_at,
      });
    } catch (error) {
      // The code does not exist in Shopify, so it can never be used: give the
      // points straight back. If this fails too, the hold lapses on its own.
      try {
        await deps.db.rpc('release_redemption', {
          p_redemption_id: redemption.id,
          p_expired: false,
        });
      } catch {
        deps.log('could not release a reward after Shopify failed', {
          redemption_id: redemption.id,
        });
      }
      throw error;
    }
    redemption = await deps.db.rpc<RedemptionRow>('attach_reward_discount', {
      p_redemption_id: redemption.id,
      p_shopify_discount_id: discountId,
    });
  }

  const after = await findMember(deps.db, { customerId: member.customer_id });
  return json(200, {
    redemption: {
      id: redemption.id,
      discount_code: redemption.discount_code,
      expires_at: redemption.expires_at,
      points_cost: redemption.points_cost,
      discount_cents: amountCents,
      reward_name: reward.name,
    },
    points_balance: after?.points_balance ?? null,
  });
}
