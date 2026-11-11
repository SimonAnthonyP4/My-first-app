import type { NextConfig } from 'next';

import { assertNoSecretsInPublicEnv } from './lib/env.ts';

// Fail the build, rather than ship, if a server secret was put in a variable
// that Next.js would inline into browser JavaScript.
assertNoSecretsInPublicEnv(process.env);

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // The contracts package is consumed as TypeScript source.
  transpilePackages: ['@brobatch/contracts'],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
