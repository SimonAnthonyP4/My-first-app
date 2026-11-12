# Payments

How a sale is charged, confirmed and refunded.

**Status: built and tested without Stripe.** No Stripe account exists for this project yet, so
this code has never talked to Stripe, not even in test mode. Everything up to the Stripe boundary
is tested: the database functions, the request handlers, the signature check, and the two
together end to end. What remains is listed under "Not yet verified" at the bottom.

## The rules

1. **The app says what is being bought. The server says what it costs.** The checkout request
   carries product ids and quantities. Any price, total or points field in the request is
   rejected.
2. **Only a signed message from Stripe can mark an order paid.** The POS app cannot. Neither can
   an employee, a manager or an owner.
3. **The amount Stripe collected must equal the order total.** A confirmation for any other
   amount is refused and flagged.
4. **Nothing happens twice.** Each checkout, PaymentIntent, webhook event and refund carries a
   key. A repeat with the same key returns the first result.
5. **No card data.** The card is read inside Stripe's Terminal SDK. The backend sees a
   PaymentIntent id and, for receipts, the card brand and last four digits.
6. **Refunds move nothing until Stripe confirms.** Then money status, stock and points change
   together.
7. **Test mode unless explicitly live.** The backend refuses a live key unless `STRIPE_MODE=live`,
   and refuses live events on a test deployment.

## A sale, step by step

```
POS app                Edge Function                 Stripe              Database
  │ cart, customer,      │                             │                    │
  │ rewards, discount ──►│ create-payment-intent       │                    │
  │                      │── create_order ───────────────────────────────►│ price from catalog,
  │                      │                             │                    │ reserve rewards,
  │                      │                             │                    │ order = pending
  │                      │── PaymentIntent for total ─►│                    │
  │                      │── record_payment_intent ──────────────────────►│
  │◄─ client secret ─────│                             │                    │
  │ Terminal SDK: tap ──────────────────────────────►│                    │
  │                      │◄── signed webhook: payment_intent.succeeded ───│
  │                      │ stripe-webhook: verify signature               │
  │                      │── handle_payment_succeeded ───────────────────►│ one transaction:
  │                      │                             │                    │  payment succeeded
  │                      │                             │                    │  order paid
  │                      │                             │                    │  rewards fulfilled
  │                      │                             │                    │  stock decremented
  │                      │                             │                    │  points awarded
  │◄──────────── order status changes to paid (read through RLS) ─────────│
```

If the order is fully covered by rewards, there is nothing to charge: it is completed inside
`create_order` and no PaymentIntent is created.

## Endpoints

All take `POST` with a JSON body and the employee's access token in `Authorization: Bearer`,
except the webhook.

| Function                    | Called by | Does                                                                |
| --------------------------- | --------- | ------------------------------------------------------------------- |
| `create-payment-intent`     | POS       | Creates the order and its PaymentIntent. Returns the client secret. |
| `terminal-connection-token` | POS       | Short-lived token for the Terminal SDK. Active employees only.      |
| `cancel-order`              | POS       | Cancels the PaymentIntent at Stripe, then the order.                |
| `process-refund`            | POS       | Validates and prices the refund, asks Stripe to return the money.   |
| `stripe-webhook`            | Stripe    | Verifies the signature and applies payment and refund events.       |

### `create-payment-intent`

```json
{
  "idempotency_key": "one per checkout attempt, 8-150 characters",
  "items": [{ "product_id": "uuid", "quantity": 3 }],
  "customer_id": "uuid or omitted",
  "rewards": [{ "reward_id": "uuid", "product_id": "the cart product it pays for" }],
  "discount_cents": 0,
  "discount_reason": "required when discount_cents > 0",
  "approver_access_token": "a manager's access token, when an override is needed",
  "reader_type": "tap_to_pay | reader | simulated"
}
```

Returns `{ "order": {...}, "payment_intent": { "id", "client_secret" } }`, or
`"payment_intent": null` when nothing is due.

### `process-refund`

```json
{
  "order_id": "uuid",
  "idempotency_key": "one per refund attempt",
  "items": [{ "order_item_id": "uuid", "quantity": 1, "restock": true }],
  "reason": "customer_request | damaged | wrong_item | duplicate | other",
  "note": "optional",
  "approver_access_token": "a manager's access token, when the amount needs approval"
}
```

The app never sends an amount. Returns `{ "refund": {...} }`.

### Errors

```json
{
  "error": {
    "code": "approval_required",
    "message": "a refund of 3200 cents needs a manager (limit is 2500 cents)"
  }
}
```

| HTTP | `code`                     | Meaning                                                       |
| ---- | -------------------------- | ------------------------------------------------------------- |
| 400  | `invalid_request`          | Malformed body, unknown field, bad value                      |
| 401  | `unauthenticated`          | Missing or expired sign-in                                    |
| 401  | `approver_unauthenticated` | The manager token is not valid                                |
| 403  | `forbidden`                | Not an active employee                                        |
| 403  | `approval_required`        | Needs a manager or owner (`BB008`)                            |
| 404  | `not_found`                | Order, refund or customer does not exist (`BB006`)            |
| 409  | `insufficient_points`      | Not enough points for the reward (`BB001`)                    |
| 409  | `invalid_state`            | Order or refund is not in a state that allows this (`BB002`)  |
| 409  | `idempotency_key_mismatch` | Key reused for something different (`BB003`)                  |
| 409  | `not_available`            | Product or reward is retired (`BB004`)                        |
| 409  | `already_paid`             | Cannot cancel: the payment went through                       |
| 409  | `refund_failed`            | This refund attempt already failed. Start a new one.          |
| 422  | `below_minimum_charge`     | Amount due is between $0.01 and $0.49 (`BB007`)               |
| 422  | `reward_not_applicable`    | Reward does not match an item in the cart (`BB009`)           |
| 422  | `refund_declined`          | Stripe refused the refund                                     |
| 502  | `payment_provider_error`   | Stripe could not be reached. Safe to retry with the same key. |
| 500  | `internal_error`           | Unexpected. Details are in the server log, not the response.  |

## Manager overrides

Two things need a manager or owner: a discount above the cashier limit, and a refund above the
approval threshold. Both settings are owner-editable (`app_settings`).

| Setting                           | Default | Meaning                                           |
| --------------------------------- | ------- | ------------------------------------------------- |
| `employee_discount_limit_percent` | 0       | Cashiers cannot discount at all without a manager |
| `refund_approval_threshold_cents` | 2500    | Refunds above $25.00 need a manager               |

An override is proven by the manager signing in on the device. The app sends the manager's access
token; the server verifies it with the auth service and the database checks that person is an
active manager or owner. A manager's user id typed into the request is not accepted. The order or
refund records who approved.

## Webhook events

Subscribe the Stripe webhook endpoint to exactly these:

| Event                                                                        | Effect                                              |
| ---------------------------------------------------------------------------- | --------------------------------------------------- |
| `payment_intent.succeeded`                                                   | Completes the sale                                  |
| `payment_intent.payment_failed`                                              | Recorded. The checkout stays open for another card. |
| `payment_intent.processing`                                                  | Recorded                                            |
| `payment_intent.canceled`                                                    | Cancels the order and releases reserved rewards     |
| `refund.created`, `refund.updated`, `refund.failed`, `charge.refund.updated` | Completes or fails a refund                         |

Every delivery is checked: HMAC-SHA256 signature over the raw body, timestamp within five
minutes, and live/test mode matching the deployment.

What the handler tells Stripe:

| Response | When                                                                   |
| -------- | ---------------------------------------------------------------------- |
| 200      | Handled, a duplicate, not one of ours, or flagged for a person (below) |
| 400      | Bad signature or malformed event. Retrying would not help.             |
| 500      | Our side failed. Stripe retries; every handler is safe to repeat.      |

### Events that need a person

These are acknowledged (so Stripe stops retrying), logged, and stored in `stripe_events` with
status `failed` and a reason. Nothing is changed automatically.

| Outcome                                                        | What happened                                              | What to do                    |
| -------------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------- |
| `failed:amount_mismatch`                                       | Stripe collected a different amount than the order total   | Investigate, refund in Stripe |
| `failed:order_not_pending`                                     | A payment arrived for an order already cancelled           | Refund the charge in Stripe   |
| `failed:duplicate_payment`                                     | A second PaymentIntent paid an order that was already paid | Refund the second charge      |
| `failed:unknown_refund`                                        | A refund was made in the Stripe Dashboard, not in the app  | Reconcile by hand             |
| `failed:refund_not_pending`, `failed:refund_already_succeeded` | Stripe and our records disagree about a refund             | Reconcile by hand             |

A reconciliation report over `stripe_events` is planned for M9. Until then, check
`select * from stripe_events where status = 'failed'`.

## Refunds

The database works out the amount. When an order had a discount or a free reward item, each item
carries a share of what was actually paid, in proportion to its shelf price. Shares are computed
cumulatively, so refunding every item returns exactly the amount paid.

| Order                                  | Refund             | Amount              |
| -------------------------------------- | ------------------ | ------------------- |
| 3 bars at $3.00, paid $9.00            | 1 bar              | $3.00               |
| 3 bars with $1.00 off, paid $8.00      | 1 bar, three times | $2.66, $2.67, $2.67 |
| 2 bars, one free by reward, paid $3.00 | 1 bar, twice       | $1.50, $1.50        |

- Units already refunded, or held by a refund still in progress, cannot be refunded again.
- Returned units go back into stock unless the line is marked `restock: false` (damaged goods).
- Earned points are taken back as described in `LOYALTY.md`. Points spent on rewards stay spent.
- If Stripe declines, the refund is marked failed and its units become refundable again.
- If Stripe cannot be reached, the refund stays pending. Retrying with the same key resumes it,
  and Stripe's idempotency key (`refund-<our refund id>`) prevents a second refund.

## Limits and edge cases

- **Minimum charge.** Stripe does not charge less than $0.50. An order must be free or cost at
  least that; anything in between is refused at checkout.
- **Declined card.** The PaymentIntent stays open and the customer can present another card.
- **One PaymentIntent per order.** Its Stripe idempotency key is `order-<order id>`. If it is
  cancelled, the order is cancelled; a new attempt is a new order.
- **Free orders cannot be refunded** through this flow, because there is no card payment. Returning
  a free item is a stock adjustment.
- **US dollars only.** A payment or refund in any other currency is flagged as a mismatch.

## Secrets

| Secret                  | Used for                     | Where it lives        |
| ----------------------- | ---------------------------- | --------------------- |
| `STRIPE_SECRET_KEY`     | Calling Stripe               | Edge Function secrets |
| `STRIPE_WEBHOOK_SECRET` | Verifying webhook signatures | Edge Function secrets |
| `STRIPE_MODE`           | `test` (default) or `live`   | Edge Function secrets |
| `STRIPE_API_VERSION`    | Optional pinned API version  | Edge Function secrets |

Only `supabase/functions/_shared/runtime.ts` reads them. The Stripe key is sent only to
`api.stripe.com` and is never logged or included in an error. The POS app receives a PaymentIntent
client secret and a Terminal connection token, both of which are meant for clients; it never
receives the secret key.

## How it is tested

| Layer              | Tests                                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Database functions | 204 pgTAP tests in `08_checkout.sql` and `09_refunds.sql`                                                                       |
| Races              | Same checkout 20 times, same webhook 20 times, 10 competing refunds                                                             |
| Handlers           | 103 Deno tests with Stripe, database and auth faked                                                                             |
| Signature check    | 14 tests, including a known answer computed with `openssl`                                                                      |
| End to end         | Real handlers against the real database: checkout, forged webhook, payment, replay, refund, approval, reward, cancel (14 steps) |

The suites were checked against 41 deliberately introduced payment defects (skipped signature
check, unverified amounts, missing idempotency, unlimited discounts and so on). 40 were caught;
the other changed no behaviour.

## Not yet verified

These need a Stripe account in test mode, and for the last two an Apple entitlement and device:

1. The four Stripe API calls against the real API (parameters, API version, error shapes).
2. Real webhook deliveries: that the signature header and event bodies match what the handler
   expects, and that the listed event types are the ones Stripe sends for card-present refunds.
3. Deployment of the functions (`supabase functions deploy`) and calls through the Supabase API
   gateway rather than directly.
4. Terminal SDK collection with a simulated reader.
5. Tap to Pay on iPhone on a real device.

Steps for the first three are in `RUNBOOK.md`, "Stripe sandbox".
