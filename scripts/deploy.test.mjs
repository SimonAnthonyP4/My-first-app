// Tests for the deploy preflight and the post-deploy verification.
// Run with: node --test scripts/
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { inspect, missingSecrets, SECRETS_FOR_STEP } from './deploy-preflight.mjs';
import { missingScopes, requiredScopes, signWebhook, verify } from './deploy-verify.mjs';

const REF = 'abcdefghijklmnopqrst';
const CLIENT_ID = '0123456789abcdef0123456789abcdef';
const SHOP = 'bro-batch.myshopify.com';
// Assembled so the file does not contain something shaped like a real secret.
const SECRET = ['shpss', 'test', 'fixture'].join('_');

const toml = (clientId = CLIENT_ID, ref = REF) => `
name = "Bro Batch Rewards"
client_id = "${clientId}"

[access_scopes]
scopes = "read_orders,read_customers,write_customers,read_products,read_discounts,write_discounts"

[[webhooks.subscriptions]]
topics = ["orders/paid", "refunds/create"]
uri = "https://${ref}.supabase.co/functions/v1/shopify-webhook"
`;
const configTs = (ref = REF) =>
  `export const BACKEND_URL = 'https://${ref}.supabase.co/functions/v1';`;
const env = (overrides = {}) => ({
  SUPABASE_PROJECT_REF: REF,
  SHOPIFY_SHOP_DOMAIN: SHOP,
  ...overrides,
});

// --- Preflight -----------------------------------------------------------------

test('preflight: a fully configured project has no problems', () => {
  const { settings, problems } = inspect({ appToml: toml(), configTs: configTs(), env: env() });
  assert.deepEqual(problems, []);
  assert.deepEqual(settings, { clientId: CLIENT_ID, projectRef: REF, shopDomain: SHOP });
});

test('preflight: the placeholders the repository ships with are all reported', () => {
  const { settings, problems } = inspect({
    appToml: toml('REPLACE_WITH_SHOPIFY_CLIENT_ID', 'REPLACE_WITH_PROJECT_REF'),
    configTs: configTs('REPLACE_WITH_PROJECT_REF'),
    env: env({
      SUPABASE_PROJECT_REF: 'REPLACE_WITH_PROJECT_REF',
      SHOPIFY_SHOP_DOMAIN: 'REPLACE_WITH_SHOP.myshopify.com',
    }),
  });
  assert.equal(problems.length, 5);
  assert.deepEqual(settings, {});
});

test('preflight: the till, the webhook and the deploy must name the same project', () => {
  const other = 'zzzzzzzzzzzzzzzzzzzz';
  for (const input of [
    { appToml: toml(CLIENT_ID, other), configTs: configTs(), env: env() },
    { appToml: toml(), configTs: configTs(other), env: env() },
    { appToml: toml(), configTs: configTs(), env: env({ SUPABASE_PROJECT_REF: other }) },
  ]) {
    const { settings, problems } = inspect(input);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /differs between files/);
    assert.equal(settings.projectRef, undefined);
  }
});

test('preflight: the store must be a myshopify.com domain, not a custom one or a URL', () => {
  for (const shop of ['brobatch.com', 'https://bro-batch.myshopify.com', 'bro-batch', '']) {
    const { problems } = inspect({
      appToml: toml(),
      configTs: configTs(),
      env: env({ SHOPIFY_SHOP_DOMAIN: shop }),
    });
    assert.equal(problems.length, 1, shop);
  }
});

test('preflight: each step asks only for the secrets it uses', () => {
  assert.deepEqual(missingSecrets('shopify-app', {}), ['SHOPIFY_SERVICE_ACCOUNT_TOKEN']);
  assert.deepEqual(missingSecrets('backend', { SUPABASE_ACCESS_TOKEN: 'x' }), [
    'SUPABASE_DB_PASSWORD',
    'SHOPIFY_CLIENT_SECRET',
  ]);
  assert.deepEqual(missingSecrets('verify', { SHOPIFY_CLIENT_SECRET: 'x' }), []);
  assert.equal(SECRETS_FOR_STEP['check-setup'].length, 4);
  assert.deepEqual(missingSecrets('backend', { SUPABASE_ACCESS_TOKEN: '' }).length, 3);
});

// --- Scopes ----------------------------------------------------------------------

test('scopes: read from the app configuration', () => {
  assert.deepEqual(requiredScopes(toml()), [
    'read_orders',
    'read_customers',
    'write_customers',
    'read_products',
    'read_discounts',
    'write_discounts',
  ]);
});

test('scopes: a write permission covers its read permission, and nothing else is assumed', () => {
  const required = requiredScopes(toml());
  assert.deepEqual(
    missingScopes(required, ['read_orders', 'write_customers', 'read_products', 'write_discounts']),
    [],
  );
  assert.deepEqual(missingScopes(required, ['write_customers', 'write_discounts']), [
    'read_orders',
    'read_products',
  ]);
  assert.deepEqual(missingScopes(required, ['read_orders', 'read_customers', 'read_products']), [
    'write_customers',
    'read_discounts',
    'write_discounts',
  ]);
});

// --- Verification ----------------------------------------------------------------

test('signing matches the known answer the backend is tested against', () => {
  // Same vector as supabase/functions/tests/shopify_hmac_test.ts.
  assert.equal(
    signWebhook('{"id":1}', 'shpss_known_answer'),
    'prowN0duQgxzBtmOPs2ZVxMm/UzqSfXRMbl7brDYn6Q=',
  );
});

/** A stand-in for the deployed backend and for Shopify. */
function world(overrides = {}) {
  const state = {
    backendSecret: SECRET,
    backendShop: SHOP,
    installed: true,
    grantedScope: 'read_orders,write_customers,read_products,write_discounts',
    currency: 'USD',
    calls: [],
    ...overrides,
  };
  const reply = (status, body) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });

  state.fetch = async (url, init) => {
    const headers = new Headers(init.headers);
    state.calls.push({ url, headers, body: init.body });

    if (url === `https://${REF}.supabase.co/functions/v1/shopify-webhook`) {
      const signature = headers.get('x-shopify-hmac-sha256');
      if (signature !== signWebhook(init.body, state.backendSecret)) {
        return reply(401, { error: { code: 'invalid_signature' } });
      }
      if (headers.get('x-shopify-shop-domain') !== state.backendShop) {
        return reply(401, { error: { code: 'wrong_shop' } });
      }
      return reply(200, { received: true, outcome: 'unhandled' });
    }
    if (url === `https://${REF}.supabase.co/functions/v1/pos-member`) {
      return headers.get('authorization')
        ? reply(500, {})
        : reply(401, { error: { code: 'unauthenticated' } });
    }
    if (url === `https://${SHOP}/admin/oauth/access_token`) {
      const form = new URLSearchParams(init.body);
      if (
        !state.installed ||
        form.get('client_id') !== CLIENT_ID ||
        form.get('client_secret') !== SECRET ||
        form.get('grant_type') !== 'client_credentials'
      ) {
        return reply(400, { error: 'shop_not_permitted' });
      }
      return reply(200, {
        access_token: 'token-123',
        scope: state.grantedScope,
        expires_in: 86399,
      });
    }
    if (url === `https://${SHOP}/admin/api/2026-10/graphql.json`) {
      if (headers.get('x-shopify-access-token') !== 'token-123') {
        return reply(401, {});
      }
      return reply(200, { data: { shop: { name: 'Bro Batch', currencyCode: state.currency } } });
    }
    throw new Error(`unexpected request to ${url}`);
  };
  return state;
}

function run(state, clientSecret = SECRET) {
  return verify({
    settings: { clientId: CLIENT_ID, projectRef: REF, shopDomain: SHOP },
    clientSecret,
    appToml: toml(),
    apiVersion: '2026-10',
    fetch: state.fetch,
  });
}
const failed = (results) => results.filter((r) => !r.ok).map((r) => r.name);

test('verify: everything in place passes all six checks', async () => {
  const state = world();
  const results = await run(state);
  assert.equal(results.length, 6);
  assert.deepEqual(failed(results), []);
});

test('verify: the backend holding a different secret is caught', async () => {
  const results = await run(world({ backendSecret: 'something-else' }));
  assert.deepEqual(failed(results), [
    'The backend accepts a webhook signed with the Shopify client secret',
  ]);
});

test('verify: the backend configured for a different store is caught', async () => {
  const results = await run(world({ backendShop: 'other-store.myshopify.com' }));
  assert.deepEqual(failed(results), [
    'The backend accepts a webhook signed with the Shopify client secret',
  ]);
});

test('verify: an app that is not installed, or is in another organization, is caught', async () => {
  const results = await run(world({ installed: false }));
  assert.deepEqual(failed(results), ['Shopify gives the app access to the store']);
  assert.match(results.at(-1).detail, /shop_not_permitted.*same Shopify organization/);
});

test('verify: a missing permission is named', async () => {
  const results = await run(world({ grantedScope: 'read_orders,write_customers,read_products' }));
  assert.deepEqual(failed(results), ['The app has every permission the backend needs']);
  const detail = results.find((r) => !r.ok).detail;
  assert.match(detail, /missing: read_discounts, write_discounts/);
});

test('verify: a store that does not sell in US dollars is flagged', async () => {
  const results = await run(world({ currency: 'CAD' }));
  assert.deepEqual(failed(results), ['The store sells in US dollars']);
});

test('verify: a backend that is down fails its checks without stopping the Shopify ones', async () => {
  const state = world();
  const inner = state.fetch;
  state.fetch = async (url, init) => {
    if (url.includes('supabase.co')) {
      throw new TypeError('fetch failed');
    }
    return inner(url, init);
  };
  const results = await run(state);
  assert.equal(failed(results).length, 3);
  assert.equal(results.filter((r) => r.ok).length, 3);
});

test('verify: nothing it reports contains the secret or the access token', async () => {
  for (const state of [world(), world({ installed: false }), world({ backendSecret: 'x' })]) {
    const text = JSON.stringify(await run(state));
    assert.ok(!text.includes(SECRET));
    assert.ok(!text.includes('token-123'));
  }
});

test('verify: the secret is sent only to Shopify, never to the backend', async () => {
  const state = world();
  await run(state);
  for (const call of state.calls) {
    const sent = `${call.body} ${JSON.stringify([...call.headers])}`;
    assert.equal(sent.includes(SECRET), call.url === `https://${SHOP}/admin/oauth/access_token`);
  }
});
