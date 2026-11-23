// A small Shopify Admin API client: only the calls this backend makes.
//
// Authentication is the client credentials grant: the app's client id and
// secret are exchanged for an access token that lasts 24 hours. The token is
// cached in memory and refreshed before it expires. Neither the secret nor
// the token is ever logged, put in an error, or returned to a caller.

export class ShopifyError extends Error {
  constructor(
    /** HTTP status from Shopify, or 0 when the request never got a response. */
    readonly status: number,
    readonly kind: 'network' | 'auth' | 'http' | 'graphql' | 'user_error' | 'invalid_response',
    message: string,
  ) {
    super(message);
    this.name = 'ShopifyError';
  }
}

export interface RewardVariant {
  readonly title: string;
  readonly priceCents: number;
  readonly inCollection: boolean;
}

export interface RewardDiscountInput {
  readonly code: string;
  readonly title: string;
  /** Numeric Shopify ids, as strings so large values stay exact. */
  readonly shopifyCustomerId: string;
  readonly shopifyVariantId: string;
  readonly amountCents: number;
  readonly startsAt: string;
  readonly endsAt: string;
}

export interface ShopifyAdmin {
  findCustomerIdByEmail(email: string): Promise<string | null>;
  createCustomer(input: { email: string; fullName: string }): Promise<string>;
  getVariantForReward(
    shopifyVariantId: string,
    shopifyCollectionId: string,
  ): Promise<RewardVariant | null>;
  /** Creates the single-use code and returns the discount's global id. */
  createRewardDiscount(input: RewardDiscountInput): Promise<string>;
  deleteDiscount(shopifyDiscountId: string): Promise<void>;
}

export interface ShopifyAdminConfig {
  /** The store's myshopify.com domain, e.g. "bro-batch.myshopify.com". */
  readonly shopDomain: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly apiVersion: string;
  readonly fetch?: typeof fetch;
  /** Current time in milliseconds. */
  readonly now?: () => number;
  readonly timeoutMs?: number;
}

const SHOP_DOMAIN = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;
const API_VERSION = /^[0-9]{4}-[0-9]{2}$/;
const NUMERIC_ID = /^[0-9]{1,19}$/;

/** "12.34" -> 1234, without floating point. Returns null if it is not money. */
export function decimalToCents(value: unknown): number | null {
  if (typeof value !== 'string') {
    return null;
  }
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const cents = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : null;
}

/** 1234 -> "12.34" */
export function centsToDecimal(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new RangeError('invalid amount');
  }
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

/** The numeric id at the end of a Shopify global id ("gid://shopify/Customer/123"). */
export function numericIdFromGid(gid: unknown, type: string): string | null {
  if (typeof gid !== 'string') {
    return null;
  }
  const match = new RegExp(`^gid://shopify/${type}/([0-9]{1,19})$`).exec(gid);
  return match?.[1] ?? null;
}

function gid(type: string, id: string): string {
  if (!NUMERIC_ID.test(id)) {
    throw new RangeError(`invalid Shopify ${type} id`);
  }
  return `gid://shopify/${type}/${id}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function createShopifyAdmin(config: ShopifyAdminConfig): ShopifyAdmin {
  if (!SHOP_DOMAIN.test(config.shopDomain)) {
    throw new Error('SHOPIFY_SHOP_DOMAIN must look like your-store.myshopify.com');
  }
  if (!API_VERSION.test(config.apiVersion)) {
    throw new Error('SHOPIFY_API_VERSION must look like 2026-10');
  }
  if (!config.clientId || !config.clientSecret) {
    throw new Error('Shopify client id and secret are required');
  }

  const doFetch = config.fetch ?? fetch;
  const now = config.now ?? (() => Date.now());
  const timeoutMs = config.timeoutMs ?? 15_000;
  const origin = `https://${config.shopDomain}`;

  let token: { value: string; expiresAt: number } | null = null;

  async function send(url: string, init: RequestInit): Promise<Response> {
    try {
      return await doFetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    } catch {
      // Deliberately drops the underlying error: it can echo request details.
      throw new ShopifyError(0, 'network', 'Could not reach Shopify.');
    }
  }

  async function accessToken(forceRefresh = false): Promise<string> {
    // Refresh five minutes early so a token never expires mid-request.
    if (!forceRefresh && token && now() < token.expiresAt - 5 * 60_000) {
      return token.value;
    }
    const response = await send(`${origin}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }).toString(),
    });
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      // handled below
    }
    if (!response.ok || !isRecord(payload) || typeof payload.access_token !== 'string') {
      throw new ShopifyError(response.status, 'auth', 'Shopify did not issue an access token.');
    }
    const lifetime = typeof payload.expires_in === 'number' ? payload.expires_in : 3600;
    token = { value: payload.access_token, expiresAt: now() + lifetime * 1000 };
    return token.value;
  }

  async function graphql(
    query: string,
    variables: Record<string, unknown>,
    retried = false,
  ): Promise<Record<string, unknown>> {
    const response = await send(`${origin}/admin/api/${config.apiVersion}/graphql.json`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-shopify-access-token': await accessToken(retried),
      },
      body: JSON.stringify({ query, variables }),
    });

    // The token may have been revoked or rotated: get a new one, once.
    if (response.status === 401 && !retried) {
      return graphql(query, variables, true);
    }
    if (!response.ok) {
      throw new ShopifyError(response.status, 'http', `Shopify answered ${response.status}.`);
    }
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new ShopifyError(
        response.status,
        'invalid_response',
        'Shopify sent an unreadable response.',
      );
    }
    if (!isRecord(payload) || (Array.isArray(payload.errors) && payload.errors.length > 0)) {
      throw new ShopifyError(response.status, 'graphql', 'Shopify rejected the query.');
    }
    if (!isRecord(payload.data)) {
      throw new ShopifyError(response.status, 'invalid_response', 'Shopify sent no data.');
    }
    return payload.data;
  }

  /** Throws if a mutation reported userErrors; returns its payload otherwise. */
  function mutationResult(data: Record<string, unknown>, name: string): Record<string, unknown> {
    const result = data[name];
    if (!isRecord(result)) {
      throw new ShopifyError(200, 'invalid_response', `Shopify sent no ${name} result.`);
    }
    if (Array.isArray(result.userErrors) && result.userErrors.length > 0) {
      const first: unknown = result.userErrors[0];
      const message =
        isRecord(first) && typeof first.message === 'string' ? first.message : 'rejected';
      throw new ShopifyError(200, 'user_error', `Shopify refused ${name}: ${message}`);
    }
    return result;
  }

  return {
    async findCustomerIdByEmail(email) {
      const data = await graphql(
        `
          query FindCustomer($identifier: CustomerIdentifierInput!) {
            customerByIdentifier(identifier: $identifier) {
              id
            }
          }
        `,
        { identifier: { emailAddress: email } },
      );
      const customer = data.customerByIdentifier;
      return isRecord(customer) ? numericIdFromGid(customer.id, 'Customer') : null;
    },

    async createCustomer({ email, fullName }) {
      const [firstName, ...rest] = fullName.trim().split(/\s+/);
      const data = await graphql(
        `
          mutation CreateCustomer($input: CustomerInput!) {
            customerCreate(input: $input) {
              customer {
                id
              }
              userErrors {
                field
                message
              }
            }
          }
        `,
        {
          input: {
            email,
            firstName: firstName ?? '',
            lastName: rest.join(' '),
            tags: ['bro-batch-rewards'],
          },
        },
      );
      const result = mutationResult(data, 'customerCreate');
      const id = isRecord(result.customer)
        ? numericIdFromGid(result.customer.id, 'Customer')
        : null;
      if (!id) {
        throw new ShopifyError(200, 'invalid_response', 'Shopify did not return the new customer.');
      }
      return id;
    },

    async getVariantForReward(shopifyVariantId, shopifyCollectionId) {
      const data = await graphql(
        `
          query RewardVariant($variant: ID!, $collection: ID!) {
            productVariant(id: $variant) {
              price
              displayName
              product {
                inCollection(id: $collection)
              }
            }
          }
        `,
        {
          variant: gid('ProductVariant', shopifyVariantId),
          collection: gid('Collection', shopifyCollectionId),
        },
      );
      const variant = data.productVariant;
      if (!isRecord(variant)) {
        return null;
      }
      const priceCents = decimalToCents(variant.price);
      if (priceCents === null) {
        throw new ShopifyError(200, 'invalid_response', 'Shopify sent an unreadable price.');
      }
      return {
        title: typeof variant.displayName === 'string' ? variant.displayName : 'Item',
        priceCents,
        inCollection: isRecord(variant.product) && variant.product.inCollection === true,
      };
    },

    async createRewardDiscount(input) {
      const data = await graphql(
        `
          mutation CreateRewardDiscount($discount: DiscountCodeBasicInput!) {
            discountCodeBasicCreate(basicCodeDiscount: $discount) {
              codeDiscountNode {
                id
              }
              userErrors {
                field
                code
                message
              }
            }
          }
        `,
        {
          discount: {
            title: input.title,
            code: input.code,
            startsAt: input.startsAt,
            endsAt: input.endsAt,
            // One use, by one customer, on one product, for a fixed amount.
            usageLimit: 1,
            appliesOncePerCustomer: true,
            context: { customers: { add: [gid('Customer', input.shopifyCustomerId)] } },
            customerGets: {
              items: {
                products: {
                  productVariantsToAdd: [gid('ProductVariant', input.shopifyVariantId)],
                },
              },
              value: {
                discountAmount: {
                  amount: centsToDecimal(input.amountCents),
                  // The amount is the value of the free item(s) in total, not per unit.
                  appliesOnEachItem: false,
                },
              },
            },
            // A reward may be used together with the store's other discounts.
            combinesWith: { orderDiscounts: true, productDiscounts: true, shippingDiscounts: true },
            tags: ['bro-batch-reward'],
          },
        },
      );
      const result = mutationResult(data, 'discountCodeBasicCreate');
      const node = result.codeDiscountNode;
      if (!isRecord(node) || typeof node.id !== 'string' || !node.id.startsWith('gid://shopify/')) {
        throw new ShopifyError(200, 'invalid_response', 'Shopify did not return the new discount.');
      }
      return node.id;
    },

    async deleteDiscount(shopifyDiscountId) {
      const data = await graphql(
        `
          mutation DeleteRewardDiscount($id: ID!) {
            discountCodeDelete(id: $id) {
              deletedCodeDiscountId
              userErrors {
                field
                code
                message
              }
            }
          }
        `,
        { id: shopifyDiscountId },
      );
      // A discount that is already gone is the outcome we wanted.
      const result = data.discountCodeDelete;
      if (!isRecord(result)) {
        throw new ShopifyError(
          200,
          'invalid_response',
          'Shopify sent no discountCodeDelete result.',
        );
      }
    },
  };
}
