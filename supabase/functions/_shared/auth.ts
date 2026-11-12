import type { Deps } from './deps.ts';
import { AppError } from './errors.ts';
import { bearerToken } from './http.ts';

/** The signed-in user making the request. Throws 401 if the token is missing or invalid. */
export async function requireUserId(req: Request, deps: Pick<Deps, 'auth'>): Promise<string> {
  const token = bearerToken(req);
  if (!token) {
    throw new AppError(401, 'unauthenticated', 'Sign in to continue.');
  }
  const userId = await deps.auth.getUserId(token);
  if (!userId) {
    throw new AppError(401, 'unauthenticated', 'Your session has expired. Sign in again.');
  }
  return userId;
}

/**
 * Resolves a manager override. The approving manager signs in on the device
 * and the app sends their access token; we verify it here and pass on their
 * user id. The database then checks that this person is an active manager or
 * owner. An employee id supplied by the client is never accepted as approval.
 */
export async function resolveApprover(
  approverAccessToken: string | null | undefined,
  deps: Pick<Deps, 'auth'>,
): Promise<string | null> {
  if (!approverAccessToken) {
    return null;
  }
  const approverId = await deps.auth.getUserId(approverAccessToken);
  if (!approverId) {
    throw new AppError(401, 'approver_unauthenticated', 'The manager sign-in is not valid.');
  }
  return approverId;
}
