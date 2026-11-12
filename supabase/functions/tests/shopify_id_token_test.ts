import assert from 'node:assert/strict';

import { verifyIdToken } from '../_shared/shopify_id_token.ts';
import { CLIENT_ID, CLIENT_SECRET, idToken, NOW, SHOP, SHOPIFY_USER_ID } from './fakes.ts';

const CONFIG = { clientId: CLIENT_ID, clientSecret: CLIENT_SECRET, shopDomain: SHOP };

Deno.test('id token: a valid token for our store and app is accepted', async () => {
  assert.deepEqual(await verifyIdToken(await idToken(), CONFIG, NOW), {
    ok: true,
    shopifyUserId: SHOPIFY_USER_ID,
    shopDomain: SHOP,
  });
});

Deno.test('id token: a token signed with another secret is rejected', async () => {
  const forged = await idToken({}, { secret: 'shpss_attacker_guess' });
  assert.deepEqual(await verifyIdToken(forged, CONFIG, NOW), {
    ok: false,
    reason: 'bad_signature',
  });
});

Deno.test('id token: changing a claim after signing is rejected', async () => {
  const token = await idToken();
  const [header, , signature] = token.split('.');
  const edited = btoa(
    JSON.stringify({
      iss: `https://${SHOP}/admin`,
      dest: `https://${SHOP}`,
      aud: CLIENT_ID,
      sub: '1',
      exp: NOW + 600,
      nbf: NOW,
    }),
  )
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
  const result = await verifyIdToken(`${header}.${edited}.${signature}`, CONFIG, NOW);
  assert.deepEqual(result, { ok: false, reason: 'bad_signature' });
});

Deno.test('id token: the "none" algorithm and other algorithms are refused', async () => {
  for (const alg of ['none', 'HS512', 'RS256']) {
    const token = await idToken({}, { header: { alg, typ: 'JWT' } });
    assert.deepEqual(await verifyIdToken(token, CONFIG, NOW), {
      ok: false,
      reason: 'unsupported_algorithm',
    });
  }
  const unsigned =
    (await idToken({}, { header: { alg: 'none' } })).split('.').slice(0, 2).join('.') + '.';
  assert.equal((await verifyIdToken(unsigned, CONFIG, NOW)).ok, false);
});

Deno.test('id token: an expired token is rejected, with a few seconds of leeway', async () => {
  const token = await idToken({ exp: NOW - 5 });
  assert.equal((await verifyIdToken(token, CONFIG, NOW)).ok, true, 'within leeway');
  const old = await idToken({ exp: NOW - 60 });
  assert.deepEqual(await verifyIdToken(old, CONFIG, NOW), { ok: false, reason: 'expired' });
});

Deno.test('id token: a token that is not valid yet is rejected', async () => {
  const token = await idToken({ nbf: NOW + 120, exp: NOW + 180 });
  assert.deepEqual(await verifyIdToken(token, CONFIG, NOW), { ok: false, reason: 'not_yet_valid' });
});

Deno.test('id token: a token issued for another app is rejected', async () => {
  const token = await idToken({ aud: 'some-other-app' });
  assert.deepEqual(await verifyIdToken(token, CONFIG, NOW), {
    ok: false,
    reason: 'wrong_audience',
  });
});

Deno.test('id token: a token from another store is rejected', async () => {
  const other = 'someone-else.myshopify.com';
  const token = await idToken({ iss: `https://${other}/admin`, dest: `https://${other}` });
  assert.deepEqual(await verifyIdToken(token, CONFIG, NOW), { ok: false, reason: 'wrong_shop' });
});

Deno.test('id token: issuer and destination must agree', async () => {
  const token = await idToken({ dest: 'https://someone-else.myshopify.com' });
  assert.deepEqual(await verifyIdToken(token, CONFIG, NOW), { ok: false, reason: 'wrong_shop' });
});

Deno.test('id token: missing expiry or subject is rejected', async () => {
  assert.equal((await verifyIdToken(await idToken({ exp: undefined }), CONFIG, NOW)).ok, false);
  assert.equal((await verifyIdToken(await idToken({ nbf: undefined }), CONFIG, NOW)).ok, false);
  assert.equal((await verifyIdToken(await idToken({ sub: undefined }), CONFIG, NOW)).ok, false);
  assert.equal(
    (await verifyIdToken(await idToken({ sub: 'not-a-number' }), CONFIG, NOW)).ok,
    false,
  );
});

Deno.test('id token: garbage is rejected without throwing', async () => {
  for (const bad of ['', 'abc', 'a.b', 'a.b.c.d', '..', 'a..c', '!!!.###.$$$', 'e30.e30.e30']) {
    assert.equal((await verifyIdToken(bad, CONFIG, NOW)).ok, false, bad);
  }
});
