// Where the extension finds the Bro Batch backend. This is a public URL, not
// a secret: extension code is delivered to the device and can be read by
// anyone, so nothing confidential may ever be placed in this folder.
//
// Replace the placeholder with the Supabase project's functions URL before
// deploying the extension (docs/RUNBOOK.md, "Connect Shopify").
export const BACKEND_URL = 'https://REPLACE_WITH_PROJECT_REF.supabase.co/functions/v1';

export function isBackendConfigured(url: string = BACKEND_URL): boolean {
  return /^https:\/\/[a-z0-9-]+\.[a-z0-9.-]+\/.*$/.test(url) && !url.includes('REPLACE_WITH');
}
