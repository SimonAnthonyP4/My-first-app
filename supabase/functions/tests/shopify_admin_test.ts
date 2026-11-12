import assert from 'node:assert/strict';

import {
  centsToDecimal,
  createShopifyAdmin,
  decimalToCents,
  numericIdFromGid,
  ShopifyError,
} from '../_shared/shopify_admin.ts';
import { CLIENT_ID, CLIENT_SECRET, SHOP } from './fakes.ts';

interface Captured {
  url: string;
  headers: Record<string, string>;
  body: string;
}

type Reply = { status?: number; body: unknown } | Error;

/** A fetch that answers the token endpoint and then replays the given GraphQL replies. */
function fakeFetch(replies: Reply[], captured: Captured[] = [], tokens = ['token-1', 'token-2']) {
  let tokenIndex = 0;
  const fetchImpl = ((input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    captured.push({
      url,
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: typeof init?.body === 'string' ? init.body : '',
    });
    if (url.endsWith('/admin/oauth/access_token')) {
      const token = tokens[Math.min(tokenIndex, tokens.length - 1)];
      tokenIndex += 1;
      return Promise.resolve(Response.json({ access_token: token, scope: 'x', expires_in: 86399 }));
    }
    const reply = replies.shift();
    if (!reply) {
      return Promise.reject(new Error('fakeFetch: no reply left'));
    }
    if (reply instanceof Error) {
      return Promise.reject(reply);
    }
    return Promise.resolve(
      typeof reply.body === 'string'
        ? new Response(reply.body, { status: reply.status ?? 200 })
        : Response.json(reply.body, { status: reply.status ?? 200 }),
    );
  }) as typeof fetch;
  return fetchImpl;
}

function admin(replies: Reply[], captured: Captured[] = [], now = () => 1_000_000) {
  return createShopifyAdmin({
    shopDomain: SHOP,
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    apiVersion: '2026-10',
    fetch: fakeFetch(replies, captured),
    now,
  });
}

Deno.test('money: decimal strings convert to cents without floating point', () => {
  assert.equal(decimalToCents('3.00'), 300);
  assert.equal(decimalToCents('3'), 300);
  assert.equal(decimalToCents('8.5'), 850);
  assert.equal(decimalToCents('1.15'), 115); // 1.15 * 100 is 114.99999999999999 in floating point
  assert.equal(decimalToCents('19.99'), 1999);
  for (const bad of ['', 'abc', '-1.00', '1.999', '1e3', null, 3]) {
    assert.equal(decimalToCents(bad), null, String(bad));
  }
  assert.equal(centsToDecimal(300), '3.00');
  assert.equal(centsToDecimal(5), '0.05');
  assert.equal(centsToDecimal(123456), '1234.56');
  assert.throws(() => centsToDecimal(-1));
  assert.throws(() => centsToDecimal(1.5));
});

Deno.test('ids: numeric ids are read from global ids exactly, including very large ones', () => {
  assert.equal(
    numericIdFromGid('gid://shopify/Customer/6000000000000000001', 'Customer'),
    '6000000000000000001',
  );
  assert.equal(numericIdFromGid('gid://shopify/Order/1', 'Customer'), null);
  assert.equal(numericIdFromGid('gid://shopify/Customer/abc', 'Customer'), null);
  assert.equal(numericIdFromGid(null, 'Customer'), null);
});

Deno.test('auth: the client credentials grant is used, and the token is cached', async () => {
  const captured: Captured[] = [];
  const shopify = admin(
    [
      { body: { data: { customerByIdentifier: { id: 'gid://shopify/Customer/42' } } } },
      { body: { data: { customerByIdentifier: null } } },
    ],
    captured,
  );

  assert.equal(await shopify.findCustomerIdByEmail('mia@example.com'), '42');
  assert.equal(await shopify.findCustomerIdByEmail('nobody@example.com'), null);

  const tokenCalls = captured.filter((call) => call.url.endsWith('/admin/oauth/access_token'));
  assert.equal(tokenCalls.length, 1, 'one token request for two API calls');
  assert.equal(tokenCalls[0]!.url, `https://${SHOP}/admin/oauth/access_token`);
  const form = new URLSearchParams(tokenCalls[0]!.body);
  assert.equal(form.get('grant_type'), 'client_credentials');
  assert.equal(form.get('client_id'), CLIENT_ID);
  assert.equal(form.get('client_secret'), CLIENT_SECRET);

  const apiCall = captured.find((call) => call.url.includes('/graphql.json'))!;
  assert.equal(apiCall.url, `https://${SHOP}/admin/api/2026-10/graphql.json`);
  assert.equal(apiCall.headers['x-shopify-access-token'], 'token-1');
  assert.deepEqual(JSON.parse(apiCall.body).variables, {
    identifier: { emailAddress: 'mia@example.com' },
  });
});

Deno.test('auth: the token is refreshed shortly before it expires', async () => {
  const captured: Captured[] = [];
  let now = 1_000_000;
  const shopify = admin(
    [
      { body: { data: { customerByIdentifier: null } } },
      { body: { data: { customerByIdentifier: null } } },
      { body: { data: { customerByIdentifier: null } } },
    ],
    captured,
    () => now,
  );
  await shopify.findCustomerIdByEmail('a@example.com');
  now += 23 * 3600 * 1000; // 23 hours later: still valid
  await shopify.findCustomerIdByEmail('a@example.com');
  now += 58 * 60 * 1000; // inside the last five minutes
  await shopify.findCustomerIdByEmail('a@example.com');
  assert.equal(captured.filter((call) => call.url.endsWith('/access_token')).length, 2);
});

Deno.test('auth: a rejected token is replaced once and the call retried', async () => {
  const captured: Captured[] = [];
  const shopify = admin(
    [
      { status: 401, body: { errors: 'Invalid API key or access token' } },
      { body: { data: { customerByIdentifier: { id: 'gid://shopify/Customer/7' } } } },
    ],
    captured,
  );
  assert.equal(await shopify.findCustomerIdByEmail('a@example.com'), '7');
  const tokens = captured
    .filter((call) => call.url.includes('/graphql.json'))
    .map((call) => call.headers['x-shopify-access-token']);
  assert.deepEqual(tokens, ['token-1', 'token-2']);
});

Deno.test('auth: a second 401 is an error, not an endless loop', async () => {
  const shopify = admin([
    { status: 401, body: {} },
    { status: 401, body: {} },
  ]);
  await assert.rejects(() => shopify.findCustomerIdByEmail('a@example.com'), ShopifyError);
});

Deno.test('createCustomer: splits the name and tags the customer', async () => {
  const captured: Captured[] = [];
  const shopify = admin(
    [
      {
        body: {
          data: {
            customerCreate: {
              customer: { id: 'gid://shopify/Customer/6000000000000000999' },
              userErrors: [],
            },
          },
        },
      },
    ],
    captured,
  );
  assert.equal(
    await shopify.createCustomer({ email: 'mia@example.com', fullName: '  Mia  van Member ' }),
    '6000000000000000999',
  );
  const call = captured.find((entry) => entry.url.includes('/graphql.json'))!;
  assert.deepEqual(JSON.parse(call.body).variables.input, {
    email: 'mia@example.com',
    firstName: 'Mia',
    lastName: 'van Member',
    tags: ['bro-batch-rewards'],
  });
});

Deno.test('createCustomer: Shopify userErrors become an error', async () => {
  const shopify = admin([
    {
      body: {
        data: {
          customerCreate: {
            customer: null,
            userErrors: [{ field: ['email'], message: 'Email has already been taken' }],
          },
        },
      },
    },
  ]);
  await assert.rejects(
    () => shopify.createCustomer({ email: 'mia@example.com', fullName: 'Mia' }),
    (error: unknown) => error instanceof ShopifyError && error.kind === 'user_error',
  );
});

Deno.test('getVariantForReward: returns the Shopify price and collection membership', async () => {
  const captured: Captured[] = [];
  const shopify = admin(
    [
      {
        body: {
          data: {
            productVariant: {
              price: '3.00',
              displayName: 'Chocolate Bar',
              product: { inCollection: true },
            },
          },
        },
      },
    ],
    captured,
  );
  assert.deepEqual(await shopify.getVariantForReward('111', '4000000000001'), {
    title: 'Chocolate Bar',
    priceCents: 300,
    inCollection: true,
  });
  const call = captured.find((entry) => entry.url.includes('/graphql.json'))!;
  assert.deepEqual(JSON.parse(call.body).variables, {
    variant: 'gid://shopify/ProductVariant/111',
    collection: 'gid://shopify/Collection/4000000000001',
  });
});

Deno.test(
  'getVariantForReward: an unknown variant is null; a product outside the collection says so',
  async () => {
    const shopify = admin([
      { body: { data: { productVariant: null } } },
      {
        body: {
          data: {
            productVariant: {
              price: '16.00',
              displayName: 'Six-Pack',
              product: { inCollection: false },
            },
          },
        },
      },
    ]);
    assert.equal(await shopify.getVariantForReward('999', '4000000000001'), null);
    assert.equal((await shopify.getVariantForReward('666', '4000000000001'))?.inCollection, false);
  },
);

Deno.test(
  'getVariantForReward: ids that are not numeric are refused before any request',
  async () => {
    const captured: Captured[] = [];
    const shopify = admin([], captured);
    await assert.rejects(
      () => shopify.getVariantForReward('111" } evil { id', '4000000000001'),
      RangeError,
    );
    await assert.rejects(() => shopify.getVariantForReward('111', 'abc'), RangeError);
    assert.equal(captured.filter((entry) => entry.url.includes('/graphql.json')).length, 0);
  },
);

Deno.test(
  'createRewardDiscount: one use, one customer, one product, a fixed amount, a short life',
  async () => {
    const captured: Captured[] = [];
    const shopify = admin(
      [
        {
          body: {
            data: {
              discountCodeBasicCreate: {
                codeDiscountNode: { id: 'gid://shopify/DiscountCodeNode/555' },
                userErrors: [],
              },
            },
          },
        },
      ],
      captured,
    );
    const id = await shopify.createRewardDiscount({
      code: 'BB-ABCD-EFGH-JKMN',
      title: 'Bro Batch reward: Free protein bar',
      shopifyCustomerId: '6000000000000000001',
      shopifyVariantId: '111',
      amountCents: 300,
      startsAt: '2027-01-15T08:00:00.000Z',
      endsAt: '2027-01-15T08:15:00+00:00',
    });
    assert.equal(id, 'gid://shopify/DiscountCodeNode/555');

    const discount = JSON.parse(captured.find((entry) => entry.url.includes('/graphql.json'))!.body)
      .variables.discount;
    assert.equal(discount.code, 'BB-ABCD-EFGH-JKMN');
    assert.equal(discount.usageLimit, 1);
    assert.equal(discount.appliesOncePerCustomer, true);
    assert.equal(discount.startsAt, '2027-01-15T08:00:00.000Z');
    assert.equal(discount.endsAt, '2027-01-15T08:15:00+00:00');
    assert.deepEqual(discount.context, {
      customers: { add: ['gid://shopify/Customer/6000000000000000001'] },
    });
    assert.deepEqual(discount.customerGets, {
      items: { products: { productVariantsToAdd: ['gid://shopify/ProductVariant/111'] } },
      value: { discountAmount: { amount: '3.00', appliesOnEachItem: false } },
    });
  },
);

Deno.test('createRewardDiscount: a refusal from Shopify is an error', async () => {
  const shopify = admin([
    {
      body: {
        data: {
          discountCodeBasicCreate: {
            codeDiscountNode: null,
            userErrors: [{ field: ['code'], code: 'TAKEN', message: 'Code must be unique' }],
          },
        },
      },
    },
  ]);
  await assert.rejects(
    () =>
      shopify.createRewardDiscount({
        code: 'BB-ABCD-EFGH-JKMN',
        title: 't',
        shopifyCustomerId: '1',
        shopifyVariantId: '2',
        amountCents: 300,
        startsAt: 'x',
        endsAt: 'y',
      }),
    (error: unknown) => error instanceof ShopifyError && error.kind === 'user_error',
  );
});

Deno.test(
  'deleteDiscount: deleting, and deleting something already gone, both succeed',
  async () => {
    const shopify = admin([
      {
        body: {
          data: {
            discountCodeDelete: {
              deletedCodeDiscountId: 'gid://shopify/DiscountCodeNode/555',
              userErrors: [],
            },
          },
        },
      },
      {
        body: {
          data: {
            discountCodeDelete: {
              deletedCodeDiscountId: null,
              userErrors: [
                { field: ['id'], code: 'NOT_FOUND', message: 'Discount does not exist' },
              ],
            },
          },
        },
      },
    ]);
    await shopify.deleteDiscount('gid://shopify/DiscountCodeNode/555');
    await shopify.deleteDiscount('gid://shopify/DiscountCodeNode/555');
  },
);

Deno.test(
  'errors: GraphQL errors, HTTP errors and unreadable bodies are all ShopifyErrors',
  async () => {
    const shopify = admin([
      { body: { errors: [{ message: 'Field does not exist' }] } },
      { status: 503, body: {} },
      { body: '<html>bad gateway</html>' },
      { body: { data: null } },
    ]);
    for (const kind of ['graphql', 'http', 'invalid_response', 'invalid_response']) {
      await assert.rejects(
        () => shopify.findCustomerIdByEmail('a@example.com'),
        (error: unknown) => error instanceof ShopifyError && error.kind === kind,
        kind,
      );
    }
  },
);

Deno.test('errors: a network failure never exposes the client secret or token', async () => {
  const shopify = admin([new Error(`connect failed: token-1 ${CLIENT_SECRET}`)]);
  await assert.rejects(
    () => shopify.findCustomerIdByEmail('a@example.com'),
    (error: unknown) => {
      assert.ok(error instanceof ShopifyError);
      assert.equal(error.kind, 'network');
      const text = `${error.message} ${JSON.stringify(error)}`;
      assert.equal(text.includes(CLIENT_SECRET), false);
      assert.equal(text.includes('token-1'), false);
      return true;
    },
  );
});

Deno.test('config: the store domain must be a myshopify.com domain', () => {
  const base = { clientId: CLIENT_ID, clientSecret: CLIENT_SECRET, apiVersion: '2026-10' };
  for (const bad of [
    '',
    'example.com',
    'evil.com/x.myshopify.com',
    'https://a.myshopify.com',
    'a.myshopify.com.evil.com',
    'A.myshopify.com',
  ]) {
    assert.throws(() => createShopifyAdmin({ ...base, shopDomain: bad }), Error, bad);
  }
  assert.throws(() => createShopifyAdmin({ ...base, shopDomain: SHOP, apiVersion: 'latest' }));
  assert.throws(() => createShopifyAdmin({ ...base, shopDomain: SHOP, clientSecret: '' }));
  assert.doesNotThrow(() => createShopifyAdmin({ ...base, shopDomain: SHOP }));
});
