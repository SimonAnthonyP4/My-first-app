// In-memory stand-ins for the database, auth server and Stripe, used by the
// handler tests. They record every call so tests can assert on exactly what a
// handler asked for.
import type { Auth, Db, Deps, WebhookDeps } from '../_shared/deps.ts';
import { DbError } from '../_shared/errors.ts';
import type { Charge, PaymentIntent, Refund, StripeClient } from '../_shared/stripe.ts';

export const EMPLOYEE_ID = '11111111-1111-4111-8111-111111111111';
export const MANAGER_ID = '22222222-2222-4222-8222-222222222222';
export const ORDER_ID = '33333333-3333-4333-8333-333333333333';
export const REFUND_ID = '44444444-4444-4444-8444-444444444444';
export const PRODUCT_ID = '55555555-5555-4555-8555-555555555555';
export const ITEM_ID = '66666666-6666-4666-8666-666666666666';
export const CUSTOMER_ID = '77777777-7777-4777-8777-777777777777';

export const EMPLOYEE_TOKEN = 'token-for-the-cashier';
export const MANAGER_TOKEN = 'token-for-the-manager';

export interface RpcCall {
  readonly fn: string;
  readonly args: Record<string, unknown>;
}

type RpcImpl = (args: Record<string, unknown>) => unknown;

export class FakeDb implements Db {
  readonly calls: RpcCall[] = [];
  readonly impls = new Map<string, RpcImpl>();
  activeEmployees = new Map<string, string>([
    [EMPLOYEE_ID, 'employee'],
    [MANAGER_ID, 'manager'],
  ]);
  openPaymentIntents: string[] = [];
  refundPaymentIntent: string | null = 'pi_test_1';

  on(fn: string, impl: RpcImpl): this {
    this.impls.set(fn, impl);
    return this;
  }

  /** Makes a function fail the way the database would, with a SQLSTATE. */
  fail(fn: string, sqlstate: string, message: string): this {
    return this.on(fn, () => {
      throw new DbError(sqlstate, message);
    });
  }

  called(fn: string): RpcCall[] {
    return this.calls.filter((call) => call.fn === fn);
  }

  rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
    this.calls.push({ fn, args });
    const impl = this.impls.get(fn);
    if (!impl) {
      return Promise.reject(new Error(`FakeDb: no implementation for ${fn}`));
    }
    try {
      return Promise.resolve(impl(args) as T);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  getActiveEmployee(userId: string) {
    const role = this.activeEmployees.get(userId);
    return Promise.resolve(role ? { id: userId, role } : null);
  }

  listOpenPaymentIntents(_orderId: string) {
    return Promise.resolve([...this.openPaymentIntents]);
  }

  getRefundPaymentIntent(_refundId: string) {
    return Promise.resolve(this.refundPaymentIntent);
  }
}

export class FakeAuth implements Auth {
  tokens = new Map<string, string>([
    [EMPLOYEE_TOKEN, EMPLOYEE_ID],
    [MANAGER_TOKEN, MANAGER_ID],
  ]);

  getUserId(accessToken: string) {
    return Promise.resolve(this.tokens.get(accessToken) ?? null);
  }
}

export interface StripeCall {
  readonly method: string;
  readonly params: unknown;
  readonly idempotencyKey?: string;
}

export class FakeStripe implements StripeClient {
  readonly calls: StripeCall[] = [];
  paymentIntent: PaymentIntent = {
    id: 'pi_test_1',
    status: 'requires_payment_method',
    amount: 900,
    currency: 'usd',
    client_secret: 'pi_test_1_secret_abc',
  };
  refund: Refund = { id: 're_test_1', status: 'succeeded', amount: 900 };
  charge: Charge = { id: 'ch_test_1', card_brand: 'visa', card_last4: '4242' };
  /** Set to make the next call of that method throw. */
  errors = new Map<string, Error>();
  /**
   * When true, PaymentIntents and Refunds come back for the amount that was
   * asked for (as Stripe would), with ids derived from the idempotency key.
   */
  echo = false;

  private take(method: string): void {
    const error = this.errors.get(method);
    if (error) {
      throw error;
    }
  }

  called(method: string): StripeCall[] {
    return this.calls.filter((call) => call.method === method);
  }

  createPaymentIntent(
    params: { amountCents: number; metadata: Record<string, string> },
    idempotencyKey: string,
  ) {
    this.calls.push({ method: 'createPaymentIntent', params, idempotencyKey });
    try {
      this.take('createPaymentIntent');
    } catch (error) {
      return Promise.reject(error);
    }
    if (this.echo) {
      const id = `pi_test_${idempotencyKey.replace(/[^a-zA-Z0-9]/g, '')}`;
      return Promise.resolve({
        id,
        status: 'requires_payment_method',
        amount: params.amountCents,
        currency: 'usd',
        client_secret: `${id}_secret`,
      });
    }
    return Promise.resolve(this.paymentIntent);
  }

  cancelPaymentIntent(paymentIntentId: string) {
    this.calls.push({ method: 'cancelPaymentIntent', params: paymentIntentId });
    try {
      this.take('cancelPaymentIntent');
    } catch (error) {
      return Promise.reject(error);
    }
    return Promise.resolve({ ...this.paymentIntent, id: paymentIntentId, status: 'canceled' });
  }

  createRefund(params: { amountCents: number }, idempotencyKey: string) {
    this.calls.push({ method: 'createRefund', params, idempotencyKey });
    try {
      this.take('createRefund');
    } catch (error) {
      return Promise.reject(error);
    }
    if (this.echo) {
      return Promise.resolve({
        id: `re_test_${idempotencyKey.replace(/[^a-zA-Z0-9]/g, '')}`,
        status: this.refund.status,
        amount: params.amountCents,
      });
    }
    return Promise.resolve(this.refund);
  }

  createConnectionToken() {
    this.calls.push({ method: 'createConnectionToken', params: null });
    try {
      this.take('createConnectionToken');
    } catch (error) {
      return Promise.reject(error);
    }
    return Promise.resolve({ secret: 'pst_test_connection_token' });
  }

  retrieveCharge(chargeId: string) {
    this.calls.push({ method: 'retrieveCharge', params: chargeId });
    try {
      this.take('retrieveCharge');
    } catch (error) {
      return Promise.reject(error);
    }
    return Promise.resolve(this.charge);
  }
}

export interface TestContext {
  readonly db: FakeDb;
  readonly auth: FakeAuth;
  readonly stripe: FakeStripe;
  readonly logs: { message: string; detail?: Record<string, unknown> }[];
  readonly deps: Deps;
  webhookDeps(secret: string): WebhookDeps;
}

export const NOW = 1_800_000_000;

export function createContext(): TestContext {
  const db = new FakeDb();
  const auth = new FakeAuth();
  const stripe = new FakeStripe();
  const logs: TestContext['logs'] = [];
  const deps: Deps = {
    db,
    auth,
    stripe,
    stripeMode: 'test',
    log: (message, detail) => {
      logs.push({ message, detail });
    },
    now: () => NOW,
  };
  return {
    db,
    auth,
    stripe,
    logs,
    deps,
    webhookDeps: (secret) => ({ ...deps, webhookSecret: secret }),
  };
}

export function post(
  body: unknown,
  token: string | null = EMPLOYEE_TOKEN,
  headers: Record<string, string> = {},
): Request {
  return new Request('http://localhost/fn', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

export async function body(response: Response): Promise<Record<string, any>> {
  return await response.json();
}
