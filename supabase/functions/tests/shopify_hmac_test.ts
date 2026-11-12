import assert from 'node:assert/strict';

import {
  computeWebhookHmac,
  timingSafeEqualBytes,
  verifyWebhookHmac,
} from '../_shared/shopify_hmac.ts';

const SECRET = ['shpss', 'test', 'fixture', 'secret'].join('_');
const encoder = new TextEncoder();
const BODY = encoder.encode('{"id":820982911946154508,"financial_status":"paid"}');

Deno.test('webhook hmac: matches a known answer computed with openssl', async () => {
  // printf '{"id":1}' | openssl dgst -sha256 -hmac shpss_known_answer -binary | base64
  assert.equal(
    await computeWebhookHmac('shpss_known_answer', encoder.encode('{"id":1}')),
    'prowN0duQgxzBtmOPs2ZVxMm/UzqSfXRMbl7brDYn6Q=',
  );
});

Deno.test("webhook hmac: matches Node's implementation", async () => {
  const { createHmac } = await import('node:crypto');
  const expected = createHmac('sha256', SECRET).update(BODY).digest('base64');
  assert.equal(await computeWebhookHmac(SECRET, BODY), expected);
});

Deno.test('webhook hmac: a correctly signed body is accepted', async () => {
  assert.equal(await verifyWebhookHmac(BODY, await computeWebhookHmac(SECRET, BODY), SECRET), true);
});

Deno.test('webhook hmac: a body changed by one character is rejected', async () => {
  const header = await computeWebhookHmac(SECRET, BODY);
  const tampered = encoder.encode('{"id":820982911946154508,"financial_status":"Paid"}');
  assert.equal(await verifyWebhookHmac(tampered, header, SECRET), false);
});

Deno.test('webhook hmac: an amount edited in transit is rejected', async () => {
  const original = encoder.encode('{"id":1,"subtotal_price":"9.00"}');
  const edited = encoder.encode('{"id":1,"subtotal_price":"9000.00"}');
  assert.equal(
    await verifyWebhookHmac(edited, await computeWebhookHmac(SECRET, original), SECRET),
    false,
  );
});

Deno.test('webhook hmac: a signature made with a different secret is rejected', async () => {
  const forged = await computeWebhookHmac('shpss_attacker_guess', BODY);
  assert.equal(await verifyWebhookHmac(BODY, forged, SECRET), false);
});

Deno.test('webhook hmac: missing, empty and malformed headers are rejected', async () => {
  const valid = await computeWebhookHmac(SECRET, BODY);
  for (const bad of [null, '', 'not base64 !!!', 'aGVsbG8=', valid.slice(0, -4), `${valid}AAAA`]) {
    assert.equal(await verifyWebhookHmac(BODY, bad, SECRET), false, String(bad));
  }
});

Deno.test('webhook hmac: verification fails closed when the secret is not configured', async () => {
  const header = await computeWebhookHmac(SECRET, BODY);
  assert.equal(await verifyWebhookHmac(BODY, header, ''), false);
});

Deno.test('webhook hmac: verification uses the exact bytes, not re-serialised JSON', async () => {
  const spaced = encoder.encode('{ "id": 1 }');
  const compact = encoder.encode('{"id":1}');
  assert.equal(
    await verifyWebhookHmac(compact, await computeWebhookHmac(SECRET, spaced), SECRET),
    false,
  );
});

Deno.test('webhook hmac: surrounding whitespace in the header is tolerated', async () => {
  const header = await computeWebhookHmac(SECRET, BODY);
  assert.equal(await verifyWebhookHmac(BODY, ` ${header}\n`, SECRET), true);
});

Deno.test('timingSafeEqualBytes: equal, unequal and different lengths', () => {
  const bytes = (...values: number[]) => new Uint8Array(values);
  assert.equal(timingSafeEqualBytes(bytes(1, 2, 3), bytes(1, 2, 3)), true);
  assert.equal(timingSafeEqualBytes(bytes(1, 2, 3), bytes(1, 2, 4)), false);
  assert.equal(timingSafeEqualBytes(bytes(1, 2, 3), bytes(1, 2, 3, 0)), false);
  assert.equal(timingSafeEqualBytes(bytes(), bytes()), true);
});
