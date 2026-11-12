// A small Stripe client: only the four calls this backend makes, over fetch.
//
// The secret key is held in a closure and sent only in the Authorization
// header to api.stripe.com. It is never logged, never put in an error, and
// never returned to a caller.

export class StripeError extends Error {
  constructor(
    /** HTTP status from Stripe, or 0 when the request never got a response. */
    readonly status: number,
    readonly type: string,
    readonly code: string | null,
    message: string,
    /** The PaymentIntent or Refund attached to the error, when Stripe includes one. */
    readonly object: Record<string, unknown> | null = null,
  ) {
    super(message);
    this.name = 'StripeError';
  }

  /** True when retrying the same request later might succeed. */
  get retryable(): boolean {
    return this.status === 0 || this.status === 409 || this.status === 429 || this.status >= 500;
  }
}

export interface PaymentIntent {
  readonly id: string;
  readonly status: string;
  readonly amount: number;
  readonly currency: string;
  readonly client_secret: string | null;
}

export interface Refund {
  readonly id: string;
  readonly status: string | null;
  readonly amount: number;
  readonly failure_reason?: string | null;
}

export interface Charge {
  readonly id: string;
  readonly card_brand: string | null;
  readonly card_last4: string | null;
}

export interface StripeClient {
  createPaymentIntent(
    params: { amountCents: number; metadata: Record<string, string> },
    idempotencyKey: string,
  ): Promise<PaymentIntent>;
  cancelPaymentIntent(paymentIntentId: string): Promise<PaymentIntent>;
  createRefund(
    params: {
      paymentIntentId: string;
      amountCents: number;
      reason: 'requested_by_customer' | 'duplicate' | null;
      metadata: Record<string, string>;
    },
    idempotencyKey: string,
  ): Promise<Refund>;
  createConnectionToken(): Promise<{ secret: string }>;
  retrieveCharge(chargeId: string): Promise<Charge>;
}

export type StripeMode = 'test' | 'live';

export interface StripeConfig {
  readonly secretKey: string;
  /** Which kind of key is expected. A key of the other kind is refused. */
  readonly mode: StripeMode;
  /** Optional pinned API version, e.g. from the STRIPE_API_VERSION secret. */
  readonly apiVersion?: string;
  readonly fetch?: typeof fetch;
  readonly timeoutMs?: number;
}

const API_BASE = 'https://api.stripe.com/v1';

/** Form-encodes nested objects and arrays the way Stripe expects. */
export function encodeForm(params: Record<string, unknown>): string {
  const pairs: string[] = [];
  const add = (key: string, value: unknown): void => {
    if (value === null || value === undefined) {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => add(`${key}[${index}]`, item));
    } else if (typeof value === 'object') {
      for (const [childKey, childValue] of Object.entries(value)) {
        add(`${key}[${childKey}]`, childValue);
      }
    } else {
      pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  };
  for (const [key, value] of Object.entries(params)) {
    add(key, value);
  }
  return pairs.join('&');
}

/**
 * Checks that the key matches the mode the deployment says it is in, so a
 * live key cannot be used by a project configured for testing (or the reverse).
 */
export function assertKeyMatchesMode(secretKey: string, mode: StripeMode): void {
  const isTest = secretKey.startsWith('sk_test_') || secretKey.startsWith('rk_test_');
  const isLive = secretKey.startsWith('sk_live_') || secretKey.startsWith('rk_live_');
  if (!isTest && !isLive) {
    throw new Error('STRIPE_SECRET_KEY is not a Stripe secret key.');
  }
  if ((mode === 'test' && !isTest) || (mode === 'live' && !isLive)) {
    throw new Error(
      `STRIPE_MODE is "${mode}" but STRIPE_SECRET_KEY is a ${isTest ? 'test' : 'live'} key.`,
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export function createStripeClient(config: StripeConfig): StripeClient {
  assertKeyMatchesMode(config.secretKey, config.mode);
  const doFetch = config.fetch ?? fetch;
  const timeoutMs = config.timeoutMs ?? 20_000;

  async function request(
    method: 'GET' | 'POST',
    path: string,
    params: Record<string, unknown> | null,
    idempotencyKey: string | null,
  ): Promise<Record<string, unknown>> {
    const headers: Record<string, string> = {
      authorization: `Bearer ${config.secretKey}`,
    };
    if (config.apiVersion) {
      headers['stripe-version'] = config.apiVersion;
    }
    if (idempotencyKey) {
      headers['idempotency-key'] = idempotencyKey;
    }
    let body: string | undefined;
    if (method === 'POST') {
      headers['content-type'] = 'application/x-www-form-urlencoded';
      body = encodeForm(params ?? {});
    }

    let response: Response;
    try {
      response = await doFetch(`${API_BASE}${path}`, {
        method,
        headers,
        body,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      // Deliberately drops the underlying error: it can echo request details.
      throw new StripeError(0, 'network_error', null, 'Could not reach Stripe.');
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new StripeError(
        response.status,
        'invalid_response',
        null,
        'Stripe sent an unreadable response.',
      );
    }

    if (!response.ok || !isRecord(payload)) {
      const error = isRecord(payload) && isRecord(payload.error) ? payload.error : {};
      const attached = isRecord(error.payment_intent)
        ? error.payment_intent
        : isRecord(error.refund)
          ? error.refund
          : null;
      throw new StripeError(
        response.status,
        stringOrNull(error.type) ?? 'api_error',
        stringOrNull(error.code),
        stringOrNull(error.message) ?? 'Stripe rejected the request.',
        attached,
      );
    }
    return payload;
  }

  function toPaymentIntent(payload: Record<string, unknown>): PaymentIntent {
    if (typeof payload.id !== 'string' || typeof payload.amount !== 'number') {
      throw new StripeError(
        200,
        'invalid_response',
        null,
        'Stripe sent an unexpected PaymentIntent.',
      );
    }
    return {
      id: payload.id,
      status: stringOrNull(payload.status) ?? 'unknown',
      amount: payload.amount,
      currency: stringOrNull(payload.currency) ?? '',
      client_secret: stringOrNull(payload.client_secret),
    };
  }

  return {
    async createPaymentIntent({ amountCents, metadata }, idempotencyKey) {
      const payload = await request(
        'POST',
        '/payment_intents',
        {
          amount: amountCents,
          currency: 'usd',
          payment_method_types: ['card_present'],
          capture_method: 'automatic',
          metadata,
        },
        idempotencyKey,
      );
      return toPaymentIntent(payload);
    },

    async cancelPaymentIntent(paymentIntentId) {
      const payload = await request(
        'POST',
        `/payment_intents/${encodeURIComponent(paymentIntentId)}/cancel`,
        {},
        null,
      );
      return toPaymentIntent(payload);
    },

    async createRefund({ paymentIntentId, amountCents, reason, metadata }, idempotencyKey) {
      const payload = await request(
        'POST',
        '/refunds',
        { payment_intent: paymentIntentId, amount: amountCents, reason, metadata },
        idempotencyKey,
      );
      if (typeof payload.id !== 'string' || typeof payload.amount !== 'number') {
        throw new StripeError(200, 'invalid_response', null, 'Stripe sent an unexpected Refund.');
      }
      return {
        id: payload.id,
        status: stringOrNull(payload.status),
        amount: payload.amount,
        failure_reason: stringOrNull(payload.failure_reason),
      };
    },

    async createConnectionToken() {
      const payload = await request('POST', '/terminal/connection_tokens', {}, null);
      if (typeof payload.secret !== 'string') {
        throw new StripeError(200, 'invalid_response', null, 'Stripe sent an unexpected token.');
      }
      return { secret: payload.secret };
    },

    async retrieveCharge(chargeId) {
      const payload = await request('GET', `/charges/${encodeURIComponent(chargeId)}`, null, null);
      const details = isRecord(payload.payment_method_details)
        ? payload.payment_method_details
        : {};
      const card = isRecord(details.card_present)
        ? details.card_present
        : isRecord(details.card)
          ? details.card
          : {};
      const last4 = stringOrNull(card.last4);
      return {
        id: stringOrNull(payload.id) ?? chargeId,
        card_brand: stringOrNull(card.brand),
        // Display only. Anything that is not exactly four digits is dropped.
        card_last4: last4 && /^[0-9]{4}$/.test(last4) ? last4 : null,
      };
    },
  };
}
