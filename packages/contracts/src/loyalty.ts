import type { ProductCategory } from './enums.ts';
import type { Cents } from './money.ts';

/** Launch earn rate. The live value is `app_settings.points_per_dollar`. */
export const DEFAULT_POINTS_PER_DOLLAR = 10;

export const MAX_POINTS_PER_DOLLAR = 1000;

/**
 * Points earned for an amount actually paid.
 *
 *   points = floor(paidCents * pointsPerDollar / 100)
 *
 * At the launch rate of 10 points per $1: $9.00 -> 90, $0.99 -> 9, $10.05 -> 100.
 * Partial points are always rounded down. The server is the authority; this
 * function exists so clients can show "you will earn N points" before payment.
 */
export function pointsForPurchase(
  paidCents: Cents,
  pointsPerDollar: number = DEFAULT_POINTS_PER_DOLLAR,
): number {
  if (
    !Number.isSafeInteger(pointsPerDollar) ||
    pointsPerDollar < 0 ||
    pointsPerDollar > MAX_POINTS_PER_DOLLAR
  ) {
    throw new RangeError(`Invalid earn rate: ${String(pointsPerDollar)}`);
  }
  return Math.floor((paidCents * pointsPerDollar) / 100);
}

/** Whether a balance covers a reward. The database enforces this again. */
export function canRedeem(balance: number, pointsCost: number): boolean {
  return Number.isSafeInteger(balance) && pointsCost > 0 && balance >= pointsCost;
}

/** Points still needed for a reward; 0 when it is already affordable. */
export function pointsUntil(balance: number, pointsCost: number): number {
  return Math.max(0, pointsCost - balance);
}

export interface LaunchReward {
  readonly name: string;
  readonly pointsCost: number;
  readonly grantsCategory: ProductCategory;
}

/**
 * The rewards created by the first migration. Thresholds are editable in the
 * admin dashboard afterwards, so read live values from the `rewards` table;
 * this list documents the starting point and is checked against a fresh
 * database by the drift test.
 */
export const LAUNCH_REWARDS: readonly LaunchReward[] = [
  { name: 'Free protein bar', pointsCost: 300, grantsCategory: 'bar' },
  { name: 'Free three-pack', pointsCost: 750, grantsCategory: 'three_pack' },
  { name: 'Free six-pack', pointsCost: 1400, grantsCategory: 'six_pack' },
];
