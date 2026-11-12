// Member and reward lookups shared by the POS handlers.
import type { Db, MemberRow, RewardRow } from './deps.ts';

function first<T>(rows: T[] | T | null): T | null {
  if (Array.isArray(rows)) {
    return rows[0] ?? null;
  }
  return rows ?? null;
}

export async function findMember(
  db: Db,
  by: { membershipCode?: string; shopifyCustomerId?: string; customerId?: string },
): Promise<MemberRow | null> {
  return first(
    await db.rpc<MemberRow[]>('pos_lookup_member', {
      p_membership_code: by.membershipCode ?? null,
      p_shopify_customer_id: by.shopifyCustomerId ?? null,
      p_customer_id: by.customerId ?? null,
    }),
  );
}

export async function listLiveRewards(db: Db): Promise<RewardRow[]> {
  return (await db.rpc<RewardRow[]>('pos_rewards', { p_reward_id: null })) ?? [];
}

export async function getReward(db: Db, rewardId: string): Promise<RewardRow | null> {
  return first(await db.rpc<RewardRow[]>('pos_rewards', { p_reward_id: rewardId }));
}

/** What the till is shown about a member. Never includes contact details. */
export function memberForPos(member: MemberRow) {
  return {
    customer_id: member.customer_id,
    full_name: member.full_name,
    points_balance: member.points_balance,
    shopify_customer_id: member.shopify_customer_id,
  };
}
