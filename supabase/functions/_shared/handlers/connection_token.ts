// POST /terminal-connection-token
//
// The Stripe Terminal SDK needs a short-lived connection token to talk to
// Stripe. Only an active employee can get one. The Stripe secret key itself
// never leaves the server.
import { requireUserId } from '../auth.ts';
import type { Deps } from '../deps.ts';
import { AppError } from '../errors.ts';
import { json, requirePost } from '../http.ts';

export async function handleConnectionToken(req: Request, deps: Deps): Promise<Response> {
  requirePost(req);
  const userId = await requireUserId(req, deps);

  const employee = await deps.db.getActiveEmployee(userId);
  if (!employee) {
    throw new AppError(403, 'forbidden', 'Only active employees can take payments.');
  }

  const token = await deps.stripe.createConnectionToken();
  return json(200, { secret: token.secret });
}
