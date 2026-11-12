import assert from 'node:assert/strict';

// The contracts package is the list the apps use; this file is what the
// server maps. They must cover the same codes.
import { DB_ERROR } from '../../../packages/contracts/src/enums.ts';
import { AppError, appErrorFromDb, DbError, KNOWN_DB_ERROR_CODES } from '../_shared/errors.ts';
import {
  bearerToken,
  errorResponse,
  json,
  respondWithCors,
  responseFromError,
} from '../_shared/http.ts';

Deno.test('errors: every custom database code in the contracts is mapped to a response', () => {
  for (const [name, code] of Object.entries(DB_ERROR)) {
    assert.ok(KNOWN_DB_ERROR_CODES.includes(code), `${name} (${code}) has no HTTP mapping`);
  }
});

Deno.test('errors: every mapped BBnnn code exists in the contracts', () => {
  const contractCodes = new Set<string>(Object.values(DB_ERROR));
  for (const code of KNOWN_DB_ERROR_CODES.filter((value) => value.startsWith('BB'))) {
    assert.ok(contractCodes.has(code), `${code} is mapped but missing from the contracts`);
  }
});

Deno.test('errors: constraint violations do not leak constraint names', () => {
  const mapped = appErrorFromDb(
    new DbError(
      '23514',
      'new row for relation "refunds" violates check constraint "refunds_reason_check"',
    ),
  );
  assert.equal(mapped?.status, 400);
  assert.equal(mapped?.message.includes('refunds_reason_check'), false);
});

Deno.test('errors: unknown database errors are not mapped', () => {
  assert.equal(appErrorFromDb(new DbError('XX000', 'internal')), null);
  assert.equal(appErrorFromDb(new DbError('23505', 'duplicate key value')), null);
});

Deno.test('errors: anything that is not an AppError becomes a generic 500', async () => {
  const logs: unknown[] = [];
  const response = responseFromError(
    new TypeError('cannot read properties of undefined'),
    (message, detail) => logs.push({ message, detail }),
  );
  assert.equal(response.status, 500);
  const result = await response.json();
  assert.equal(result.error.code, 'internal_error');
  assert.equal(JSON.stringify(result).includes('undefined'), false);
  assert.equal(logs.length, 1);
});

Deno.test('errors: an AppError is returned as written', async () => {
  const response = responseFromError(
    new AppError(409, 'not_available', 'Not available.'),
    () => {},
  );
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    error: { code: 'not_available', message: 'Not available.' },
  });
});

Deno.test('http: responses are JSON and never cached', () => {
  const response = errorResponse(400, 'invalid_request', 'x');
  assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8');
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

Deno.test('http: bearer tokens are parsed strictly', () => {
  const request = (value?: string) =>
    new Request('http://localhost/', { headers: value ? { authorization: value } : {} });
  assert.equal(bearerToken(request('Bearer abc.def.ghi')), 'abc.def.ghi');
  assert.equal(bearerToken(request('bearer abc')), 'abc');
  assert.equal(bearerToken(request('Basic abc')), null);
  assert.equal(bearerToken(request('Bearer')), null);
  assert.equal(bearerToken(request('Bearer a b')), null);
  assert.equal(bearerToken(request()), null);
});

Deno.test('cors: the preflight is answered without running the handler', async () => {
  let ran = false;
  const response = await respondWithCors(
    () => {
      ran = true;
      return Promise.resolve(json(200, {}));
    },
    new Request('http://localhost/', { method: 'OPTIONS' }),
    { log: () => {} },
  );
  assert.equal(response.status, 204);
  assert.equal(ran, false);
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  assert.equal(response.headers.get('access-control-allow-headers'), 'authorization, content-type');
});

Deno.test(
  'cors: successes and errors both carry the headers, and never allow credentials',
  async () => {
    const ok = await respondWithCors(
      () => Promise.resolve(json(200, { fine: true })),
      new Request('http://localhost/', { method: 'POST' }),
      { log: () => {} },
    );
    const failed = await respondWithCors(
      () => Promise.reject(new AppError(401, 'unauthenticated', 'no')),
      new Request('http://localhost/', { method: 'POST' }),
      { log: () => {} },
    );
    for (const response of [ok, failed]) {
      assert.equal(response.headers.get('access-control-allow-origin'), '*');
      assert.equal(response.headers.get('access-control-allow-credentials'), null);
    }
    assert.equal(failed.status, 401);
  },
);
