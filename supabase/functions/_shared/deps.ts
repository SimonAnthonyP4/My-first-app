// What a handler needs from the outside world. Handlers receive these as
// arguments, so tests can run them with in-memory fakes and no network.
import type { Logger } from './http.ts';
import type { StripeClient, StripeMode } from './stripe.ts';

export interface Db {
  /** Calls a database function. Throws DbError carrying the SQLSTATE on failure. */
  rpc<T>(fn: string, args: Record<string, unknown>): Promise<T>;
  getActiveEmployee(userId: string): Promise<{ id: string; role: string } | null>;
  /** PaymentIntent ids of an order's payments that are not finished. */
  listOpenPaymentIntents(orderId: string): Promise<string[]>;
  /** The PaymentIntent a refund will be issued against. */
  getRefundPaymentIntent(refundId: string): Promise<string | null>;
}

export interface Auth {
  /** The user id for a valid access token, or null. Verified with the Auth server. */
  getUserId(accessToken: string): Promise<string | null>;
}

export interface Deps {
  readonly db: Db;
  readonly auth: Auth;
  readonly stripe: StripeClient;
  readonly stripeMode: StripeMode;
  readonly log: Logger;
  /** Current time in whole seconds since the epoch. */
  readonly now: () => number;
}

export interface WebhookDeps extends Deps {
  readonly webhookSecret: string;
}

// Rows returned by the database functions (only the columns handlers use).
export interface OrderRow {
  readonly id: string;
  readonly order_number: number;
  readonly status: string;
  readonly subtotal_cents: number;
  readonly discount_cents: number;
  readonly reward_cents: number;
  readonly total_cents: number;
  readonly points_reserved: number;
  readonly customer_id: string | null;
}

export interface RefundRow {
  readonly id: string;
  readonly order_id: string;
  readonly status: string;
  readonly amount_cents: number;
  readonly provider_refund_id: string | null;
  readonly points_reversed: number;
}
