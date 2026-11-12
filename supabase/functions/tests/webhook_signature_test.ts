import assert from 'node:assert/strict';

import { computeSignature, timingSafeEqual, verifyStripeSignature } from '../_shared/webhook.ts';

const SECRET = ['whsec', 'test', 'fixture', 'secret'].join('_');
const BODY = '{"id":"evt_test_1","type":"payment_intent.succeeded"}';
const NOW = 1_800_000_000;

async function header(timestamp: number, body = BODY, secret = SECRET): Promise<string> {
  return `t=${timestamp},v1=${await computeSignature(secret, timestamp, body)}`;
}

Deno.test('signature: matches the published HMAC-SHA256 construction', async () => {
  // Known answer, computed independently with:
  //   printf '1700000000.{}' | openssl dgst -sha256 -hmac secret
  assert.equal(
    await computeSignature('secret', 1_700_000_000, '{}'),
    'b8569b78799ff9e3cbff0fc2d63a33a2b57f3282abd07c37ae5e8e7d79a5f163',
  );
  // And cross-checked against Node's crypto implementation.
  const { createHmac } = await import('node:crypto');
  const expected = createHmac('sha256', SECRET).update(`${NOW}.${BODY}`).digest('hex');
  assert.equal(await computeSignature(SECRET, NOW, BODY), expected);
});

Deno.test('signature: a correctly signed delivery is accepted', async () => {
  const result = await verifyStripeSignature(BODY, await header(NOW), SECRET, NOW);
  assert.deepEqual(result, { ok: true, timestamp: NOW });
});

Deno.test('signature: a body changed by one character is rejected', async () => {
  const tampered = BODY.replace('succeeded', 'succeedeD');
  const result = await verifyStripeSignature(tampered, await header(NOW), SECRET, NOW);
  assert.deepEqual(result, { ok: false, reason: 'no_matching_signature' });
});

Deno.test('signature: an amount edited in transit is rejected', async () => {
  const original = '{"id":"evt_1","data":{"object":{"amount_received":900}}}';
  const edited = original.replace('900', '9');
  const result = await verifyStripeSignature(edited, await header(NOW, original), SECRET, NOW);
  assert.equal(result.ok, false);
});

Deno.test('signature: a signature made with a different secret is rejected', async () => {
  const forged = await header(NOW, BODY, 'whsec_attacker_guess');
  const result = await verifyStripeSignature(BODY, forged, SECRET, NOW);
  assert.deepEqual(result, { ok: false, reason: 'no_matching_signature' });
});

Deno.test('signature: a missing header is rejected', async () => {
  assert.deepEqual(await verifyStripeSignature(BODY, null, SECRET, NOW), {
    ok: false,
    reason: 'missing_header',
  });
  assert.deepEqual(await verifyStripeSignature(BODY, '', SECRET, NOW), {
    ok: false,
    reason: 'missing_header',
  });
});

Deno.test('signature: malformed headers are rejected', async () => {
  const valid = await computeSignature(SECRET, NOW, BODY);
  for (const bad of [
    'garbage',
    `v1=${valid}`, // no timestamp
    `t=${NOW}`, // no signature
    `t=abc,v1=${valid}`,
    `t=${NOW},v1=short`,
    `t=${NOW},v0=${valid}`, // only an unsupported scheme
    `t=${NOW},v1=${valid.toUpperCase()}`,
  ]) {
    const result = await verifyStripeSignature(BODY, bad, SECRET, NOW);
    assert.equal(result.ok, false, `expected rejection for: ${bad}`);
  }
});

Deno.test('signature: a replayed delivery older than five minutes is rejected', async () => {
  const old = NOW - 301;
  const result = await verifyStripeSignature(BODY, await header(old), SECRET, NOW);
  assert.deepEqual(result, { ok: false, reason: 'timestamp_out_of_tolerance' });
});

Deno.test('signature: a delivery exactly at the tolerance is accepted', async () => {
  const edge = NOW - 300;
  const result = await verifyStripeSignature(BODY, await header(edge), SECRET, NOW);
  assert.equal(result.ok, true);
});

Deno.test('signature: a timestamp far in the future is rejected', async () => {
  const future = NOW + 301;
  const result = await verifyStripeSignature(BODY, await header(future), SECRET, NOW);
  assert.deepEqual(result, { ok: false, reason: 'timestamp_out_of_tolerance' });
});

Deno.test('signature: the timestamp is part of what is signed', async () => {
  // Re-using a valid signature with a fresher timestamp must fail.
  const signature = await computeSignature(SECRET, NOW - 10_000, BODY);
  const result = await verifyStripeSignature(BODY, `t=${NOW},v1=${signature}`, SECRET, NOW);
  assert.deepEqual(result, { ok: false, reason: 'no_matching_signature' });
});

Deno.test('signature: any one of several v1 signatures may match (secret rotation)', async () => {
  const good = await computeSignature(SECRET, NOW, BODY);
  const other = await computeSignature('whsec_previous_secret', NOW, BODY);
  const result = await verifyStripeSignature(BODY, `t=${NOW},v1=${other},v1=${good}`, SECRET, NOW);
  assert.equal(result.ok, true);
});

Deno.test('signature: verification uses the exact bytes, not re-serialised JSON', async () => {
  const spaced = '{ "id": "evt_test_1" }';
  const compact = '{"id":"evt_test_1"}';
  const result = await verifyStripeSignature(compact, await header(NOW, spaced), SECRET, NOW);
  assert.equal(result.ok, false);
});

Deno.test('timingSafeEqual: equal and unequal strings', () => {
  assert.equal(timingSafeEqual('abc', 'abc'), true);
  assert.equal(timingSafeEqual('abc', 'abd'), false);
  assert.equal(timingSafeEqual('abc', 'abcd'), false);
  assert.equal(timingSafeEqual('', ''), true);
});
