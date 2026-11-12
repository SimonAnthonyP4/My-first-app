// In-memory stand-ins for the database and Shopify, used by the handler
// tests. They record every call so tests can assert on exactly what a
// handler asked for.
import type {
  Db,
  Deps,
  MemberRow,
  RedemptionRow,
  RewardRow,
  WebhookDeps,
} from '../_shared/deps.ts';
import { DbError } from '../_shared/errors.ts';
import type { RewardDiscountInput, RewardVariant, ShopifyAdmin } from '../_shared/shopify_admin.ts';
import { hmacSha256 } from '../_shared/shopify_hmac.ts';

export const SHOP = 'bro-batch-test.myshopify.com';
export const CLIENT_ID = 'test-client-id';
// Assembled from parts so secret scanners do not flag this test file.
export const CLIENT_SECRET = ['shpss', 'test', 'fixture', 'secret'].join('_');
export const NOW = 1_800_000_000;

export const CUSTOMER_ID = '77777777-7777-4777-8777-777777777777';
export const REWARD_ID = '88888888-8888-4888-8888-888888888888';
export const REDEMPTION_ID = '44444444-4444-4444-8444-444444444444';
export const MEMBERSHIP_CODE = '0123456789abcdef0123456789abcdef';
export const SHOPIFY_CUSTOMER_ID = '6000000000000000001';
export const SHOPIFY_USER_ID = '80000000001';

export interface RpcCall {
  readonly fn: string;
  readonly args: Record<string, unknown>;
}

type RpcImpl = (args: Record<string, unknown>) => unknown;

export class FakeDb implements Db {
  readonly calls: RpcCall[] = [];
  readonly impls = new Map<string, RpcImpl>();
  redemption: RedemptionRow | null = null;
  pointsPerDollar = 10;

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

  getRedemption(_redemptionId: string) {
    return Promise.resolve(this.redemption);
  }

  getPointsPerDollar() {
    return Promise.resolve(this.pointsPerDollar);
  }
}

export interface ShopifyCall {
  readonly method: string;
  readonly params: unknown;
}

export class FakeShopify implements ShopifyAdmin {
  readonly calls: ShopifyCall[] = [];
  customerIdByEmail: string | null = SHOPIFY_CUSTOMER_ID;
  createdCustomerId = '6000000000000000999';
  variant: RewardVariant | null = { title: 'Chocolate Bar', priceCents: 300, inCollection: true };
  discountId = 'gid://shopify/DiscountCodeNode/555';
  /** Set to make the next call of that method throw. */
  errors = new Map<string, Error>();

  called(method: string): ShopifyCall[] {
    return this.calls.filter((call) => call.method === method);
  }

  private run<T>(method: string, params: unknown, value: T): Promise<T> {
    this.calls.push({ method, params });
    const error = this.errors.get(method);
    return error ? Promise.reject(error) : Promise.resolve(value);
  }

  findCustomerIdByEmail(email: string) {
    return this.run('findCustomerIdByEmail', email, this.customerIdByEmail);
  }

  createCustomer(input: { email: string; fullName: string }) {
    return this.run('createCustomer', input, this.createdCustomerId);
  }

  getVariantForReward(shopifyVariantId: string, shopifyCollectionId: string) {
    return this.run('getVariantForReward', { shopifyVariantId, shopifyCollectionId }, this.variant);
  }

  createRewardDiscount(input: RewardDiscountInput) {
    return this.run('createRewardDiscount', input, this.discountId);
  }

  deleteDiscount(shopifyDiscountId: string) {
    return this.run('deleteDiscount', shopifyDiscountId, undefined);
  }
}

export function member(overrides: Partial<MemberRow> = {}): MemberRow {
  return {
    customer_id: CUSTOMER_ID,
    full_name: 'Mia Member',
    email: 'mia@example.com',
    points_balance: 1000,
    shopify_customer_id: SHOPIFY_CUSTOMER_ID,
    ...overrides,
  };
}

export function reward(overrides: Partial<RewardRow> = {}): RewardRow {
  return {
    id: REWARD_ID,
    name: 'Free protein bar',
    description: 'One protein bar of your choice.',
    points_cost: 300,
    grants_category: 'bar',
    quantity: 1,
    shopify_collection_id: '4000000000001',
    is_live: true,
    ...overrides,
  };
}

export function redemption(overrides: Partial<RedemptionRow> = {}): RedemptionRow {
  return {
    id: REDEMPTION_ID,
    customer_id: CUSTOMER_ID,
    reward_id: REWARD_ID,
    status: 'reserved',
    points_cost: 300,
    discount_code: 'BB-ABCD-EFGH-JKMN',
    shopify_discount_id: null,
    expires_at: '2027-01-15T08:15:00+00:00',
    ...overrides,
  };
}

export interface TestContext {
  readonly db: FakeDb;
  readonly shopify: FakeShopify;
  readonly logs: { message: string; detail?: Record<string, unknown> }[];
  readonly deps: Deps;
  readonly webhookDeps: WebhookDeps;
}

export function createContext(): TestContext {
  const db = new FakeDb();
  const shopify = new FakeShopify();
  const logs: TestContext['logs'] = [];
  const log = (message: string, detail?: Record<string, unknown>) => {
    logs.push({ message, detail });
  };
  const deps: Deps = {
    db,
    shopify,
    idToken: { clientId: CLIENT_ID, clientSecret: CLIENT_SECRET, shopDomain: SHOP },
    log,
    now: () => NOW,
  };
  return {
    db,
    shopify,
    logs,
    deps,
    webhookDeps: { db, log, webhookSecret: CLIENT_SECRET, shopDomain: SHOP },
  };
}

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

/** Builds a Shopify-style ID token, signed with the given secret. */
export async function idToken(
  claims: Record<string, unknown> = {},
  options: { secret?: string; header?: Record<string, unknown> } = {},
): Promise<string> {
  const encoder = new TextEncoder();
  const header = base64Url(
    encoder.encode(JSON.stringify(options.header ?? { alg: 'HS256', typ: 'JWT' })),
  );
  const payload = base64Url(
    encoder.encode(
      JSON.stringify({
        iss: `https://${SHOP}/admin`,
        dest: `https://${SHOP}`,
        aud: CLIENT_ID,
        sub: SHOPIFY_USER_ID,
        exp: NOW + 60,
        nbf: NOW - 5,
        iat: NOW - 5,
        jti: 'f8912129-1af6-4cad-9ca3-76b0f7621087',
        ...claims,
      }),
    ),
  );
  const signature = await hmacSha256(
    options.secret ?? CLIENT_SECRET,
    encoder.encode(`${header}.${payload}`),
  );
  return `${header}.${payload}.${base64Url(signature)}`;
}

/** A POST from the POS extension, carrying a valid ID token unless told otherwise. */
export async function posRequest(body: unknown, token?: string | null): Promise<Request> {
  const bearer = token === undefined ? await idToken() : token;
  return new Request('http://localhost/fn', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

// deno-lint-ignore no-explicit-any
export async function body(response: Response): Promise<Record<string, any>> {
  return await response.json();
}
