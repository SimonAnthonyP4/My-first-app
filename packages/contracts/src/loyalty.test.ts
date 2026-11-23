import { describe, expect, it } from 'vitest';

import {
  DEFAULT_POINTS_PER_DOLLAR,
  LAUNCH_REWARDS,
  canRedeem,
  pointsForPurchase,
  pointsUntil,
} from './loyalty.ts';
import { cents } from './money.ts';

describe('pointsForPurchase', () => {
  it('awards 10 points per dollar by default', () => {
    expect(DEFAULT_POINTS_PER_DOLLAR).toBe(10);
  });

  it('matches the example in the brief: $9 earns 90 points', () => {
    expect(pointsForPurchase(cents(900))).toBe(90);
  });

  it.each([
    [0, 0],
    [9, 0],
    [10, 1],
    [99, 9],
    [100, 10],
    [300, 30],
    [850, 85],
    [1005, 100],
    [1999, 199],
  ])('%i cents earns %i points (partial points round down)', (paid, expected) => {
    expect(pointsForPurchase(cents(paid))).toBe(expected);
  });

  it('supports other earn rates', () => {
    expect(pointsForPurchase(cents(900), 20)).toBe(180);
    expect(pointsForPurchase(cents(999), 1)).toBe(9);
    expect(pointsForPurchase(cents(900), 0)).toBe(0);
  });

  it.each([-1, 1.5, 1001, Number.NaN])('rejects earn rate %s', (rate) => {
    expect(() => pointsForPurchase(cents(900), rate)).toThrow(RangeError);
  });

  it('always returns a whole number', () => {
    for (let paid = 0; paid <= 2000; paid += 7) {
      expect(Number.isInteger(pointsForPurchase(cents(paid), 13))).toBe(true);
    }
  });
});

describe('rewards', () => {
  it('launch thresholds are 300, 750 and 1,400 points', () => {
    expect(LAUNCH_REWARDS.map((reward) => [reward.name, reward.pointsCost])).toEqual([
      ['Free protein bar', 300],
      ['Free three-pack', 750],
      ['Free six-pack', 1400],
    ]);
  });

  it('a reward is redeemable only when the balance covers it', () => {
    expect(canRedeem(299, 300)).toBe(false);
    expect(canRedeem(300, 300)).toBe(true);
    expect(canRedeem(301, 300)).toBe(true);
    expect(canRedeem(0, 300)).toBe(false);
    expect(canRedeem(1000, 0)).toBe(false);
  });

  it('reports the points still needed', () => {
    expect(pointsUntil(90, 300)).toBe(210);
    expect(pointsUntil(300, 300)).toBe(0);
    expect(pointsUntil(500, 300)).toBe(0);
  });
});
