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
export const accessTokenSchema = z.string().min(10).max(8192);
