import { describe, expect, it } from 'vitest';

import {
  MAX_CENTS,
  addCents,
  cents,
  formatCents,
  isCents,
  lineTotalCents,
  orderTotalCents,
  parseDollarsToCents,
} from './money.ts';

describe('cents', () => {
  it('accepts whole, non-negative amounts', () => {
    expect(cents(0)).toBe(0);
    expect(cents(900)).toBe(900);
    expect(cents(MAX_CENTS)).toBe(MAX_CENTS);
  });

  it.each([-1, 0.5, 9.99, Number.NaN, Number.POSITIVE_INFINITY, MAX_CENTS + 1])(
    'rejects %s',
    (value) => {
      expect(() => cents(value)).toThrow(RangeError);
      expect(isCents(value)).toBe(false);
    },
  );

  it('rejects non-numbers', () => {
    expect(isCents('900')).toBe(false);
    expect(isCents(null)).toBe(false);
  });
});

describe('arithmetic', () => {
  it('sums without floating-point drift', () => {
    // 0.1 + 0.2 !== 0.3 in floating-point dollars; in cents it is exact.
    expect(addCents(cents(10), cents(20))).toBe(30);
    expect(addCents()).toBe(0);
  });

  it('computes line totals', () => {
    expect(lineTotalCents(cents(300), 3)).toBe(900);
  });

  it.each([0, -1, 1.5])('rejects quantity %s', (quantity) => {
    expect(() => lineTotalCents(cents(300), quantity)).toThrow(RangeError);
  });

  it('computes order totals as subtotal - discount - reward, with no tax', () => {
    expect(
      orderTotalCents({ subtotal: cents(1200), discount: cents(100), reward: cents(300) }),
    ).toBe(800);
    expect(orderTotalCents({ subtotal: cents(300), discount: cents(0), reward: cents(300) })).toBe(
      0,
    );
  });

  it('refuses a total below zero', () => {
    expect(() =>
      orderTotalCents({ subtotal: cents(300), discount: cents(200), reward: cents(300) }),
    ).toThrow(RangeError);
  });
});

describe('parseDollarsToCents', () => {
  it.each([
    ['9', 900],
    ['9.00', 900],
    ['9.5', 950],
    ['0.99', 99],
    ['$3.00', 300],
    ['  12.34 ', 1234],
    ['1,234.50', 123450],
    ['0', 0],
    // Classic floating-point traps: 1.15 * 100 === 114.99999999999999
    ['1.15', 115],
    ['19.99', 1999],
    ['1000000', MAX_CENTS],
  ])('parses %j as %i cents', (input, expected) => {
    expect(parseDollarsToCents(input)).toBe(expected);
  });

  it.each(['', 'abc', '-5', '9.999', '9.', '.50', '1,23', '1e3', '9 00', '1000000.01'])(
    'rejects %j',
    (input) => {
      expect(parseDollarsToCents(input)).toBeNull();
    },
  );
});

describe('formatCents', () => {
  it.each([
    [0, '$0.00'],
    [5, '$0.05'],
    [99, '$0.99'],
    [900, '$9.00'],
    [1999, '$19.99'],
    [123456, '$1,234.56'],
  ])('formats %i as %s', (amount, expected) => {
    expect(formatCents(cents(amount))).toBe(expected);
  });

  it('round-trips with parseDollarsToCents', () => {
    for (const amount of [0, 1, 99, 100, 101, 850, 1600, 123456, MAX_CENTS]) {
      expect(parseDollarsToCents(formatCents(cents(amount)))).toBe(amount);
    }
  });
});
