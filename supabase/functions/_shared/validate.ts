import { z } from 'zod';

import { AppError } from './errors.ts';

/** Parses a request body against a schema, or throws a 400 the app can show. */
export function parseBody<S extends z.ZodType>(schema: S, body: unknown): z.infer<S> {
  const result = schema.safeParse(body);
  if (!result.success) {
    const issue = result.error.issues[0];
    const where = issue && issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
    throw new AppError(400, 'invalid_request', `${where}${issue?.message ?? 'Invalid request.'}`);
  }
  return result.data;
}

export const idempotencyKeySchema = z.string().min(8).max(150);

/**
 * A Shopify numeric id. Accepted as a number or a string of digits and
 * normalised to a string, so values beyond 2^53 are never rounded.
 */
export const shopifyIdSchema = z
  .union([
    z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    z.string().regex(/^[1-9][0-9]{0,18}$/),
  ])
  .transform((value) => String(value));
