import type { Deps } from './deps.ts';
import { AppError } from './errors.ts';
import { bearerToken } from './http.ts';
import { verifyIdToken } from './shopify_id_token.ts';

export interface PosCaller {
  /** The Shopify account signed in to POS on the device. */
  readonly shopifyUserId: string;
}

/**
 * Authenticates a request from the POS extension. The extension sends the
 * ID token Shopify gives it; only someone signed in to Shopify POS on our
 * store can obtain one.
 */
export async function requirePosCaller(
  req: Request,
  deps: Pick<Deps, 'idToken' | 'now' | 'log'>,
): Promise<PosCaller> {
  const token = bearerToken(req);
  if (!token) {
    throw new AppError(401, 'unauthenticated', 'Open this from Shopify POS.');
  }
  const result = await verifyIdToken(token, deps.idToken, deps.now());
  if (!result.ok) {
    deps.log('pos id token rejected', { reason: result.reason });
    throw new AppError(401, 'unauthenticated', 'Your Shopify POS session could not be verified.');
  }
  return { shopifyUserId: result.shopifyUserId };
}
