// Money is always a whole number of cents. Floating-point dollars are never
// stored, summed or compared anywhere in the platform.

declare const centsBrand: unique symbol;

/** A non-negative whole number of US cents. Create with `cents()`. */
export type Cents = number & { readonly [centsBrand]: true };

/** Largest amount any single money column accepts ($1,000,000.00). */
export const MAX_CENTS = 100_000_000;

export function isCents(value: unknown): value is Cents {
  return (
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= MAX_CENTS
  );
}

/** Validates and brands a number as cents. Throws on fractions and negatives. */
export function cents(value: number): Cents {
  if (!isCents(value)) {
    throw new RangeError(`Invalid amount in cents: ${String(value)}`);
  }
  return value;
}

export const ZERO_CENTS = cents(0);

export function addCents(...amounts: readonly Cents[]): Cents {
  return cents(amounts.reduce<number>((sum, amount) => sum + amount, 0));
}

export function lineTotalCents(unitPrice: Cents, quantity: number): Cents {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new RangeError(`Invalid quantity: ${String(quantity)}`);
  }
  return cents(unitPrice * quantity);
}

export interface OrderAmounts {
  readonly subtotal: Cents;
  readonly discount: Cents;
  readonly reward: Cents;
}

/**
 * total = subtotal - discount - reward. No sales tax is charged.
 * Mirrors the `orders_total_matches` constraint. The server computes the real
 * total; clients use this for display only.
 */
export function orderTotalCents({ subtotal, discount, reward }: OrderAmounts): Cents {
  const total = subtotal - discount - reward;
  if (total < 0) {
    throw new RangeError('Discounts and rewards cannot exceed the subtotal');
  }
  return cents(total);
}

/**
 * Parses user-typed dollars ("9", "9.5", "$1,234.50") into cents without
 * going through floating point. Returns null when the text is not an amount.
 */
export function parseDollarsToCents(input: string): Cents | null {
  const match = /^\$?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?$/.exec(input.trim());
  if (!match) {
    return null;
  }
  const dollars = Number((match[1] ?? '').replaceAll(',', ''));
  const fraction = Number((match[2] ?? '').padEnd(2, '0'));
  const value = dollars * 100 + fraction;
  return isCents(value) ? value : null;
}

/** Formats cents as US dollars, e.g. 900 -> "$9.00", 123456 -> "$1,234.56". */
export function formatCents(amount: Cents): string {
  const dollars = Math.floor(amount / 100);
  const remainder = amount % 100;
  return `$${dollars.toLocaleString('en-US')}.${String(remainder).padStart(2, '0')}`;
}
