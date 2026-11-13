#!/usr/bin/env node
// Refuses to deploy a half-configured project.
//
// The Shopify app and the backend each need a few values that are not secret
// (the Shopify client ID, the store's domain, the Supabase project ref) and a
// few that are (tokens, the client secret). The non-secret ones are committed
// in three files; the secret ones are repository secrets on GitHub. This
// script checks that the committed values are filled in and agree with each
// other, and that the secrets a deploy step needs are present. It prints
// names only, never values.
//
// Usage: node scripts/deploy-preflight.mjs <check-setup|shopify-app|backend|verify>
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export const SECRETS_FOR_STEP = {
  'shopify-app': ['SHOPIFY_SERVICE_ACCOUNT_TOKEN'],
  backend: ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD', 'SHOPIFY_CLIENT_SECRET'],
  verify: ['SHOPIFY_CLIENT_SECRET'],
};
SECRETS_FOR_STEP['check-setup'] = [...new Set(Object.values(SECRETS_FOR_STEP).flat())];

const PROJECT_REF = /^[a-z]{20}$/;
const SHOP_DOMAIN = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;
// Shopify client IDs are 32 hex characters today; anything of that general
// shape is accepted so a format change at Shopify does not block a deploy.
const CLIENT_ID = /^[0-9a-zA-Z]{20,64}$/;

/** Returns { settings, problems } from the committed files and the environment. */
export function inspect({ appToml, configTs, env }) {
  const problems = [];
  const settings = {};

  const clientId = /^client_id\s*=\s*"([^"]*)"/m.exec(appToml)?.[1] ?? '';
  if (!CLIENT_ID.test(clientId)) {
    problems.push(
      "apps/shopify/shopify.app.toml: client_id is not filled in with the Shopify app's client ID.",
    );
  } else {
    settings.clientId = clientId;
  }

  const webhookRef =
    /^uri\s*=\s*"https:\/\/([^."]+)\.supabase\.co\/functions\/v1\/shopify-webhook"/m.exec(
      appToml,
    )?.[1] ?? '';
  const tileRef =
    /BACKEND_URL\s*=\s*'https:\/\/([^.']+)\.supabase\.co\/functions\/v1'/.exec(configTs)?.[1] ?? '';
  const envRef = env.SUPABASE_PROJECT_REF ?? '';

  const refs = {
    'apps/shopify/shopify.app.toml (webhook uri)': webhookRef,
    'apps/shopify/extensions/loyalty-pos/src/config.ts (BACKEND_URL)': tileRef,
    '.github/workflows/deploy.yml (SUPABASE_PROJECT_REF)': envRef,
  };
  for (const [where, ref] of Object.entries(refs)) {
    if (!PROJECT_REF.test(ref)) {
      problems.push(`${where}: the Supabase project ref is not filled in.`);
    }
  }
  const distinct = new Set(Object.values(refs).filter((ref) => PROJECT_REF.test(ref)));
  if (distinct.size > 1) {
    problems.push(
      `The Supabase project ref differs between files: ${[...distinct].join(', ')}. The till, the webhook and the deploy must all point at the same project.`,
    );
  } else if (distinct.size === 1 && problems.every((p) => !p.includes('project ref is not'))) {
    settings.projectRef = envRef;
  }

  const shop = env.SHOPIFY_SHOP_DOMAIN ?? '';
  if (!SHOP_DOMAIN.test(shop)) {
    problems.push(
      ".github/workflows/deploy.yml (SHOPIFY_SHOP_DOMAIN): must be the store's something.myshopify.com domain.",
    );
  } else {
    settings.shopDomain = shop;
  }

  return { settings, problems };
}

export function missingSecrets(step, env) {
  return (SECRETS_FOR_STEP[step] ?? []).filter((name) => !env[name]);
}

function main() {
  const step = process.argv[2];
  if (!step || !(step in SECRETS_FOR_STEP)) {
    console.error(`usage: deploy-preflight.mjs <${Object.keys(SECRETS_FOR_STEP).join('|')}>`);
    process.exit(2);
  }

  const { settings, problems } = inspect({
    appToml: readFileSync(join(root, 'apps/shopify/shopify.app.toml'), 'utf8'),
    configTs: readFileSync(join(root, 'apps/shopify/extensions/loyalty-pos/src/config.ts'), 'utf8'),
    env: process.env,
  });
  const missing = missingSecrets(step, process.env);

  console.log(`Preflight for "${step}"`);
  console.log(`  Shopify client ID:    ${settings.clientId ? 'set' : 'NOT SET'}`);
  console.log(`  Shopify store:        ${settings.shopDomain ?? 'NOT SET'}`);
  console.log(`  Supabase project ref: ${settings.projectRef ?? 'NOT SET'}`);
  for (const name of SECRETS_FOR_STEP[step]) {
    console.log(`  secret ${name}: ${missing.includes(name) ? 'MISSING' : 'present'}`);
  }

  if (problems.length > 0 || missing.length > 0) {
    console.error('\nNot ready to deploy:');
    for (const problem of problems) {
      console.error(`  - ${problem}`);
    }
    for (const name of missing) {
      console.error(
        `  - Repository secret ${name} is not set (GitHub: Settings > Secrets and variables > Actions).`,
      );
    }
    console.error('\nSee docs/RUNBOOK.md, "Connect Shopify".');
    process.exit(1);
  }
  console.log('\nReady.');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
