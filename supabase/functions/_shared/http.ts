import { AppError, appErrorFromDb, DbError } from './errors.ts';
import { ShopifyError } from './shopify_admin.ts';

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

export function errorResponse(status: number, code: string, message: string): Response {
  return json(status, { error: { code, message } });
}

export type Logger = (message: string, detail?: Record<string, unknown>) => void;

/**
 * Turns anything thrown by a handler into a response. Only AppError and mapped
 * database errors reach the caller with their message; everything else becomes
 * a generic error, with the detail going to the server log.
 */
export function responseFromError(error: unknown, log: Logger): Response {
  if (error instanceof AppError) {
    return errorResponse(error.status, error.code, error.message);
  }
  if (error instanceof DbError) {
    const mapped = appErrorFromDb(error);
    if (mapped) {
      return errorResponse(mapped.status, mapped.code, mapped.message);
    }
    log('unexpected database error', { sqlstate: error.sqlstate, message: error.message });
    return errorResponse(500, 'internal_error', 'Something went wrong. Please try again.');
  }
  if (error instanceof ShopifyError) {
    log('shopify error', { status: error.status, kind: error.kind });
    return errorResponse(
      502,
      'shopify_unavailable',
      'Shopify could not be reached. Please try again.',
    );
  }
  log('unexpected error', { message: error instanceof Error ? error.message : String(error) });
  return errorResponse(500, 'internal_error', 'Something went wrong. Please try again.');
}

/** Reads and parses a JSON body, limited in size. */
export async function readJson(req: Request, maxBytes = 64 * 1024): Promise<unknown> {
  const text = await req.text();
  if (new TextEncoder().encode(text).length > maxBytes) {
    throw new AppError(413, 'payload_too_large', 'The request is too large.');
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError(400, 'invalid_request', 'The request body is not valid JSON.');
  }
}

export function requirePost(req: Request): void {
  if (req.method !== 'POST') {
    throw new AppError(405, 'method_not_allowed', 'Use POST.');
  }
}

/** The bearer token from the Authorization header, or null. */
export function bearerToken(req: Request): string | null {
  const header = req.headers.get('authorization');
  if (!header) {
    return null;
  }
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match?.[1] ?? null;
}

/** Runs a handler and converts anything it throws into a safe response. */
export async function respond<D extends { readonly log: Logger }>(
  handler: (req: Request, deps: D) => Promise<Response>,
  req: Request,
  deps: D,
): Promise<Response> {
  try {
    return await handler(req, deps);
  } catch (error) {
    return responseFromError(error, deps.log);
  }
}
