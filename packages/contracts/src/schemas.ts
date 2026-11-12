// Runtime validation for data crossing a trust boundary (API payloads, RPC
// arguments and results). Shapes follow the database column names.
import { z } from 'zod';

import {
  EMPLOYEE_ROLES,
  ORDER_STATUSES,
  PRODUCT_CATEGORIES,
  REFUND_REASONS,
  USER_ROLES,
} from './enums.ts';
import { MAX_CENTS } from './money.ts';

export const employeeRoleSchema = z.enum(EMPLOYEE_ROLES);
export const userRoleSchema = z.enum(USER_ROLES);
export const productCategorySchema = z.enum(PRODUCT_CATEGORIES);
export const orderStatusSchema = z.enum(ORDER_STATUSES);
export const refundReasonSchema = z.enum(REFUND_REASONS);

export const centsSchema = z.number().int().min(0).max(MAX_CENTS);
export const pointsSchema = z.number().int().min(0);
export const uuidSchema = z.uuid();

/** E.164, e.g. +14155550123. Matches the `customers.phone` constraint. */
export const phoneSchema = z.string().regex(/^\+[1-9][0-9]{6,14}$/, 'Use the format +14155550123');

export const fullNameSchema = z.string().trim().min(1).max(120);

export const membershipCodeSchema = z.string().regex(/^[0-9a-f]{32}$/);

/** Arguments of the `register_customer` RPC. */
export const registerCustomerArgsSchema = z.object({
  p_full_name: fullNameSchema,
  p_phone: phoneSchema.nullish(),
  p_marketing_opt_in: z.boolean().default(false),
});
export type RegisterCustomerArgs = z.input<typeof registerCustomerArgsSchema>;

/** A row of the `customers` table as its owner sees it. */
export const customerProfileSchema = z.object({
  id: uuidSchema,
  full_name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  membership_code: membershipCodeSchema,
  marketing_opt_in: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
});
export type CustomerProfile = z.infer<typeof customerProfileSchema>;

/**
 * What the POS receives from `lookup_customer_by_code` and
 * `find_customer_by_contact`. Deliberately excludes email and phone.
 */
export const customerLookupResultSchema = z.object({
  customer_id: uuidSchema,
  full_name: z.string(),
  points_balance: pointsSchema,
  member_since: z.string(),
});
export type CustomerLookupResult = z.infer<typeof customerLookupResultSchema>;

/** Fields a manager may set on a product. */
export const productInputSchema = z.object({
  sku: z.string().regex(/^[A-Z0-9][A-Z0-9-]{1,31}$/),
  name: z.string().trim().min(1).max(120),
  flavor: z.string().trim().min(1).max(60),
  category: productCategorySchema,
  bar_count: z.number().int().min(0).max(100),
  description: z.string().max(2000).nullish(),
  price_cents: centsSchema,
  image_path: z.string().max(500).nullish(),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});
export type ProductInput = z.input<typeof productInputSchema>;

/** Fields a manager may set on a reward. */
export const rewardInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    description: z.string().max(1000).nullish(),
    points_cost: z.number().int().min(1).max(10_000_000),
    grants_category: productCategorySchema,
    product_id: uuidSchema.nullish(),
    /** The Shopify collection the reward can be spent on. Required before it works at the till. */
    shopify_collection_id: z.number().int().positive().nullish(),
    quantity: z.number().int().min(1).max(100).default(1),
    is_active: z.boolean().default(true),
    starts_at: z.iso.datetime({ offset: true }).nullish(),
    ends_at: z.iso.datetime({ offset: true }).nullish(),
    sort_order: z.number().int().default(0),
  })
  .refine(
    (reward) =>
      !reward.starts_at ||
      !reward.ends_at ||
      Date.parse(reward.ends_at) > Date.parse(reward.starts_at),
    { message: 'The end date must be after the start date', path: ['ends_at'] },
  );
export type RewardInput = z.input<typeof rewardInputSchema>;

/** Owner-editable business settings (`app_settings`). */
export const appSettingsInputSchema = z.object({
  points_per_dollar: z.number().int().min(0).max(1000),
  reward_hold_minutes: z.number().int().min(2).max(1440),
  accept_test_orders: z.boolean(),
});
export type AppSettingsInput = z.infer<typeof appSettingsInputSchema>;
