import { describe, expect, it } from 'vitest';

import { createApi } from './api.ts';

interface Captured {
  url: string;
  headers: Record<string, string>;
  body: unknown;
}

function setup(
  reply: { status: number; body: unknown } | Error,
  token: string | null = 'id-token',
) {
  const captured: Captured[] = [];
  const api = createApi({
    baseUrl: 'https://example.supabase.co/functions/v1/',
    getToken: () => Promise.resolve(token ?? undefined),
    fetch: ((url: string, init: RequestInit) => {
      captured.push({
        url,
        headers: init.headers as Record<string, string>,
        body: JSON.parse(init.body as string),
      });
      if (reply instanceof Error) {
        return Promise.reject(reply);
      }
      return Promise.resolve(
        typeof reply.body === 'string'
          ? new Response(reply.body, { status: reply.status })
          : Response.json(reply.body, { status: reply.status }),
      );
    }) as typeof fetch,
  });
  return { api, captured };
}

describe('POS extension API client', () => {
  it('sends the Shopify ID token and the scanned code', async () => {
    const { api, captured } = setup({
      status: 200,
      body: { member: { full_name: 'Mia' }, rewards: [] },
    });
    const result = await api.memberByCode('brobatch:member:abc');
    expect(result.ok).toBe(true);
    expect(captured).toEqual([
      {
        url: 'https://example.supabase.co/functions/v1/pos-member',
        headers: { 'content-type': 'application/json', authorization: 'Bearer id-token' },
        body: { membership_code: 'brobatch:member:abc' },
      },
    ]);
  });

  it('sends Shopify ids as strings so large ids are never rounded', async () => {
    const { api, captured } = setup({ status: 200, body: {} });
    await api.memberByShopifyCustomer(6000000000001);
    await api.reserveReward({
      customerId: 'c',
      rewardId: 'r',
      idempotencyKey: 'pos-key-0001',
      variantId: 111,
    });
    expect(captured[0]?.body).toEqual({ shopify_customer_id: '6000000000001' });
    expect(captured[1]?.body).toEqual({
      customer_id: 'c',
      reward_id: 'r',
      idempotency_key: 'pos-key-0001',
      variant_id: '111',
    });
  });

  it('never sends an amount, a price or a points value', async () => {
    const { api, captured } = setup({ status: 200, body: {} });
    await api.reserveReward({
      customerId: 'c',
      rewardId: 'r',
      idempotencyKey: 'pos-key-0001',
      variantId: 111,
    });
    await api.releaseReward('redemption-1');
    for (const call of captured) {
      const keys = Object.keys(call.body as object).join(',');
      expect(keys).not.toMatch(/amount|price|cents|points|discount/);
    }
    expect(captured[1]?.body).toEqual({ redemption_id: 'redemption-1' });
  });

  it("passes on the backend's message when something is refused", async () => {
    const { api } = setup({
      status: 409,
      body: {
        error: {
          code: 'insufficient_points',
          message: 'insufficient points: balance is 90, reward costs 300',
        },
      },
    });
    expect(
      await api.reserveReward({
        customerId: 'c',
        rewardId: 'r',
        idempotencyKey: 'pos-key-0001',
        variantId: 1,
      }),
    ).toEqual({
      ok: false,
      status: 409,
      code: 'insufficient_points',
      message: 'insufficient points: balance is 90, reward costs 300',
    });
  });

  it('reports a dropped connection as offline, without throwing', async () => {
    const { api } = setup(new TypeError('Network request failed'));
    const result = await api.memberByCode('x');
    expect(result).toMatchObject({ ok: false, status: 0, code: 'offline' });
  });

  it('copes with a reply that is not JSON', async () => {
    const { api } = setup({ status: 502, body: '<html>Bad gateway</html>' });
    const result = await api.memberByCode('x');
    expect(result).toMatchObject({ ok: false, status: 502, code: 'unexpected' });
  });

  it('does not call the backend at all without a Shopify session', async () => {
    const { api, captured } = setup({ status: 200, body: {} }, null);
    const result = await api.memberByCode('x');
    expect(result).toMatchObject({ ok: false, code: 'no_session' });
    expect(captured).toEqual([]);
  });
});
