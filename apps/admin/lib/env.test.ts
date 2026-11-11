import { describe, expect, it } from 'vitest';

import { assertNoSecretsInPublicEnv, looksLikeServerSecret, readPublicEnv } from './env.ts';

function fakeJwt(payload: Record<string, unknown>): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.c2lnbmF0dXJl`;
}

const anonKey = fakeJwt({ role: 'anon', iss: 'supabase' });
const serviceKey = fakeJwt({ role: 'service_role', iss: 'supabase' });

describe('readPublicEnv', () => {
  it('returns the browser-safe configuration', () => {
    const result = readPublicEnv({
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    });
    expect(result).toEqual({
      ok: true,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
      },
    });
  });

  it('reports what is missing instead of throwing', () => {
    const result = readPublicEnv({});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.problems.join('\n')).toContain('NEXT_PUBLIC_SUPABASE_URL');
      expect(result.problems.join('\n')).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }
  });

  it('rejects a malformed URL', () => {
    const result = readPublicEnv({
      NEXT_PUBLIC_SUPABASE_URL: 'not a url',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    });
    expect(result.ok).toBe(false);
  });
});

describe('looksLikeServerSecret', () => {
  it.each([
    ['a Stripe live secret key', 'sk_live_' + 'x'.repeat(24)],
    ['a Stripe test secret key', 'sk_test_' + 'x'.repeat(24)],
    ['a Stripe restricted key', 'rk_live_' + 'x'.repeat(24)],
    ['a Stripe webhook secret', 'whsec_' + 'x'.repeat(24)],
    ['a Supabase secret key', 'sb_secret_' + 'x'.repeat(24)],
    ['a Supabase service-role JWT', serviceKey],
    // Assembled from parts so secret scanners do not flag this test file.
    ['an APNs private key', ['-----BEGIN', 'PRIVATE KEY-----'].join(' ') + '\nabc'],
  ])('flags %s', (_label, value) => {
    expect(looksLikeServerSecret(value)).toBe(true);
  });

  it.each([
    ['a Supabase anon JWT', anonKey],
    ['a Supabase publishable key', 'sb_publishable_' + 'x'.repeat(24)],
    ['a Stripe publishable key', 'pk_test_' + 'x'.repeat(24)],
    ['a URL', 'https://example.supabase.co'],
    ['an empty string', ''],
  ])('allows %s', (_label, value) => {
    expect(looksLikeServerSecret(value)).toBe(false);
  });
});

describe('assertNoSecretsInPublicEnv', () => {
  it('passes for a correct configuration', () => {
    expect(() =>
      assertNoSecretsInPublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
        SUPABASE_SERVICE_ROLE_KEY: serviceKey,
        STRIPE_SECRET_KEY: 'sk_test_' + 'x'.repeat(24),
      }),
    ).not.toThrow();
  });

  it('fails when the service-role key is exposed to the browser', () => {
    expect(() => assertNoSecretsInPublicEnv({ NEXT_PUBLIC_SUPABASE_ANON_KEY: serviceKey })).toThrow(
      /NEXT_PUBLIC_SUPABASE_ANON_KEY/,
    );
  });

  it('fails when a Stripe secret key is exposed to the browser', () => {
    expect(() =>
      assertNoSecretsInPublicEnv({ NEXT_PUBLIC_STRIPE_KEY: 'sk_live_' + 'x'.repeat(24) }),
    ).toThrow(/NEXT_PUBLIC_STRIPE_KEY/);
  });

  it('never includes the secret value in the error message', () => {
    const secret = 'sk_live_' + 'y'.repeat(24);
    try {
      assertNoSecretsInPublicEnv({ NEXT_PUBLIC_OOPS: secret });
      expect.unreachable();
    } catch (error) {
      expect(String(error)).not.toContain(secret);
    }
  });
});
