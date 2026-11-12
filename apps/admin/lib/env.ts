// Environment handling for the admin app.
//
// Only NEXT_PUBLIC_* variables reach the browser. They may hold the Supabase
// URL and the anon (publishable) key, and nothing else. Secrets (service-role
// key, Shopify client secret) are read on the server only.
import { z } from 'zod';

type EnvSource = Readonly<Record<string, string | undefined>>;

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export type PublicEnvResult =
  | { readonly ok: true; readonly env: PublicEnv }
  | { readonly ok: false; readonly problems: readonly string[] };

/** Reads the browser-safe configuration, reporting what is missing or malformed. */
export function readPublicEnv(source: EnvSource): PublicEnvResult {
  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: source.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: source.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (parsed.success) {
    return { ok: true, env: parsed.data };
  }
  return {
    ok: false,
    problems: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
  };
}

const SECRET_PREFIXES = [
  'shpss_', // Shopify app client secret
  'shpat_', // Shopify Admin API access token
  'shpca_',
  'sk_live_',
  'sk_test_',
  'rk_live_',
  'rk_test_',
  'whsec_',
  'sb_secret_',
];

function jwtRole(value: string): string | null {
  const parts = value.split('.');
  if (parts.length !== 3 || !parts[1]) {
    return null;
  }
  try {
    const payload: unknown = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (typeof payload === 'object' && payload !== null && 'role' in payload) {
      return typeof payload.role === 'string' ? payload.role : null;
    }
  } catch {
    // Not a JWT.
  }
  return null;
}

/** True when a value has the shape of a credential that must stay server-side. */
export function looksLikeServerSecret(value: string): boolean {
  const trimmed = value.trim();
  return (
    SECRET_PREFIXES.some((prefix) => trimmed.startsWith(prefix)) ||
    trimmed.includes('PRIVATE KEY-----') ||
    jwtRole(trimmed) === 'service_role'
  );
}

/**
 * Throws if any NEXT_PUBLIC_* variable holds a server secret. Called from
 * next.config.ts so a misconfigured build fails instead of leaking the key
 * into browser JavaScript.
 */
export function assertNoSecretsInPublicEnv(source: EnvSource): void {
  const offenders = Object.entries(source)
    .filter(([name, value]) => name.startsWith('NEXT_PUBLIC_') && value !== undefined)
    .filter(([, value]) => looksLikeServerSecret(value ?? ''))
    .map(([name]) => name);

  if (offenders.length > 0) {
    throw new Error(
      `Server secret found in browser-exposed variable(s): ${offenders.join(', ')}. ` +
        'NEXT_PUBLIC_* values are shipped to every visitor. Move the secret to a server-only variable.',
    );
  }
}
