// What a handler needs from the outside world. Handlers receive these as
// arguments, so tests can run them with in-memory fakes and no network.
import type { Logger } from './http.ts';
import type { ShopifyAdmin } from './shopify_admin.ts';
import type { IdTokenConfig } from './shopify_id_token.ts';

export interface MemberRow {
  readonly customer_id: string;
  readonly full_name: string;
  readonly email: string | null;
  readonly points_balance: number;
  /** A string, because Shopify ids can exceed what a JavaScript number holds exactly. */
  readonly shopify_customer_id: string | null;
}

export interface RewardRow {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly points_cost: number;
  readonly grants_category: string;
  readonly quantity: number;
  readonly shopify_collection_id: string | null;
  readonly is_live: boolean;
}

/** A reward a member is holding: reserved, with a live discount code. */
export interface HeldRewardRow {
  readonly id: string;
  readonly discount_code: string;
  readonly expires_at: string;
  readonly points_cost: number;
  readonly discount_cents: number;
  readonly reward_name: string;
}

export interface RedemptionRow {
  readonly id: string;
  readonly customer_id: string;
  readonly reward_id: string;
  readonly status: string;
  readonly points_cost: number;
  readonly discount_code: string | null;
  readonly shopify_discount_id: string | null;
  readonly expires_at: string | null;
}

export interface Db {
  /** Calls a database function. Throws DbError carrying the SQLSTATE on failure. */
  rpc<T>(fn: string, args: Record<string, unknown>): Promise<T>;
  getRedemption(redemptionId: string): Promise<RedemptionRow | null>;
  getPointsPerDollar(): Promise<number>;
}

export interface Deps {
  readonly db: Db;
  readonly shopify: ShopifyAdmin;
  readonly idToken: IdTokenConfig;
  readonly log: Logger;
  /** Current time in whole seconds since the epoch. */
  readonly now: () => number;
}

export interface WebhookDeps extends Pick<Deps, 'db' | 'log'> {
  /** The app's client secret: Shopify signs webhooks with it. */
  readonly webhookSecret: string;
  readonly shopDomain: string;
}
