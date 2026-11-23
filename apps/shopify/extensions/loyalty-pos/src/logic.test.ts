import { describe, expect, it } from 'vitest';

import { parseMembershipQr } from '../../../../../packages/contracts/src/membership.ts';
import type { Reward } from './api.ts';
import { isBackendConfigured } from './config.ts';
import {
  eligibleLines,
  formatPoints,
  holdUntil,
  looksLikeMembershipScan,
  newIdempotencyKey,
  rewardState,
  rewardSubtitle,
} from './logic.ts';

function reward(overrides: Partial<Reward> = {}): Reward {
  return {
    id: 'r1',
    name: 'Free protein bar',
    description: null,
    points_cost: 300,
    grants_category: 'bar',
    quantity: 1,
    affordable: true,
    available_at_pos: true,
    ...overrides,
  };
}

describe('eligibleLines', () => {
  it('keeps real products and drops custom sales, gift cards and empty lines', () => {
    const lines = [
      { uuid: 'a', variantId: 111, title: 'Chocolate Bar', quantity: 2 },
      { uuid: 'b', variantId: null, title: 'Custom sale', quantity: 1 },
      { uuid: 'c', variantId: 222, title: 'Gift card', quantity: 1, isGiftCard: true },
      { uuid: 'd', variantId: 333, title: 'Removed', quantity: 0 },
      { uuid: 'e', title: 'No variant', quantity: 1 },
    ];
    expect(eligibleLines(lines).map((line) => line.uuid)).toEqual(['a']);
  });

  it('handles an empty or missing cart', () => {
    expect(eligibleLines([])).toEqual([]);
    expect(eligibleLines(undefined)).toEqual([]);
    expect(eligibleLines(null)).toEqual([]);
  });
});

describe('reward display', () => {
  it('classifies rewards', () => {
    expect(rewardState(reward())).toBe('available');
    expect(rewardState(reward({ affordable: false }))).toBe('not_enough_points');
    expect(rewardState(reward({ available_at_pos: false }))).toBe('not_set_up');
    expect(rewardState(reward({ affordable: false, available_at_pos: false }))).toBe('not_set_up');
  });

  it('explains each state to the cashier', () => {
    expect(rewardSubtitle(reward(), 1000)).toBe('300 points');
    expect(rewardSubtitle(reward({ affordable: false }), 90)).toBe('300 points · 210 points to go');
    expect(rewardSubtitle(reward({ affordable: false }), 299)).toBe('300 points · 1 point to go');
    expect(rewardSubtitle(reward({ available_at_pos: false, points_cost: 1400 }), 0)).toBe(
      '1,400 points · not available at the till yet',
    );
  });

  it('formats points', () => {
    expect(formatPoints(0)).toBe('0 points');
    expect(formatPoints(1)).toBe('1 point');
    expect(formatPoints(1400)).toBe('1,400 points');
  });

  it('shows when a hold ends, and nothing for an unreadable time', () => {
    expect(holdUntil('2027-01-15T15:45:00+00:00', 'en-US', 'UTC')).toBe('3:45 PM');
    expect(holdUntil('not a time')).toBe('');
  });
});

describe('newIdempotencyKey', () => {
  it('is long enough for the backend and different each time', () => {
    const first = newIdempotencyKey();
    const second = newIdempotencyKey();
    expect(first).toMatch(/^pos-[0-9a-f-]{36}$/);
    expect(first.length).toBeGreaterThanOrEqual(8);
    expect(first).not.toBe(second);
  });

  it('uses the supplied generator', () => {
    expect(newIdempotencyKey(() => 'fixed')).toBe('pos-fixed');
  });
});

describe('looksLikeMembershipScan', () => {
  const CODE = '0123456789abcdef0123456789abcdef';

  it('agrees with the shared contracts package on what a membership QR is', () => {
    for (const scanned of [
      CODE,
      `brobatch:member:${CODE}`,
      `  BROBATCH:MEMBER:${CODE.toUpperCase()}\n`,
      'https://example.com/',
      '012345678905', // a product barcode
      'brobatch:member:xyz',
      `${CODE}0`,
      '',
    ]) {
      expect(looksLikeMembershipScan(scanned), JSON.stringify(scanned)).toBe(
        parseMembershipQr(scanned) !== null,
      );
    }
  });

  it('handles missing scan data', () => {
    expect(looksLikeMembershipScan(undefined)).toBe(false);
    expect(looksLikeMembershipScan(null)).toBe(false);
  });
});

describe('isBackendConfigured', () => {
  it('is false until the placeholder is replaced', () => {
    expect(isBackendConfigured('https://REPLACE_WITH_PROJECT_REF.supabase.co/functions/v1')).toBe(
      false,
    );
    expect(isBackendConfigured('https://abcdefghijklmnop.supabase.co/functions/v1')).toBe(true);
    expect(isBackendConfigured('http://insecure.example.com/functions/v1')).toBe(false);
    expect(isBackendConfigured('')).toBe(false);
  });
});
