// POST /pos-release-reward
//
// The cashier takes a reward back off the cart before the sale is finished.
// The Shopify code is deleted first, so it cannot be used afterwards, and
// then the points are returned. A reward that has already been used on a
// paid order cannot be released.
import { z } from 'zod';

import { requirePosCaller } from '../auth.ts';
import type { Deps, RedemptionRow } from '../deps.ts';
import { AppError } from '../errors.ts';
import { json, readJson, requirePost } from '../http.ts';
import { findMember } from '../members.ts';
import { parseBody } from '../validate.ts';

const bodySchema = z.object({ redemption_id: z.uuid() }).strict();

export async function handlePosReleaseReward(req: Request, deps: Deps): Promise<Response> {
  requirePost(req);
  await requirePosCaller(req, deps);
  const body = parseBody(bodySchema, await readJson(req));

  const existing = await deps.db.getRedemption(body.redemption_id);
  if (!existing) {
    throw new AppError(404, 'not_found', 'That reward was not found.');
  }

  // If Shopify cannot be reached the points stay held: the code might still
  // be usable. The hold lapses on its own a few minutes later.
  if (existing.status === 'reserved' && existing.shopify_discount_id) {
    await deps.shopify.deleteDiscount(existing.shopify_discount_id);
  }

  const redemption = await deps.db.rpc<RedemptionRow>('release_redemption', {
    p_redemption_id: existing.id,
    p_expired: false,
  });

  const member = await findMember(deps.db, { customerId: redemption.customer_id });
  return json(200, {
    redemption: { id: redemption.id, status: redemption.status },
    points_balance: member?.points_balance ?? null,
  });
}
