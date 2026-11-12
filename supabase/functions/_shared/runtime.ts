// Wires the handlers to the real world: Supabase (service role), Stripe and
// the environment. This is the only module that reads secrets. Handlers and
// their tests never import it.
import { createClient } from '@supabase/supabase-js';

import type { Auth, Db, Deps, WebhookDeps } from './deps.ts';
import { DbError } from './errors.ts';
import { type Logger, respond, responseFromError } from './http.ts';
import { createStripeClient, type StripeMode } from './stripe.ts';

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required secret: ${name}`);
  }
  return value;
}

const log: Logger = (message, detail) => {
  // Structured, one line per event. Callers pass ids and codes only: never
  // request bodies, tokens, keys or customer details.
  console.error(JSON.stringify({ level: 'error', message, ...detail }));
};

function createDeps(): Deps {
  const client = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const db: Db = {
    async rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
      const { data, error } = await client.rpc(fn, args);
      if (error) {
        throw new DbError(error.code ?? 'XX000', error.message);
      }
      return data as T;
    },
    async getActiveEmployee(userId) {
      const { data, error } = await client
        .from('employees')
        .select('id, role')
        .eq('id', userId)
        .eq('is_active', true)
        .maybeSingle();
      if (error) {
        throw new DbError(error.code ?? 'XX000', error.message);
      }
      return data;
    },
    async listOpenPaymentIntents(orderId) {
      const { data, error } = await client
        .from('payments')
        .select('provider_payment_intent')
        .eq('order_id', orderId)
        .in('status', ['requires_payment_method', 'processing']);
      if (error) {
        throw new DbError(error.code ?? 'XX000', error.message);
      }
      return (data ?? []).map((row) => row.provider_payment_intent as string);
    },
    async getRefundPaymentIntent(refundId) {
      const { data: refund, error: refundError } = await client
        .from('refunds')
        .select('payment_id')
        .eq('id', refundId)
        .maybeSingle();
      if (refundError) {
        throw new DbError(refundError.code ?? 'XX000', refundError.message);
      }
      if (!refund) {
        return null;
      }
      const { data: payment, error: paymentError } = await client
        .from('payments')
        .select('provider_payment_intent')
        .eq('id', refund.payment_id)
        .maybeSingle();
      if (paymentError) {
        throw new DbError(paymentError.code ?? 'XX000', paymentError.message);
      }
      return (payment?.provider_payment_intent as string | undefined) ?? null;
    },
  };

  const auth: Auth = {
    async getUserId(accessToken) {
      const { data, error } = await client.auth.getUser(accessToken);
      return error ? null : (data.user?.id ?? null);
    },
  };

  // Test mode unless the deployment explicitly says live.
  const stripeMode: StripeMode = Deno.env.get('STRIPE_MODE') === 'live' ? 'live' : 'test';
  const stripe = createStripeClient({
    secretKey: requireEnv('STRIPE_SECRET_KEY'),
    mode: stripeMode,
    apiVersion: Deno.env.get('STRIPE_API_VERSION') || undefined,
  });

  return { db, auth, stripe, stripeMode, log, now: () => Math.floor(Date.now() / 1000) };
}

let cached: Deps | null = null;

function deps(): Deps {
  cached ??= createDeps();
  return cached;
}

/** Serves a handler, converting anything it throws into a safe response. */
export function serve(handler: (req: Request, deps: Deps) => Promise<Response>): void {
  Deno.serve((req) => {
    try {
      return respond(handler, req, deps());
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
        ...deps(),
        webhookSecret: requireEnv('STRIPE_WEBHOOK_SECRET'),
      });
    } catch (error) {
      return responseFromError(error, log);
    }
  });
}
