// Shopify webhook verification.
//
// Shopify signs each delivery: the X-Shopify-Hmac-Sha256 header is the
// base64-encoded HMAC-SHA256 of the raw request body, keyed with the app's
// client secret. We recompute it over the exact bytes received and compare
// the two digests in constant time.
//
// Unlike some providers, Shopify does not sign a timestamp, so a captured
// delivery could be replayed. That is harmless here: every delivery carries
// an X-Shopify-Webhook-Id, and the database applies each id once.

const encoder = new TextEncoder();

function fromBase64(value: string): Uint8Array | null {
  try {
    const binary = atob(value.trim());
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch {
    return null;
  }
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

/** Compares two byte strings without leaking where they first differ. */
export function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }
  return difference === 0;
}

export async function hmacSha256(secret: string, data: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, data as BufferSource));
}

/** The value Shopify would put in X-Shopify-Hmac-Sha256 for this body. */
export async function computeWebhookHmac(secret: string, rawBody: Uint8Array): Promise<string> {
  return toBase64(await hmacSha256(secret, rawBody));
}

export async function verifyWebhookHmac(
  rawBody: Uint8Array,
  header: string | null,
  secret: string,
): Promise<boolean> {
  if (!header || !secret) {
    return false;
  }
  const received = fromBase64(header);
  // A SHA-256 digest is always 32 bytes.
  if (!received || received.length !== 32) {
    return false;
  }
  return timingSafeEqualBytes(received, await hmacSha256(secret, rawBody));
}
