// Wires the handlers to the real world: Supabase (service role), Shopify and
// the environment. This is the only module that reads secrets. Handlers and
// their tests never import it.
import { createClient } from '@supabase/supabase-js';

import type { Db, Deps, WebhookDeps } from './deps.ts';
import { DbError } from './errors.ts';
import { type Logger, respond, respondWithCors, responseFromError } from './http.ts';
import { createShopifyAdmin } from './shopify_admin.ts';

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required secret: ${name}`);
  }
  return value;
}

const log: Logger = (message, detail) => {
  // Structured, one line per event. Callers pass ids and codes only: never
  // request bodies, tokens, secrets or customer details.
  console.error(JSON.stringify({ level: 'error', message, ...detail }));
};

function createDb(): Db {
  const client = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    async rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
      const { data, error } = await client.rpc(fn, args);
      if (error) {
        throw new DbError(error.code ?? 'XX000', error.message);
      }
      return data as T;
    },
    async getRedemption(redemptionId) {
      const { data, error } = await client
        .from('redemptions')
        .select(
          'id, customer_id, reward_id, status, points_cost, discount_code, shopify_discount_id, expires_at',
        )
        .eq('id', redemptionId)
        .maybeSingle();
      if (error) {
        throw new DbError(error.code ?? 'XX000', error.message);
      }
      return data;
    },
    async getPointsPerDollar() {
      const { data, error } = await client
        .from('app_settings')
        .select('points_per_dollar')
        .single();
      if (error) {
        throw new DbError(error.code ?? 'XX000', error.message);
      }
      return data.points_per_dollar as number;
    },
  };
}

let cachedDb: Db | null = null;
let cachedDeps: Deps | null = null;

function db(): Db {
  cachedDb ??= createDb();
  return cachedDb;
}

function deps(): Deps {
  if (!cachedDeps) {
    const shopDomain = requireEnv('SHOPIFY_SHOP_DOMAIN');
    const clientId = requireEnv('SHOPIFY_CLIENT_ID');
    const clientSecret = requireEnv('SHOPIFY_CLIENT_SECRET');
    cachedDeps = {
      db: db(),
      shopify: createShopifyAdmin({
        shopDomain,
        clientId,
        clientSecret,
        apiVersion: Deno.env.get('SHOPIFY_API_VERSION') || '2026-10',
      }),
      idToken: { clientId, clientSecret, shopDomain },
      log,
      now: () => Math.floor(Date.now() / 1000),
    };
  }
  return cachedDeps;
}

/** Serves a POS handler, converting anything it throws into a safe response. */
export function serve(handler: (req: Request, deps: Deps) => Promise<Response>): void {
  Deno.serve((req) => {
    try {
      return respondWithCors(handler, req, deps());
    } catch (error) {
      // Only reached when configuration is missing or invalid.
      return responseFromError(error, log);
    }
  });
}

export function serveWebhook(
  handler: (req: Request, deps: WebhookDeps) => Promise<Response>,
): void {
  Deno.serve((req) => {
    try {
      return respond(handler, req, {
        db: db(),
        log,
        webhookSecret: requireEnv('SHOPIFY_CLIENT_SECRET'),
        shopDomain: requireEnv('SHOPIFY_SHOP_DOMAIN'),
      });
    } catch (error) {
      return responseFromError(error, log);
    }
  });
}
