import { describe, expect, it } from 'vitest';

import {
  appSettingsInputSchema,
  customerLookupResultSchema,
  phoneSchema,
  productInputSchema,
  registerCustomerArgsSchema,
  rewardInputSchema,
} from './schemas.ts';

describe('registerCustomerArgsSchema', () => {
  it('trims the name and defaults marketing opt-in to false', () => {
    expect(registerCustomerArgsSchema.parse({ p_full_name: '  Alice Example ' })).toEqual({
      p_full_name: 'Alice Example',
      p_marketing_opt_in: false,
    });
  });

  it('rejects an empty name and a malformed phone', () => {
    expect(registerCustomerArgsSchema.safeParse({ p_full_name: '   ' }).success).toBe(false);
    expect(
      registerCustomerArgsSchema.safeParse({ p_full_name: 'Alice', p_phone: '555-0101' }).success,
    ).toBe(false);
  });
});

describe('phoneSchema', () => {
  it.each(['+14155550123', '+442071838750'])('accepts %s', (phone) => {
    expect(phoneSchema.safeParse(phone).success).toBe(true);
  });

  it.each(['4155550123', '+0123456789', '+1 415 555 0123', '+14155', ''])('rejects %j', (phone) => {
    expect(phoneSchema.safeParse(phone).success).toBe(false);
  });
});

describe('customerLookupResultSchema', () => {
  const row = {
    customer_id: '6f1c1a54-6f0b-4a4e-9f43-0d8a4f1f7a11',
    full_name: 'Alice Example',
    points_balance: 90,
    member_since: '2026-11-11T00:00:00+00:00',
  };

  it('accepts a lookup row', () => {
    expect(customerLookupResultSchema.parse(row)).toEqual(row);
  });

  it('strips contact details if a server ever sent them', () => {
    const parsed = customerLookupResultSchema.parse({ ...row, email: 'alice@example.com' });
    expect(parsed).not.toHaveProperty('email');
  });

  it('rejects a negative or fractional balance', () => {
    expect(customerLookupResultSchema.safeParse({ ...row, points_balance: -1 }).success).toBe(
      false,
    );
    expect(customerLookupResultSchema.safeParse({ ...row, points_balance: 1.5 }).success).toBe(
      false,
    );
  });
});

describe('productInputSchema', () => {
  const product = {
    sku: 'BAR-CHOC-PB',
    name: 'Chocolate Peanut Butter Bar',
    flavor: 'Chocolate Peanut Butter',
    category: 'bar',
    bar_count: 1,
    price_cents: 300,
  };

  it('accepts a valid product', () => {
    expect(productInputSchema.safeParse(product).success).toBe(true);
  });

  it.each([
    ['a fractional price', { price_cents: 2.99 }],
    ['a negative price', { price_cents: -1 }],
    ['an unknown category', { category: 'crate' }],
    ['a lower-case SKU', { sku: 'bar-choc' }],
  ])('rejects %s', (_label, override) => {
    expect(productInputSchema.safeParse({ ...product, ...override }).success).toBe(false);
  });
});

describe('rewardInputSchema', () => {
  const reward = { name: 'Free protein bar', points_cost: 300, grants_category: 'bar' };

  it('accepts a valid reward', () => {
    expect(rewardInputSchema.safeParse(reward).success).toBe(true);
  });

  it('rejects a free or fractional threshold', () => {
    expect(rewardInputSchema.safeParse({ ...reward, points_cost: 0 }).success).toBe(false);
    expect(rewardInputSchema.safeParse({ ...reward, points_cost: 299.5 }).success).toBe(false);
  });

  it('rejects a window that ends before it starts', () => {
    const result = rewardInputSchema.safeParse({
      ...reward,
      starts_at: '2026-12-01T00:00:00Z',
      ends_at: '2026-11-01T00:00:00Z',
    });
    expect(result.success).toBe(false);
  });
});

describe('appSettingsInputSchema', () => {
  it('accepts the launch settings', () => {
    expect(
      appSettingsInputSchema.safeParse({
        points_per_dollar: 10,
        refund_approval_threshold_cents: 2500,
      }).success,
    ).toBe(true);
  });

  it('rejects a negative earn rate', () => {
    expect(
      appSettingsInputSchema.safeParse({
        points_per_dollar: -1,
        refund_approval_threshold_cents: 2500,
      }).success,
    ).toBe(false);
  });
});
