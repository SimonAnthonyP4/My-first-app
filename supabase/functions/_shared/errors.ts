// Errors that are safe to show to the calling app. Anything that is not an
// AppError is reported as a generic 500 and logged server-side only.

export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** A failed database call, carrying the SQLSTATE the function raised. */
export class DbError extends Error {
  constructor(
    readonly sqlstate: string,
    message: string,
  ) {
    super(message);
    this.name = 'DbError';
  }
}

interface Mapping {
  readonly status: number;
  readonly code: string;
}

// SQLSTATE -> HTTP. The BBnnn codes are raised by our own database functions
// and mirror DB_ERROR in packages/contracts (a test keeps the two in step).
// Their messages are written for people and contain no internals, so they are
// passed through to the app.
const DB_ERROR_MAP: Readonly<Record<string, Mapping>> = {
  BB001: { status: 409, code: 'insufficient_points' },
  BB002: { status: 409, code: 'invalid_state' },
  BB003: { status: 409, code: 'conflict' },
  BB004: { status: 409, code: 'not_available' },
  BB005: { status: 409, code: 'redemption_final' },
  BB006: { status: 404, code: 'not_found' },
  '22023': { status: 400, code: 'invalid_request' },
  '23514': { status: 400, code: 'invalid_request' },
  '42501': { status: 403, code: 'forbidden' },
};

export const KNOWN_DB_ERROR_CODES: readonly string[] = Object.keys(DB_ERROR_MAP);

/** Converts a database error into one the app may see, or null if it is unexpected. */
export function appErrorFromDb(error: DbError): AppError | null {
  const mapping = DB_ERROR_MAP[error.sqlstate];
  if (!mapping) {
    return null;
  }
  // Constraint messages name internal objects; replace them.
  const message =
    error.sqlstate === '23514' ? 'The request contains an invalid value.' : error.message;
  return new AppError(mapping.status, mapping.code, message);
}
