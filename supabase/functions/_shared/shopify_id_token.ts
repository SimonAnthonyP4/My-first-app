// Verifies the ID token a Shopify POS UI extension sends with each request.
//
// The token is a JWT that Shopify signs with the app's client secret (HS256).
// It proves the request comes from a Shopify user signed in to POS on our
// store. It lives for about a minute, so the extension fetches a fresh one
// for every call.
import { hmacSha256, timingSafeEqualBytes } from './shopify_hmac.ts';

export interface IdTokenConfig {
  readonly clientId: string;
  readonly clientSecret: string;
  /** The store's myshopify.com domain, e.g. "bro-batch.myshopify.com". */
  readonly shopDomain: string;
}

export type IdTokenFailure =
  | 'malformed'
  | 'unsupported_algorithm'
  | 'bad_signature'
  | 'expired'
  | 'not_yet_valid'
  | 'wrong_audience'
  | 'wrong_shop';

export type IdTokenResult =
  | { readonly ok: true; readonly shopifyUserId: string; readonly shopDomain: string }
  | { readonly ok: false; readonly reason: IdTokenFailure };

/** Allowed clock difference between Shopify and this server, in seconds. */
const LEEWAY_SECONDS = 10;

const encoder = new TextEncoder();

function base64UrlToBytes(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) {
    return null;
  }
  const padded = value
    .replaceAll('-', '+')
    .replaceAll('_', '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');
  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch {
    return null;
  }
}

function decodeJson(part: string): Record<string, unknown> | null {
  const bytes = base64UrlToBytes(part);
  if (!bytes) {
    return null;
  }
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function hostOf(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export async function verifyIdToken(
  token: string,
  config: IdTokenConfig,
  nowSeconds: number,
): Promise<IdTokenResult> {
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some((part) => part === '')) {
    return { ok: false, reason: 'malformed' };
  }
  const [headerPart, payloadPart, signaturePart] = parts as [string, string, string];

  const header = decodeJson(headerPart);
  const payload = decodeJson(payloadPart);
  const signature = base64UrlToBytes(signaturePart);
  if (!header || !payload || !signature) {
    return { ok: false, reason: 'malformed' };
  }
  // Only HS256. In particular "none" and asymmetric algorithms are refused.
  if (header.alg !== 'HS256') {
    return { ok: false, reason: 'unsupported_algorithm' };
  }

  const expected = await hmacSha256(
    config.clientSecret,
    encoder.encode(`${headerPart}.${payloadPart}`),
  );
  if (!timingSafeEqualBytes(signature, expected)) {
    return { ok: false, reason: 'bad_signature' };
  }

  if (typeof payload.exp !== 'number' || nowSeconds > payload.exp + LEEWAY_SECONDS) {
    return { ok: false, reason: 'expired' };
  }
  if (typeof payload.nbf !== 'number' || nowSeconds < payload.nbf - LEEWAY_SECONDS) {
    return { ok: false, reason: 'not_yet_valid' };
  }
  if (payload.aud !== config.clientId) {
    return { ok: false, reason: 'wrong_audience' };
  }

  const issuerHost = hostOf(payload.iss);
  const destinationHost = hostOf(payload.dest);
  const shop = config.shopDomain.toLowerCase();
  if (!issuerHost || issuerHost !== destinationHost || destinationHost !== shop) {
    return { ok: false, reason: 'wrong_shop' };
  }

  if (typeof payload.sub !== 'string' || !/^[0-9]{1,19}$/.test(payload.sub)) {
    return { ok: false, reason: 'malformed' };
  }
  return { ok: true, shopifyUserId: payload.sub, shopDomain: shop };
}
