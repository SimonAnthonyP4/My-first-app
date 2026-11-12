// End-to-end: the real handlers against a real, migrated PostgreSQL database.
// Only Stripe and the auth server are faked. This proves that the handlers
// and the database functions fit together (names, argument types, error
// codes) and that a sale flows from checkout to refund correctly.
//
// Needs a database prepared by scripts/db-test.sh (migrations + seed); it
// passes the name in BROBATCH_TEST_DB. Without it these tests are skipped.
import assert from 'node:assert/strict';

import type { Db, Deps } from '../_shared/deps.ts';
import { DbError } from '../_shared/errors.ts';
import { handleCancelOrder } from '../_shared/handlers/cancel_order.ts';
import { handleConnectionToken } from '../_shared/handlers/connection_token.ts';
import { handleCreatePaymentIntent } from '../_shared/handlers/create_payment_intent.ts';
import { handleProcessRefund } from '../_shared/handlers/process_refund.ts';
import { handleStripeWebhook } from '../_shared/handlers/stripe_webhook.ts';
import { respond } from '../_shared/http.ts';
import { computeSignature } from '../_shared/webhook.ts';
import { body, FakeAuth, FakeStripe, NOW, post } from './fakes.ts';

const DATABASE = Deno.env.get('BROBATCH_TEST_DB');
const WEBHOOK_SECRET = ['whsec', 'integration', 'fixture'].join('_');

const OWNER = 'aaaaaaaa-0000-4000-8000-000000000001';
const MANAGER = 'aaaaaaaa-0000-4000-8000-000000000002';
const CASHIER = 'aaaaaaaa-0000-4000-8000-000000000003';
const CUSTOMER = 'aaaaaaaa-0000-4000-8000-000000000004';
const FORMER = 'aaaaaaaa-0000-4000-8000-000000000005';

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

async function scalar(sql: string): Promise<string> {
  return await psql(sql);
}

/** Calls database functions the way the service role does, by argument name. */
class PostgresDb implements Db {
  private signatures = new Map<string, Map<string, string>>();

  private async signature(fn: string): Promise<Map<string, string>> {
    let signature = this.signatures.get(fn);
    if (!signature) {
      const rows = await psql(`
        select a.name || '=' || a.type::regtype
        from pg_proc p, unnest(p.proargnames, p.proargtypes::oid[]) as a(name, type)
        where p.pronamespace = 'public'::regnamespace and p.proname = '${fn}'`);
      signature = new Map(
        rows
          .split('\n')
          .filter(Boolean)
          .map((row) => row.split('=') as [string, string]),
      );
      assert.ok(signature.size > 0, `database function public.${fn} does not exist`);
      this.signatures.set(fn, signature);
    }
    return signature;
  }

  async rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
    const signature = await this.signature(fn);
    const named = Object.keys(args).map((name) => {
      const type = signature.get(name);
      assert.ok(type, `public.${fn} has no parameter named ${name}`);
      return type === 'jsonb'
        ? `${name} => j -> '${name}'`
        : `${name} => (j ->> '${name}')::${type}`;
    });
    const out = await psql(`
      set role service_role;
      select to_jsonb(r) from (select $bbjson$${JSON.stringify(args)}$bbjson$::jsonb as j) s,
        lateral public.${fn}(${named.join(', ')}) as r`);
    const value = JSON.parse(out);
    // A function returning a scalar comes back as {"fn": value}.
    return (value !== null && typeof value === 'object' && fn in value ? value[fn] : value) as T;
  }

  async getActiveEmployee(userId: string) {
    const out = await psql(
      `select to_jsonb(e) from (select id, role from public.employees where id = '${userId}' and is_active) e`,
    );
    return out ? JSON.parse(out) : null;
  }

  async listOpenPaymentIntents(orderId: string) {
    const out = await psql(`select provider_payment_intent from public.payments
      where order_id = '${orderId}' and status in ('requires_payment_method', 'processing')`);
    return out.split('\n').filter(Boolean);
  }

  async getRefundPaymentIntent(refundId: string) {
    const out = await psql(`select p.provider_payment_intent from public.refunds r
      join public.payments p on p.id = r.payment_id where r.id = '${refundId}'`);
    return out || null;
  }
}

async function webhookRequest(event: unknown, secret = WEBHOOK_SECRET): Promise<Request> {
  const raw = JSON.stringify(event);
  const signature = await computeSignature(secret, NOW, raw);
  return new Request('http://localhost/stripe-webhook', {
    method: 'POST',
    headers: { 'stripe-signature': `t=${NOW},v1=${signature}` },
    body: raw,
  });
}

function paidEvent(eventId: string, paymentIntent: string, amount: number) {
  return {
    id: eventId,
    type: 'payment_intent.succeeded',
    created: NOW,
    livemode: false,
    data: {
      object: {
        id: paymentIntent,
        object: 'payment_intent',
        status: 'succeeded',
        amount,
        amount_received: amount,
        currency: 'usd',
        latest_charge: `ch_${paymentIntent.slice(3)}`,
        metadata: { reader_type: 'simulated' },
      },
    },
  };
}

Deno.test({
  name: 'integration: checkout, payment, refund and cancellation against the real database',
  ignore: !DATABASE,
  async fn(t) {
    const db = new PostgresDb();
    const auth = new FakeAuth();
    auth.tokens = new Map([
      ['cashier-token', CASHIER],
      ['manager-token', MANAGER],
      ['customer-token', CUSTOMER],
      ['former-token', FORMER],
    ]);
    const stripe = new FakeStripe();
    stripe.echo = true;
    const logs: string[] = [];
    const deps: Deps = {
      db,
      auth,
      stripe,
      stripeMode: 'test',
      log: (message) => logs.push(message),
      now: () => NOW,
    };
    const webhookDeps = { ...deps, webhookSecret: WEBHOOK_SECRET };

    await psql(`
      insert into auth.users (id, email) values
        ('${OWNER}', 'it-owner@test.brobatch'), ('${MANAGER}', 'it-manager@test.brobatch'),
        ('${CASHIER}', 'it-cashier@test.brobatch'), ('${CUSTOMER}', 'it-customer@test.brobatch'),
        ('${FORMER}', 'it-former@test.brobatch');
      insert into public.employees (id, full_name, role, is_active) values
        ('${OWNER}', 'IT Owner', 'owner', true), ('${MANAGER}', 'IT Manager', 'manager', true),
        ('${CASHIER}', 'IT Cashier', 'employee', true), ('${FORMER}', 'IT Former', 'employee', false);
      insert into public.customers (id, full_name, email)
        values ('${CUSTOMER}', 'IT Customer', 'it-customer@test.brobatch');
      insert into public.loyalty_transactions (customer_id, kind, points, reason, created_by)
        values ('${CUSTOMER}', 'adjust', 300, 'integration test: opening balance', '${OWNER}');`);

    const bar = await scalar(`select id from public.products where sku = 'BAR-CHOC-PB'`);
    const six = await scalar(`select id from public.products where sku = '6PK-VARIETY'`);
    const barStock = () =>
      scalar(`select on_hand from public.inventory_levels where product_id = '${bar}'`);
    const balance = () =>
      scalar(`select balance from public.loyalty_accounts where customer_id = '${CUSTOMER}'`);
    const order = (id: string, column: string) =>
      scalar(`select ${column} from public.orders where id = '${id}'`);
    const stockAtStart = Number(await barStock());

    let orderId = '';
    let paymentIntent = '';

    await t.step('a cashier starts a checkout; the server prices it', async () => {
      const response = await respond(
        handleCreatePaymentIntent,
        post(
          {
            idempotency_key: 'it-checkout-0001',
            items: [{ product_id: bar, quantity: 3 }],
            customer_id: CUSTOMER,
            reader_type: 'simulated',
          },
          'cashier-token',
        ),
        deps,
      );
      assert.equal(response.status, 200);
      const result = await body(response);
      orderId = result.order.id;
      paymentIntent = result.payment_intent.id;
      assert.equal(result.order.status, 'pending');
      assert.equal(result.order.total_cents, 900);
      assert.ok(result.payment_intent.client_secret);
      assert.equal(await order(orderId, 'status'), 'pending');
      assert.equal(
        await scalar(
          `select status || ':' || amount_cents from public.payments where order_id = '${orderId}'`,
        ),
        'requires_payment_method:900',
      );
      assert.equal(await balance(), '300', 'no points before payment');
      assert.equal(Number(await barStock()), stockAtStart, 'no stock moved before payment');
    });

    await t.step('retrying the checkout returns the same order and PaymentIntent', async () => {
      const response = await respond(
        handleCreatePaymentIntent,
        post(
          {
            idempotency_key: 'it-checkout-0001',
            items: [{ product_id: bar, quantity: 3 }],
            customer_id: CUSTOMER,
          },
          'cashier-token',
        ),
        deps,
      );
      const result = await body(response);
      assert.equal(result.order.id, orderId);
      assert.equal(result.payment_intent.id, paymentIntent);
      assert.equal(
        await scalar(`select count(*) from public.payments where order_id = '${orderId}'`),
        '1',
      );
    });

    await t.step('a forged webhook cannot mark the order paid', async () => {
      const response = await respond(
        handleStripeWebhook,
        await webhookRequest(
          paidEvent('evt_it_forged', paymentIntent, 900),
          'whsec_not_the_secret',
        ),
        webhookDeps,
      );
      assert.equal(response.status, 400);
      assert.equal(await order(orderId, 'status'), 'pending');
      assert.equal(
        await scalar(`select count(*) from public.stripe_events where id = 'evt_it_forged'`),
        '0',
      );
    });

    await t.step('a signed webhook for the wrong amount is flagged, not accepted', async () => {
      const response = await respond(
        handleStripeWebhook,
        await webhookRequest(paidEvent('evt_it_wrong_amount', paymentIntent, 9)),
        webhookDeps,
      );
      assert.equal(response.status, 200);
      assert.equal((await body(response)).outcome, 'failed:amount_mismatch');
      assert.equal(await order(orderId, 'status'), 'pending');
    });

    await t.step('the signed payment confirmation completes the sale', async () => {
      const response = await respond(
        handleStripeWebhook,
        await webhookRequest(paidEvent('evt_it_paid_1', paymentIntent, 900)),
        webhookDeps,
      );
      assert.equal(response.status, 200);
      assert.equal((await body(response)).outcome, 'processed');
      assert.equal(await order(orderId, 'status'), 'paid');
      assert.equal(await order(orderId, 'points_awarded'), '90');
      assert.equal(await balance(), '390', '300 + 90 earned on $9.00');
      assert.equal(Number(await barStock()), stockAtStart - 3);
      assert.equal(
        await scalar(`select status || ':' || card_brand || ':' || card_last4 || ':' || reader_type
                      from public.payments where order_id = '${orderId}'`),
        'succeeded:visa:4242:simulated',
      );
    });

    await t.step('the same confirmation delivered again changes nothing', async () => {
      const response = await respond(
        handleStripeWebhook,
        await webhookRequest(paidEvent('evt_it_paid_1', paymentIntent, 900)),
        webhookDeps,
      );
      assert.equal((await body(response)).outcome, 'duplicate');
      assert.equal(await balance(), '390');
      assert.equal(Number(await barStock()), stockAtStart - 3);
    });

    await t.step('a paid order cannot be cancelled', async () => {
      const response = await respond(
        handleCancelOrder,
        post({ order_id: orderId }, 'cashier-token'),
        deps,
      );
      assert.equal(response.status, 409);
      assert.equal(await order(orderId, 'status'), 'paid');
    });

    await t.step('refunding one bar returns $3.00, one bar to stock and 30 points', async () => {
      const item = await scalar(`select id from public.order_items where order_id = '${orderId}'`);
      const response = await respond(
        handleProcessRefund,
        post(
          {
            order_id: orderId,
            idempotency_key: 'it-refund-0001',
            items: [{ order_item_id: item, quantity: 1 }],
            reason: 'customer_request',
          },
          'cashier-token',
        ),
        deps,
      );
      assert.equal(response.status, 200);
      const result = await body(response);
      assert.equal(result.refund.status, 'succeeded');
      assert.equal(result.refund.amount_cents, 300);
      assert.equal(result.refund.points_reversed, 30);
      assert.equal(await order(orderId, 'status'), 'partially_refunded');
      assert.equal(await balance(), '360');
      assert.equal(Number(await barStock()), stockAtStart - 2);

      // The refund webhook arriving afterwards changes nothing.
      const webhook = await respond(
        handleStripeWebhook,
        await webhookRequest({
          id: 'evt_it_refund_1',
          type: 'refund.updated',
          created: NOW,
          livemode: false,
          data: {
            object: {
              id: result.refund.provider_refund_id,
              object: 'refund',
              status: 'succeeded',
              amount: 300,
              currency: 'usd',
              metadata: { refund_id: result.refund.id },
            },
          },
        }),
        webhookDeps,
      );
      assert.equal((await body(webhook)).outcome, 'processed');
      assert.equal(await balance(), '360');
      assert.equal(Number(await barStock()), stockAtStart - 2);
    });

    await t.step(
      "a large refund needs a manager, proven by the manager's own sign-in",
      async () => {
        const checkout = await body(
          await respond(
            handleCreatePaymentIntent,
            post(
              { idempotency_key: 'it-checkout-0002', items: [{ product_id: six, quantity: 3 }] },
              'cashier-token',
            ),
            deps,
          ),
        );
        assert.equal(checkout.order.total_cents, 4800);
        await respond(
          handleStripeWebhook,
          await webhookRequest(paidEvent('evt_it_paid_2', checkout.payment_intent.id, 4800)),
          webhookDeps,
        );
        const item = await scalar(
          `select id from public.order_items where order_id = '${checkout.order.id}'`,
        );
        const request = {
          order_id: checkout.order.id,
          idempotency_key: 'it-refund-0002',
          items: [{ order_item_id: item, quantity: 3 }],
          reason: 'wrong_item',
        };

        const alone = await respond(handleProcessRefund, post(request, 'cashier-token'), deps);
        assert.equal(alone.status, 403);
        assert.equal((await body(alone)).error.code, 'approval_required');

        const forged = await respond(
          handleProcessRefund,
          post({ ...request, approver_access_token: 'cashier-token' }, 'cashier-token'),
          deps,
        );
        assert.equal(forged.status, 403, 'a cashier cannot approve their own refund');

        const approved = await respond(
          handleProcessRefund,
          post({ ...request, approver_access_token: 'manager-token' }, 'cashier-token'),
          deps,
        );
        assert.equal(approved.status, 200);
        assert.equal(await order(checkout.order.id, 'status'), 'refunded');
        assert.equal(
          await scalar(
            `select approved_by from public.refunds where idempotency_key = 'it-refund-0002'`,
          ),
          MANAGER,
        );
      },
    );

    await t.step(
      'a reward is reserved at checkout and returned when the cashier cancels',
      async () => {
        const reward = await scalar(
          `select id from public.rewards where name = 'Free protein bar'`,
        );
        const checkout = await body(
          await respond(
            handleCreatePaymentIntent,
            post(
              {
                idempotency_key: 'it-checkout-0003',
                items: [{ product_id: bar, quantity: 2 }],
                customer_id: CUSTOMER,
                rewards: [{ reward_id: reward, product_id: bar }],
              },
              'cashier-token',
            ),
            deps,
          ),
        );
        assert.equal(checkout.order.total_cents, 300);
        assert.equal(checkout.order.reward_cents, 300);
        assert.equal(await balance(), '60', '360 - 300 reserved');

        const cancel = await respond(
          handleCancelOrder,
          post({ order_id: checkout.order.id }, 'cashier-token'),
          deps,
        );
        assert.equal(cancel.status, 200);
        assert.equal(await order(checkout.order.id, 'status'), 'cancelled');
        assert.equal(await balance(), '360', 'the reserved points are back');
        assert.equal(
          stripe.called('cancelPaymentIntent').length,
          1,
          'the PaymentIntent was cancelled at Stripe',
        );
      },
    );

    await t.step('an order fully covered by a reward completes with no card payment', async () => {
      const reward = await scalar(`select id from public.rewards where name = 'Free protein bar'`);
      const before = stripe.called('createPaymentIntent').length;
      const response = await respond(
        handleCreatePaymentIntent,
        post(
          {
            idempotency_key: 'it-checkout-0004',
            items: [{ product_id: bar, quantity: 1 }],
            customer_id: CUSTOMER,
            rewards: [{ reward_id: reward, product_id: bar }],
          },
          'cashier-token',
        ),
        deps,
      );
      const result = await body(response);
      assert.equal(result.payment_intent, null);
      assert.equal(result.order.status, 'paid');
      assert.equal(result.order.total_cents, 0);
      assert.equal(stripe.called('createPaymentIntent').length, before, 'Stripe was not called');
      assert.equal(await balance(), '60');
    });

    await t.step(
      'a cashier discount needs a manager; with one it is recorded against the manager',
      async () => {
        const request = {
          idempotency_key: 'it-checkout-0005',
          items: [{ product_id: bar, quantity: 3 }],
          discount_cents: 100,
          discount_reason: 'regular customer',
        };
        const alone = await respond(
          handleCreatePaymentIntent,
          post(request, 'cashier-token'),
          deps,
        );
        assert.equal(alone.status, 403);
        assert.equal(
          await scalar(
            `select count(*) from public.orders where idempotency_key = 'it-checkout-0005'`,
          ),
          '0',
        );

        const approved = await respond(
          handleCreatePaymentIntent,
          post({ ...request, approver_access_token: 'manager-token' }, 'cashier-token'),
          deps,
        );
        assert.equal(approved.status, 200);
        const result = await body(approved);
        assert.equal(result.order.total_cents, 800);
        assert.equal(await order(result.order.id, 'discount_by'), MANAGER);
      },
    );

    await t.step('customers and former employees cannot use the staff endpoints', async () => {
      for (const token of ['customer-token', 'former-token']) {
        const checkout = await respond(
          handleCreatePaymentIntent,
          post(
            { idempotency_key: `it-denied-${token}`, items: [{ product_id: bar, quantity: 1 }] },
            token,
          ),
          deps,
        );
        assert.equal(checkout.status, 403, token);
        const tokenResponse = await respond(handleConnectionToken, post({}, token), deps);
        assert.equal(tokenResponse.status, 403, token);
      }
      assert.equal(
        await scalar(`select count(*) from public.orders where idempotency_key like 'it-denied-%'`),
        '0',
      );
    });

    await t.step('books balance: ledgers match their cached totals', async () => {
      assert.equal(
        await scalar(`select count(*) from public.loyalty_accounts a
          left join (select customer_id, sum(points) t from public.loyalty_transactions group by 1) x
            on x.customer_id = a.customer_id
          where a.balance <> coalesce(x.t, 0) or a.balance < 0`),
        '0',
      );
      assert.equal(
        await scalar(`select count(*) from public.inventory_levels l
          left join (select product_id, sum(delta) t from public.inventory_movements group by 1) m
            on m.product_id = l.product_id
          where l.on_hand <> coalesce(m.t, 0)`),
        '0',
      );
    });
  },
});
