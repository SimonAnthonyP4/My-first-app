// Value sets shared by the database, the Edge Functions, the admin dashboard
// and (through generated Swift) both iOS apps.
//
// The database is the authority: each list mirrors a CHECK constraint or enum
// type in supabase/migrations. `scripts/check-contract-drift.mjs` compares the
// two on every test run, so they cannot silently diverge.
//
// This file must stay free of imports so plain Node can load it.

export const EMPLOYEE_ROLES = ['employee', 'manager', 'owner'] as const;
export type EmployeeRole = (typeof EMPLOYEE_ROLES)[number];

/** Value of the `user_role` access-token claim. `null` means no profile yet. */
export const USER_ROLES = [...EMPLOYEE_ROLES, 'customer'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const PRODUCT_CATEGORIES = ['bar', 'three_pack', 'six_pack', 'other'] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const ORDER_STATUSES = [
  'pending',
  'paid',
  'partially_refunded',
  'refunded',
  'cancelled',
  'failed',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Statuses in which money was collected; the only orders a customer can see. */
export const COMPLETED_ORDER_STATUSES = ['paid', 'partially_refunded', 'refunded'] as const;

export const PAYMENT_STATUSES = [
  'requires_payment_method',
  'processing',
  'succeeded',
  'canceled',
  'failed',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const READER_TYPES = ['tap_to_pay', 'reader', 'simulated'] as const;
export type ReaderType = (typeof READER_TYPES)[number];

export const REFUND_REASONS = [
  'customer_request',
  'damaged',
  'wrong_item',
  'duplicate',
  'other',
] as const;
export type RefundReason = (typeof REFUND_REASONS)[number];

export const REFUND_STATUSES = ['pending', 'succeeded', 'failed', 'canceled'] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];

export const LOYALTY_TRANSACTION_KINDS = [
  'earn',
  'redeem',
  'reverse_earn',
  'reverse_redeem',
  'adjust',
  'expire',
] as const;
export type LoyaltyTransactionKind = (typeof LOYALTY_TRANSACTION_KINDS)[number];

export const REDEMPTION_STATUSES = ['reserved', 'fulfilled', 'released', 'expired'] as const;
export type RedemptionStatus = (typeof REDEMPTION_STATUSES)[number];

export const INVENTORY_REASONS = [
  'restock',
  'sale',
  'refund_restock',
  'adjustment',
  'waste',
  'count',
] as const;
export type InventoryReason = (typeof INVENTORY_REASONS)[number];

/** Reasons a manager may record by hand. The rest are written by the server. */
export const MANUAL_INVENTORY_REASONS = ['restock', 'adjustment', 'waste', 'count'] as const;
export type ManualInventoryReason = (typeof MANUAL_INVENTORY_REASONS)[number];

export const STRIPE_EVENT_STATUSES = ['received', 'processed', 'failed', 'ignored'] as const;
export type StripeEventStatus = (typeof STRIPE_EVENT_STATUSES)[number];

/** Custom SQLSTATE codes raised by database functions and triggers. */
export const DB_ERROR = {
  /** A loyalty debit would take the balance below zero. */
  INSUFFICIENT_POINTS: 'BB001',
} as const;
