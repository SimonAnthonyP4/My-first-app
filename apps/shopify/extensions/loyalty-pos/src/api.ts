// Calls from the POS extension to the Bro Batch backend. Every request
// carries the ID token Shopify issues to the signed-in POS user; the backend
// verifies it. The extension holds no secrets and makes no decisions about
// points or prices: it asks, and shows the answer.

export interface Member {
  customer_id: string;
  full_name: string;
  points_balance: number;
  /** A string: Shopify ids can be larger than a JavaScript number holds exactly. */
  shopify_customer_id: string;
}

export interface Reward {
  id: string;
  name: string;
  description: string | null;
  points_cost: number;
  grants_category: string;
  quantity: number;
  affordable: boolean;
  available_at_pos: boolean;
}

export interface MemberResponse {
  member: Member;
  points_per_dollar: number;
  rewards: Reward[];
}

export interface ReservedReward {
  id: string;
  discount_code: string;
  expires_at: string;
  points_cost: number;
  discount_cents: number;
  reward_name: string;
}

export type ApiResult<T> =
  { ok: true; data: T } | { ok: false; status: number; code: string; message: string };

export interface ApiOptions {
  baseUrl: string;
  /** Returns Shopify's ID token for the signed-in POS user, or undefined. */
  getToken: () => Promise<string | undefined>;
  fetch?: typeof fetch;
}

const OFFLINE = 'Could not reach Bro Batch Rewards. Check the connection and try again.';

export function createApi(options: ApiOptions) {
  const doFetch = options.fetch ?? fetch;
  const base = options.baseUrl.replace(/\/+$/, '');

  async function post<T>(path: string, body: unknown): Promise<ApiResult<T>> {
    let token: string | undefined;
    try {
      token = await options.getToken();
    } catch {
      token = undefined;
    }
    if (!token) {
      return {
        ok: false,
        status: 401,
        code: 'no_session',
        message: 'This Shopify account does not have access to the Bro Batch Rewards app.',
      };
    }

    let response: Response;
    try {
      response = await doFetch(`${base}/${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
    } catch {
      return { ok: false, status: 0, code: 'offline', message: OFFLINE };
    }

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      // handled below
    }

    if (response.ok && payload !== null && typeof payload === 'object') {
      return { ok: true, data: payload as T };
    }
    const error =
      payload !== null && typeof payload === 'object' && 'error' in payload
        ? (payload as { error?: { code?: unknown; message?: unknown } }).error
        : undefined;
    return {
      ok: false,
      status: response.status,
      code: typeof error?.code === 'string' ? error.code : 'unexpected',
      message: typeof error?.message === 'string' ? error.message : OFFLINE,
    };
  }

  return {
    memberByCode: (membershipCode: string) =>
      post<MemberResponse>('pos-member', { membership_code: membershipCode }),

    memberByShopifyCustomer: (shopifyCustomerId: number | string) =>
      post<MemberResponse>('pos-member', { shopify_customer_id: String(shopifyCustomerId) }),

    reserveReward: (input: {
      customerId: string;
      rewardId: string;
      idempotencyKey: string;
      variantId: number | string;
    }) =>
      post<{ redemption: ReservedReward; points_balance: number | null }>('pos-reserve-reward', {
        customer_id: input.customerId,
        reward_id: input.rewardId,
        idempotency_key: input.idempotencyKey,
        variant_id: String(input.variantId),
      }),

    releaseReward: (redemptionId: string) =>
      post<{ redemption: { id: string; status: string }; points_balance: number | null }>(
        'pos-release-reward',
        { redemption_id: redemptionId },
      ),
  };
}

export type Api = ReturnType<typeof createApi>;
