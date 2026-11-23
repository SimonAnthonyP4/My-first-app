// Display logic for the rewards screen. Pure functions, so they can be
// tested without Shopify POS. None of this is trusted by the backend: it
// only decides what the cashier is shown.
import type { Reward } from './api.ts';

/** The parts of a POS cart line this extension reads. */
export interface CartLine {
  uuid: string;
  variantId?: number | null;
  title?: string | null;
  quantity: number;
  price?: number | null;
  isGiftCard?: boolean;
}

/** Lines a reward could be applied to: real products with a quantity. */
export function eligibleLines(lines: readonly CartLine[] | undefined | null): CartLine[] {
  return (lines ?? []).filter(
    (line) =>
      typeof line.variantId === 'number' &&
      line.variantId > 0 &&
      line.quantity > 0 &&
      line.isGiftCard !== true,
  );
}

export type RewardState = 'available' | 'not_enough_points' | 'not_set_up';

export function rewardState(reward: Reward): RewardState {
  if (!reward.available_at_pos) {
    return 'not_set_up';
  }
  return reward.affordable ? 'available' : 'not_enough_points';
}

/** "1,400 points", "1 point". */
export function formatPoints(points: number): string {
  const whole = Math.trunc(points);
  return `${whole.toLocaleString('en-US')} ${whole === 1 ? 'point' : 'points'}`;
}

/** What the cashier reads under a reward's name. */
export function rewardSubtitle(reward: Reward, balance: number): string {
  switch (rewardState(reward)) {
    case 'available':
      return formatPoints(reward.points_cost);
    case 'not_enough_points':
      return `${formatPoints(reward.points_cost)} · ${formatPoints(reward.points_cost - balance)} to go`;
    case 'not_set_up':
      return `${formatPoints(reward.points_cost)} · not available at the till yet`;
  }
}

/** The clock time a reward hold ends, e.g. "3:45 PM". Empty if the time is unreadable. */
export function holdUntil(expiresAt: string, locale: string = 'en-US', timeZone?: string): string {
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', timeZone });
}

/**
 * A fresh key for one tap of "Apply". A retry of the same tap reuses its key,
 * so the backend can tell a retry from a second reward.
 */
export function newIdempotencyKey(randomUuid: () => string = () => crypto.randomUUID()): string {
  return `pos-${randomUuid()}`;
}

/** Text scanned by the camera that could be a membership code (the backend decides). */
export function looksLikeMembershipScan(scanned: string | undefined | null): scanned is string {
  if (!scanned) {
    return false;
  }
  const text = scanned.trim().toLowerCase();
  const code = text.startsWith('brobatch:member:') ? text.slice('brobatch:member:'.length) : text;
  return /^[0-9a-f]{32}$/.test(code);
}
