// Stripe webhook signature verification.
//
// Stripe signs each delivery: the Stripe-Signature header carries a timestamp
// `t` and one or more `v1` signatures, each HMAC-SHA256(secret, `${t}.${body}`)
// in hex. We recompute it over the exact bytes received and compare in
// constant time. Deliveries older than the tolerance are refused so a captured
// request cannot be replayed later.

export type SignatureFailure =
  'missing_header' | 'malformed_header' | 'timestamp_out_of_tolerance' | 'no_matching_signature';

export type SignatureResult =
  | { readonly ok: true; readonly timestamp: number }
  | { readonly ok: false; readonly reason: SignatureFailure };

export const DEFAULT_TOLERANCE_SECONDS = 300;

const encoder = new TextEncoder();

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Compares two strings without leaking where they first differ. */
export function timingSafeEqual(a: string, b: string): boolean {
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}

export async function computeSignature(
  secret: string,
  timestamp: number,
  rawBody: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${timestamp}.${rawBody}`),
  );
  return toHex(new Uint8Array(signature));
}

export async function verifyStripeSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  nowSeconds: number,
  toleranceSeconds: number = DEFAULT_TOLERANCE_SECONDS,
): Promise<SignatureResult> {
  if (!header) {
    return { ok: false, reason: 'missing_header' };
  }

  let timestamp: number | null = null;
  const candidates: string[] = [];
  for (const part of header.split(',')) {
    const separator = part.indexOf('=');
    if (separator === -1) {
      continue;
    }
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (name === 't' && /^[0-9]{1,12}$/.test(value)) {
      timestamp = Number(value);
    } else if (name === 'v1' && /^[0-9a-f]{64}$/.test(value)) {
      candidates.push(value);
    }
  }

  if (timestamp === null || candidates.length === 0) {
    return { ok: false, reason: 'malformed_header' };
  }
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) {
    return { ok: false, reason: 'timestamp_out_of_tolerance' };
  }

  const expected = await computeSignature(secret, timestamp, rawBody);
  let matched = false;
  for (const candidate of candidates) {
    // No early exit: every candidate is compared.
    matched = timingSafeEqual(candidate, expected) || matched;
  }
  return matched ? { ok: true, timestamp } : { ok: false, reason: 'no_matching_signature' };
}
