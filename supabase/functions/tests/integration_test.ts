// End-to-end: the real handlers against a real, migrated PostgreSQL database.
// Only Shopify is faked. This proves that the handlers and the database
// functions fit together (names, argument types, error codes) and that a
// sale flows from scan to reward to payment to refund correctly.
//
// Needs a database prepared by scripts/db-test.sh (migrations + seed); it
// passes the name in BROBATCH_TEST_DB. Without it these tests are skipped.
import assert from 'node:assert/strict';

import type { Db, Deps, RedemptionRow, WebhookDeps } from '../_shared/deps.ts';
import { DbError } from '../_shared/errors.ts';
import { handlePosMember } from '../_shared/handlers/pos_member.ts';
import { handlePosReleaseReward } from '../_shared/handlers/pos_release_reward.ts';
import { handlePosReserveReward } from '../_shared/handlers/pos_reserve_reward.ts';
import { handleShopifyWebhook } from '../_shared/handlers/shopify_webhook.ts';
import { respond } from '../_shared/http.ts';
import { computeWebhookHmac } from '../_shared/shopify_hmac.ts';
import {
  body,
  CLIENT_ID,
  CLIENT_SECRET,
  FakeShopify,
  idToken,
  NOW,
  posRequest,
  SHOP,
} from './fakes.ts';

const DATABASE = Deno.env.get('BROBATCH_TEST_DB');

const OWNER = 'aaaaaaaa-0000-4000-8000-000000000001';
const MIA = 'aaaaaaaa-0000-4000-8000-000000000002';
const MIA_CODE = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
// Deliberately beyond 2^53: these must survive the whole path unrounded.
const MIA_SHOPIFY = '6000000000000000001';
const ORDER_1 = '9000000000000003001';
const ORDER_2 = '9000000000000003002';
const LINE_1 = '9100000000000003001';
const LINE_2 = '9100000000000003002';
const REFUND_1 = '9200000000000003001';
const REFUND_2 = '9200000000000003002';

async function psql(sql: string): Promise<string> {
  const command = new Deno.Command('psql', {
    args: [
      '-d',
      DATABASE!,
      '-X',
      '-At',
      '-q',
      '-v',
      'ON_ERROR_STOP=1',
      '-v',
      'VERBOSITY=verbose',
      '-c',
      sql,
    ],
    stdout: 'piped',
    stderr: 'piped',
  });
  const { code, stdout, stderr } = await command.output();
  if (code !== 0) {
    const message = new TextDecoder().decode(stderr);
    const match = /ERROR:\s+([0-9A-Z]{5}):\s+(.*)/.exec(message);
    throw new DbError(match?.[1] ?? 'XX000', match?.[2] ?? message);
  }
  return new TextDecoder().decode(stdout).trim();
}

/** Calls database functions the way the service role does, by argument name. */
class PostgresDb implements Db {
  private signatures = new Map<string, { args: Map<string, string>; returnsSet: boolean }>();

  private async signature(fn: string) {
    let signature = this.signatures.get(fn);
    if (!signature) {
      const rows = await psql(`
        select p.proretset::text || '|' || a.name || '=' || a.type::regtype
        from pg_proc p, unnest(p.proargnames, p.proallargtypes) with ordinality as a(name, type, n)
        where p.pronamespace = 'public'::regnamespace and p.proname = '${fn}' and a.n <= p.pronargs
        union all
        select p.proretset::text || '|' || a.name || '=' || a.type::regtype
        from pg_proc p, unnest(p.proargnames, p.proargtypes::oid[]) as a(name, type)
        where p.pronamespace = 'public'::regnamespace and p.proname = '${fn}' and p.proallargtypes is null`);
      const lines = rows.split('\n').filter(Boolean);
      assert.ok(lines.length > 0, `database function public.${fn} does not exist`);
      signature = {
        returnsSet: lines[0]!.startsWith('true|'),
        args: new Map(
          lines.map((line) => line.slice(line.indexOf('|') + 1).split('=') as [string, string]),
        ),
      };
      this.signatures.set(fn, signature);
    }
    return signature;
  }

  async rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
    const signature = await this.signature(fn);
    const named = Object.keys(args).map((name) => {
      const type = signature.args.get(name);
      assert.ok(type, `public.${fn} has no parameter named ${name}`);
      return `${name} => (j ->> '${name}')::${type}`;
    });
    const call = `public.${fn}(${named.join(', ')})`;
    const out = await psql(`
      set role service_role;
      select ${signature.returnsSet ? "coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb)" : 'to_jsonb(r)'}
      from (select $bbjson$${JSON.stringify(args)}$bbjson$::jsonb as j) s, lateral ${call} as r`);
    const value = JSON.parse(out);
    // A function returning a scalar comes back as {"fn": value}.
    return (
      !signature.returnsSet && value !== null && typeof value === 'object' && fn in value
        ? value[fn]
        : value
    ) as T;
  }

  async getRedemption(redemptionId: string): Promise<RedemptionRow | null> {
    const out = await psql(`select to_jsonb(r) from (
      select id, customer_id, reward_id, status, points_cost, discount_code, shopify_discount_id, expires_at
      from public.redemptions where id = '${redemptionId}') r`);
    return out ? JSON.parse(out) : null;
  }

  async getPointsPerDollar(): Promise<number> {
    return Number(await psql('select points_per_dollar from public.app_settings'));
  }
}

async function webhook(
  topic: string,
  webhookId: string,
  raw: string,
  secret = CLIENT_SECRET,
): Promise<Request> {
  return new Request('http://localhost/shopify-webhook', {
    method: 'POST',
    headers: {
      'x-shopify-topic': topic,
      'x-shopify-shop-domain': SHOP,
      'x-shopify-webhook-id': webhookId,
      'x-shopify-event-id': `event-${webhookId}`,
      'x-shopify-hmac-sha256': await computeWebhookHmac(secret, new TextEncoder().encode(raw)),
    },
    body: raw,
  });
}

/** An orders/paid body, written as text so the large ids stay exact. */
function orderBody(orderId: string, lineId: string, quantity: number, code?: string): string {
  const gross = 3 * quantity;
  const discount = code ? 3 : 0;
  return `{"id":${orderId},"name":"#${orderId.slice(-4)}","financial_status":"paid","currency":"USD",
    "test":false,"source_name":"pos","location_id":70000000001,"user_id":80000000001,
    "created_at":"2026-11-12T10:00:00-05:00","processed_at":"2026-11-12T10:00:05-05:00",
    "total_line_items_price":"${gross}.00","total_discounts":"${discount}.00",
    "subtotal_price":"${gross - discount}.00","total_tax":"0.00","total_price":"${gross - discount}.00",
    "discount_codes":${code ? `[{"code":"${code}","amount":"3.00","type":"fixed_amount"}]` : '[]'},
    "customer":{"id":${MIA_SHOPIFY},"email":"it-mia@test.brobatch"},
    "line_items":[{"id":${lineId},"variant_id":111,"product_id":11,"title":"Chocolate Bar",
      "sku":"BAR-CHOC","price":"3.00","quantity":${quantity}}]}`;
}

function refundBody(
  refundId: string,
  orderId: string,
  lineId: string,
  quantity: number,
  amount: string,
): string {
  return `{"id":${refundId},"order_id":${orderId},"note":"integration test",
    "created_at":"2026-11-12T11:00:00-05:00","processed_at":"2026-11-12T11:00:02-05:00",
    "refund_line_items":[{"line_item_id":${lineId},"quantity":${quantity},
      "subtotal_set":{"shop_money":{"amount":"${amount}","currency_code":"USD"}}}]}`;
}

Deno.test({
  name: 'integration: scan, reward, sale, refund and release against the real database',
  ignore: !DATABASE,
  async fn(t) {
    const db = new PostgresDb();
    const shopify = new FakeShopify();
    shopify.customerIdByEmail = MIA_SHOPIFY;
    const logs: string[] = [];
    const deps: Deps = {
      db,
      shopify,
      idToken: { clientId: CLIENT_ID, clientSecret: CLIENT_SECRET, shopDomain: SHOP },
      log: (message) => logs.push(message),
      now: () => NOW,
    };
    const webhookDeps: WebhookDeps = {
      db,
      log: (message) => logs.push(message),
      webhookSecret: CLIENT_SECRET,
      shopDomain: SHOP,
    };

    await psql(`
      insert into auth.users (id, email) values
        ('${OWNER}', 'it-owner@test.brobatch'), ('${MIA}', 'it-mia@test.brobatch');
      insert into public.employees (id, full_name, role) values ('${OWNER}', 'IT Owner', 'owner');
      insert into public.customers (id, full_name, email, membership_code)
        values ('${MIA}', 'Mia Member', 'it-mia@test.brobatch', '${MIA_CODE}');
      insert into public.loyalty_transactions (customer_id, kind, points, reason, created_by)
        values ('${MIA}', 'adjust', 600, 'integration test: opening balance', '${OWNER}');
      update public.rewards set shopify_collection_id = 4000000000001 where name = 'Free protein bar';`);

    const rewardId = await psql(`select id from public.rewards where name = 'Free protein bar'`);
    const balance = () =>
      psql(`select balance from public.loyalty_accounts where customer_id = '${MIA}'`);
    const scalar = psql;

    await t.step(
      'scanning the QR finds the member and links her to her Shopify customer',
      async () => {
        const response = await respond(
          handlePosMember,
          await posRequest({ membership_code: `brobatch:member:${MIA_CODE}` }),
          deps,
        );
        assert.equal(response.status, 200);
        const result = await body(response);
        assert.equal(result.member.customer_id, MIA);
        assert.equal(result.member.points_balance, 600);
        assert.equal(result.member.shopify_customer_id, MIA_SHOPIFY);
        assert.equal(result.points_per_dollar, 10);
        const bar = result.rewards.find((r: { name: string }) => r.name === 'Free protein bar');
        assert.deepEqual(
          [bar.points_cost, bar.affordable, bar.available_at_pos],
          [300, true, true],
        );
        const six = result.rewards.find((r: { name: string }) => r.name === 'Free six-pack');
        assert.deepEqual([six.affordable, six.available_at_pos], [false, false]);
        assert.equal(
          await scalar(`select shopify_customer_id from public.customers where id = '${MIA}'`),
          MIA_SHOPIFY,
          'the Shopify id is stored exactly',
        );
      },
    );

    await t.step('scanning again does not call Shopify to link a second time', async () => {
      const before = shopify.calls.length;
      const response = await respond(
        handlePosMember,
        await posRequest({ membership_code: MIA_CODE }),
        deps,
      );
      assert.equal(response.status, 200);
      assert.equal(shopify.calls.length, before);
    });

    await t.step('a QR code that is not a membership is refused', async () => {
      const response = await respond(
        handlePosMember,
        await posRequest({ membership_code: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' }),
        deps,
      );
      assert.equal(response.status, 404);
    });

    await t.step('a request without a valid Shopify POS session is refused', async () => {
      const forged = await idToken({}, { secret: 'not-the-secret' });
      const response = await respond(
        handlePosMember,
        await posRequest({ membership_code: MIA_CODE }, forged),
        deps,
      );
      assert.equal(response.status, 401);
    });

    let code = '';
    let redemptionId = '';

    await t.step('applying a reward debits the points and issues a single-use code', async () => {
      const response = await respond(
        handlePosReserveReward,
        await posRequest({
          customer_id: MIA,
          reward_id: rewardId,
          idempotency_key: 'it-apply-0001',
          variant_id: 111,
        }),
        deps,
      );
      assert.equal(response.status, 200);
      const result = await body(response);
      code = result.redemption.discount_code;
      redemptionId = result.redemption.id;
      assert.match(code, /^BB-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
      assert.equal(result.redemption.discount_cents, 300);
      assert.equal(result.points_balance, 300);
      assert.equal(await balance(), '300');

      const created = shopify.called('createRewardDiscount')[0]!.params as Record<string, unknown>;
      assert.equal(created.code, code);
      assert.equal(created.shopifyCustomerId, MIA_SHOPIFY);
      assert.equal(created.amountCents, 300);
      assert.equal(
        await scalar(`select status || ':' || shopify_discount_id || ':' || reserved_by_shopify_user_id
                      from public.redemptions where id = '${redemptionId}'`),
        'reserved:gid://shopify/DiscountCodeNode/555:80000000001',
      );
    });

    await t.step(
      'retrying the same tap returns the same code and creates nothing new',
      async () => {
        const response = await respond(
          handlePosReserveReward,
          await posRequest({
            customer_id: MIA,
            reward_id: rewardId,
            idempotency_key: 'it-apply-0001',
            variant_id: 111,
          }),
          deps,
        );
        assert.equal((await body(response)).redemption.discount_code, code);
        assert.equal(shopify.called('createRewardDiscount').length, 1);
        assert.equal(await balance(), '300');
      },
    );

    await t.step('a reward cannot be applied to a product outside its collection', async () => {
      shopify.variant = { title: 'Variety Six-Pack', priceCents: 1600, inCollection: false };
      const response = await respond(
        handlePosReserveReward,
        await posRequest({
          customer_id: MIA,
          reward_id: rewardId,
          idempotency_key: 'it-apply-0002',
          variant_id: 666,
        }),
        deps,
      );
      assert.equal(response.status, 422);
      assert.equal(await balance(), '300', 'no points moved');
      shopify.variant = { title: 'Chocolate Bar', priceCents: 300, inCollection: true };
    });

    await t.step('a forged order webhook does nothing', async () => {
      const response = await respond(
        handleShopifyWebhook,
        await webhook(
          'orders/paid',
          'it-forged',
          orderBody(ORDER_1, LINE_1, 2, code),
          'not-the-secret',
        ),
        webhookDeps,
      );
      assert.equal(response.status, 401);
      assert.equal(
        await scalar(`select count(*) from public.orders where shopify_order_id = ${ORDER_1}`),
        '0',
      );
      assert.equal(
        await scalar(`select count(*) from public.shopify_webhook_events where id = 'it-forged'`),
        '0',
      );
    });

    await t.step(
      'the signed order webhook mirrors the sale, fulfils the reward and awards points',
      async () => {
        const response = await respond(
          handleShopifyWebhook,
          await webhook('orders/paid', 'it-order-1', orderBody(ORDER_1, LINE_1, 2, code)),
          webhookDeps,
        );
        assert.equal(response.status, 200);
        assert.equal((await body(response)).outcome, 'processed');
        assert.equal(
          await scalar(`select shopify_order_id || '|' || status || '|' || subtotal_cents || '|' || reward_cents
                        || '|' || total_cents || '|' || points_awarded || '|' || source
                      from public.orders where shopify_order_id = ${ORDER_1}`),
          `${ORDER_1}|paid|600|300|300|30|pos`,
        );
        assert.equal(
          await scalar(`select shopify_line_item_id from public.order_items i join public.orders o on o.id = i.order_id
                      where o.shopify_order_id = ${ORDER_1}`),
          LINE_1,
          'the line item id survived unrounded',
        );
        assert.equal(
          await scalar(`select status from public.redemptions where id = '${redemptionId}'`),
          'fulfilled',
        );
        assert.equal(await balance(), '330', '300 left + 30 earned on the $3.00 paid');
      },
    );

    await t.step('the same delivery again changes nothing', async () => {
      const response = await respond(
        handleShopifyWebhook,
        await webhook('orders/paid', 'it-order-1', orderBody(ORDER_1, LINE_1, 2, code)),
        webhookDeps,
      );
      assert.equal((await body(response)).outcome, 'duplicate');
      assert.equal(await balance(), '330');
    });

    await t.step('a used reward cannot be taken back off', async () => {
      const response = await respond(
        handlePosReleaseReward,
        await posRequest({ redemption_id: redemptionId }),
        deps,
      );
      assert.equal(response.status, 409);
      assert.equal(await balance(), '330');
    });

    await t.step('a refund takes back the earned points but not the reward', async () => {
      const response = await respond(
        handleShopifyWebhook,
        await webhook(
          'refunds/create',
          'it-refund-1',
          refundBody(REFUND_1, ORDER_1, LINE_1, 2, '3.00'),
        ),
        webhookDeps,
      );
      assert.equal((await body(response)).outcome, 'processed');
      assert.equal(
        await scalar(`select status from public.orders where shopify_order_id = ${ORDER_1}`),
        'refunded',
      );
      assert.equal(await balance(), '300', 'the 30 earned are gone; the 300 spent stay spent');
      assert.equal(
        await scalar(`select status from public.redemptions where id = '${redemptionId}'`),
        'fulfilled',
      );
    });

    await t.step('a refund that arrives before its order is retried, then processed', async () => {
      const early = await respond(
        handleShopifyWebhook,
        await webhook(
          'refunds/create',
          'it-refund-2',
          refundBody(REFUND_2, ORDER_2, LINE_2, 1, '3.00'),
        ),
        webhookDeps,
      );
      assert.equal(early.status, 503);

      const order = await respond(
        handleShopifyWebhook,
        await webhook('orders/paid', 'it-order-2', orderBody(ORDER_2, LINE_2, 3)),
        webhookDeps,
      );
      assert.equal((await body(order)).outcome, 'processed');
      assert.equal(await balance(), '390', '300 + 90 earned on $9.00');

      const again = await respond(
        handleShopifyWebhook,
        await webhook(
          'refunds/create',
          'it-refund-2',
          refundBody(REFUND_2, ORDER_2, LINE_2, 1, '3.00'),
        ),
        webhookDeps,
      );
      assert.equal(again.status, 200);
      assert.equal((await body(again)).outcome, 'processed');
      assert.equal(await balance(), '360');
    });

    await t.step(
      'a reward taken off the cart deletes its code and returns the points',
      async () => {
        const applied = await body(
          await respond(
            handlePosReserveReward,
            await posRequest({
              customer_id: MIA,
              reward_id: rewardId,
              idempotency_key: 'it-apply-0003',
              variant_id: 111,
            }),
            deps,
          ),
        );
        assert.equal(await balance(), '60');

        const response = await respond(
          handlePosReleaseReward,
          await posRequest({ redemption_id: applied.redemption.id }),
          deps,
        );
        assert.equal(response.status, 200);
        const result = await body(response);
        assert.equal(result.redemption.status, 'released');
        assert.equal(result.points_balance, 360);
        assert.equal(await balance(), '360');
        assert.equal(shopify.called('deleteDiscount').length, 1);
      },
    );

    await t.step('not enough points: refused, and no code is created in Shopify', async () => {
      await psql(`insert into public.loyalty_transactions (customer_id, kind, points, reason, created_by)
                  values ('${MIA}', 'adjust', -100, 'integration test: leave 260', '${OWNER}')`);
      const before = shopify.called('createRewardDiscount').length;
      const response = await respond(
        handlePosReserveReward,
        await posRequest({
          customer_id: MIA,
          reward_id: rewardId,
          idempotency_key: 'it-apply-0004',
          variant_id: 111,
        }),
        deps,
      );
      assert.equal(response.status, 409);
      assert.equal((await body(response)).error.code, 'insufficient_points');
      assert.equal(shopify.called('createRewardDiscount').length, before);
      assert.equal(await balance(), '260');
    });

    await t.step('books balance: every balance equals its ledger', async () => {
      assert.equal(
        await scalar(`select count(*) from public.loyalty_accounts a
          left join (select customer_id, sum(points) t from public.loyalty_transactions group by 1) x
            on x.customer_id = a.customer_id
          where a.balance <> coalesce(x.t, 0) or a.balance < 0`),
        '0',
      );
    });
  },
});
