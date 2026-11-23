#!/usr/bin/env node
// After a deploy: checks that the live backend and the Shopify store can
// actually talk to each other. It changes nothing: no order, customer,
// discount or points are created.
//
//   1. The backend refuses an unsigned webhook and an anonymous till request.
//   2. The backend accepts a webhook signed with the Shopify client secret,
//      which proves it holds the same secret and store domain that GitHub does.
//      (The topic is one the backend does not act on.)
//   3. Shopify gives the app an access token for the store, which proves the
//      app is installed there and both belong to the same organization.
//   4. That token carries every permission the backend needs.
//
// Usage: node scripts/deploy-verify.mjs   (reads the same settings as the preflight)
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { inspect } from './deploy-preflight.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Scopes from shopify.app.toml, e.g. ["read_orders", "write_customers"]. */
export function requiredScopes(appToml) {
  const scopes = /^scopes\s*=\s*"([^"]*)"/m.exec(appToml)?.[1] ?? '';
  return scopes
    .split(',')
    .map((scope) => scope.trim())
    .filter(Boolean);
}

/** Shopify grants read_x along with write_x, and may list only the latter. */
export function missingScopes(required, granted) {
  const have = new Set(granted);
  return required.filter((scope) => {
    if (have.has(scope)) {
      return false;
    }
    return !(scope.startsWith('read_') && have.has(`write_${scope.slice('read_'.length)}`));
  });
}

export function signWebhook(body, secret) {
  return createHmac('sha256', secret).update(body).digest('base64');
}

/**
 * Runs the checks. Returns [{ name, ok, detail }]. `detail` never contains a
 * secret or a token.
 */
export async function verify({ settings, clientSecret, appToml, apiVersion, fetch: doFetch }) {
  const results = [];
  const record = (name, ok, detail) => results.push({ name, ok, detail });
  const functionsUrl = `https://${settings.projectRef}.supabase.co/functions/v1`;

  async function attempt(name, run) {
    try {
      await run();
    } catch (error) {
      record(
        name,
        false,
        `could not be checked: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  await attempt('The backend refuses an unsigned webhook', async () => {
    const response = await doFetch(`${functionsUrl}/shopify-webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    record(
      'The backend refuses an unsigned webhook',
      response.status === 401,
      `HTTP ${response.status}, expected 401`,
    );
  });

  await attempt('The backend refuses a till request with no Shopify session', async () => {
    const response = await doFetch(`${functionsUrl}/pos-member`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ membership_code: '0'.repeat(32) }),
    });
    record(
      'The backend refuses a till request with no Shopify session',
      response.status === 401,
      `HTTP ${response.status}, expected 401`,
    );
  });

  await attempt('The backend accepts a webhook signed with the Shopify client secret', async () => {
    const body = JSON.stringify({ check: 'bro-batch-deploy' });
    const response = await doFetch(`${functionsUrl}/shopify-webhook`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-shopify-hmac-sha256': signWebhook(body, clientSecret),
        'x-shopify-shop-domain': settings.shopDomain,
        // A topic the backend does not act on, so nothing is recorded.
        'x-shopify-topic': 'brobatch/deploy-check',
        'x-shopify-webhook-id': `deploy-check-${Date.now()}`,
      },
      body,
    });
    let outcome = '';
    try {
      outcome = (await response.json())?.outcome ?? '';
    } catch {
      // reported below
    }
    record(
      'The backend accepts a webhook signed with the Shopify client secret',
      response.status === 200 && outcome === 'unhandled',
      response.status === 401
        ? 'HTTP 401: the backend has a different client secret or store domain than GitHub does'
        : `HTTP ${response.status}, outcome "${outcome}", expected 200 "unhandled"`,
    );
  });

  let token = '';
  await attempt('Shopify gives the app access to the store', async () => {
    const response = await doFetch(`https://${settings.shopDomain}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: settings.clientId,
        client_secret: clientSecret,
      }).toString(),
    });
    let payload = {};
    try {
      payload = await response.json();
    } catch {
      // reported below
    }
    if (response.status !== 200 || typeof payload.access_token !== 'string') {
      const reason = typeof payload.error === 'string' ? payload.error : `HTTP ${response.status}`;
      record(
        'Shopify gives the app access to the store',
        false,
        `${reason}. Check the app is installed on ${settings.shopDomain}, and that the app and the store are in the same Shopify organization.`,
      );
      return;
    }
    token = payload.access_token;
    record('Shopify gives the app access to the store', true, 'access token issued');

    const granted = String(payload.scope ?? '')
      .split(',')
      .map((scope) => scope.trim())
      .filter(Boolean);
    const missing = missingScopes(requiredScopes(appToml), granted);
    record(
      'The app has every permission the backend needs',
      missing.length === 0,
      missing.length === 0
        ? `granted: ${granted.join(', ')}`
        : `missing: ${missing.join(', ')}. Deploy the app again, then approve the new permissions in Shopify admin.`,
    );
  });

  if (token) {
    await attempt('The Shopify Admin API answers', async () => {
      const response = await doFetch(
        `https://${settings.shopDomain}/admin/api/${apiVersion}/graphql.json`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-shopify-access-token': token },
          body: JSON.stringify({ query: '{ shop { name currencyCode } }' }),
        },
      );
      let shop;
      try {
        shop = (await response.json())?.data?.shop;
      } catch {
        // reported below
      }
      record(
        'The Shopify Admin API answers',
        response.status === 200 && typeof shop?.name === 'string',
        shop?.name
          ? `store "${shop.name}", currency ${shop.currencyCode}`
          : `HTTP ${response.status} from API version ${apiVersion}`,
      );
      if (shop?.currencyCode && shop.currencyCode !== 'USD') {
        record(
          'The store sells in US dollars',
          false,
          `the store's currency is ${shop.currencyCode}; points are worked out per US dollar`,
        );
      }
    });
  }

  return results;
}

async function main() {
  const appToml = readFileSync(join(root, 'apps/shopify/shopify.app.toml'), 'utf8');
  const { settings, problems } = inspect({
    appToml,
    configTs: readFileSync(join(root, 'apps/shopify/extensions/loyalty-pos/src/config.ts'), 'utf8'),
    env: process.env,
  });
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET ?? '';
  if (problems.length > 0 || !clientSecret) {
    console.error('Not configured. Run: node scripts/deploy-preflight.mjs verify');
    process.exit(1);
  }

  const results = await verify({
    settings,
    clientSecret,
    appToml,
    apiVersion: process.env.SHOPIFY_API_VERSION ?? '2026-10',
    fetch,
  });
  for (const result of results) {
    console.log(`${result.ok ? 'PASS' : 'FAIL'}  ${result.name}\n      ${result.detail}`);
  }
  const failed = results.filter((result) => !result.ok).length;
  console.log(failed === 0 ? '\nAll checks passed.' : `\n${failed} check(s) failed.`);
  process.exit(failed === 0 ? 0 : 1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
