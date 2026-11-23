// POST /pos-member
//
// The POS extension scanned a membership QR code (or the cart already has a
// Shopify customer). Returns who the member is, their points, and the
// rewards the till can offer, and any reward they are already holding (so a
// reopened rewards screen can still remove it). The first time a member is seen, they are
// matched to their Shopify customer by email, or one is created, so the
// cashier can attach them to the cart and later orders earn points.
import { z } from 'zod';

import { requirePosCaller } from '../auth.ts';
import type { Deps } from '../deps.ts';
import { AppError } from '../errors.ts';
import { json, readJson, requirePost } from '../http.ts';
import { findMember, listHeldRewards, listLiveRewards, memberForPos } from '../members.ts';
import { parseBody, shopifyIdSchema } from '../validate.ts';

const bodySchema = z
  .object({
    membership_code: z.string().trim().min(1).max(200).optional(),
    shopify_customer_id: shopifyIdSchema.optional(),
  })
  .strict()
  .refine(
    (body) => (body.membership_code === undefined) !== (body.shopify_customer_id === undefined),
    {
      message: 'Send either membership_code or shopify_customer_id.',
    },
  );

const QR_PREFIX = 'brobatch:member:';

/** Accepts the QR payload or a bare code. Mirrors parseMembershipQr in the contracts package. */
export function membershipCodeFromScan(scanned: string): string | null {
  const text = scanned.trim().toLowerCase();
  const code = text.startsWith(QR_PREFIX) ? text.slice(QR_PREFIX.length) : text;
  return /^[0-9a-f]{32}$/.test(code) ? code : null;
}

export async function handlePosMember(req: Request, deps: Deps): Promise<Response> {
  requirePost(req);
  await requirePosCaller(req, deps);
  const body = parseBody(bodySchema, await readJson(req));

  let member;
  if (body.membership_code !== undefined) {
    const code = membershipCodeFromScan(body.membership_code);
    if (!code) {
      throw new AppError(404, 'not_a_member', 'That is not a Bro Batch membership code.');
    }
    member = await findMember(deps.db, { membershipCode: code });
  } else {
    member = await findMember(deps.db, { shopifyCustomerId: body.shopify_customer_id });
  }
  if (!member) {
    throw new AppError(404, 'not_a_member', 'No rewards member was found.');
  }

  if (!member.shopify_customer_id) {
    if (!member.email) {
      throw new AppError(409, 'invalid_state', 'This member has no email address on file.');
    }
    const shopifyCustomerId =
      (await deps.shopify.findCustomerIdByEmail(member.email)) ??
      (await deps.shopify.createCustomer({ email: member.email, fullName: member.full_name }));

    await deps.db.rpc('link_shopify_customer', {
      p_customer_id: member.customer_id,
      p_shopify_customer_id: shopifyCustomerId,
    });
    member = { ...member, shopify_customer_id: shopifyCustomerId };
  }

  const [rewards, pointsPerDollar, held] = await Promise.all([
    listLiveRewards(deps.db),
    deps.db.getPointsPerDollar(),
    listHeldRewards(deps.db, member.customer_id),
  ]);

  return json(200, {
    member: memberForPos(member),
    points_per_dollar: pointsPerDollar,
    rewards: rewards.map((reward) => ({
      id: reward.id,
      name: reward.name,
      description: reward.description,
      points_cost: reward.points_cost,
      grants_category: reward.grants_category,
      quantity: reward.quantity,
      affordable: member.points_balance >= reward.points_cost,
      // A reward with no Shopify collection has not been set up for the till.
      available_at_pos: reward.shopify_collection_id !== null,
    })),
    // Same shape as the reward returned by pos-reserve-reward.
    held_rewards: held.map((reward) => ({
      id: reward.id,
      discount_code: reward.discount_code,
      expires_at: reward.expires_at,
      points_cost: reward.points_cost,
      discount_cents: reward.discount_cents,
      reward_name: reward.reward_name,
    })),
  });
}
