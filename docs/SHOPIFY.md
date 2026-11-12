# Shopify integration

How Bro Batch works with Shopify POS: what Shopify sends us, what we ask of Shopify, and what the
rewards tile in the till does.

**Status: built and tested with Shopify faked.** No Shopify store or app exists for this project
yet, so nothing here has exchanged a single request with Shopify. The design follows Shopify's
published documentation (API version 2026-10), and everything on our side of the boundary is
tested. What remains is listed under "Not yet verified".

## Who owns what

| Shopify is the record of        | Bro Batch is the record of             |
| ------------------------------- | -------------------------------------- |
| Products, prices, collections   | Rewards members                        |
| Stock                           | The points ledger and balances         |
| Carts, orders, receipts         | Rewards and their point thresholds     |
| Card payments and refunds       | Redemptions                            |
| POS staff, PINs and permissions | Which member is which Shopify customer |

Our database keeps a mirror of paid orders and refunds, for points and for reporting. It never
edits them, and it holds no card or payment data at all.

## The rules

1. **Points move only on Shopify's word.** A sale earns points when Shopify's signed
   `orders/paid` webhook arrives. A refund takes them back when `refunds/create` arrives. The till,
   the tile and staff cannot award points.
2. **Every webhook is verified and applied once.** The signature is checked over the exact bytes
   received, and each delivery id is recorded.
3. **The till never decides an amount.** When a reward is applied, the backend reads the item's
   price from Shopify and works out the discount. A price or points value sent by the tile is
   rejected.
4. **Shopify enforces the reward.** It is issued as a discount code that works once, for one
   customer, on one product, for a fixed amount, for a few minutes.
5. **No secrets leave the server.** The Shopify client secret lives only in Edge Function
   secrets. The POS extension contains no credentials.

## Webhooks

Subscribed topics (declared in `apps/shopify/shopify.app.toml`):

| Topic            | Effect                                                               |
| ---------------- | -------------------------------------------------------------------- |
| `orders/paid`    | Mirror the order, link the member, fulfil used rewards, award points |
| `refunds/create` | Mirror the refund, mark the order, take back the points it earned    |

Verification, in `supabase/functions/_shared/shopify_hmac.ts`:

- `X-Shopify-Hmac-Sha256` must equal the base64 HMAC-SHA256 of the raw body, keyed with the app's
  client secret. Compared in constant time.
- `X-Shopify-Shop-Domain` must be our store.
- `X-Shopify-Webhook-Id` identifies the delivery. It is stored in `shopify_webhook_events` and its
  row is locked while the delivery is processed, so the same delivery arriving twice, even at the
  same moment, is applied once.

Shopify does not sign a timestamp, so an old delivery could be replayed. That is harmless: its id
has already been recorded.

**Large ids.** Shopify ids are 64-bit and can exceed what a JavaScript number holds exactly. The
webhook body is therefore passed to the database as raw text and parsed there; it is never parsed
in JavaScript.

What we answer:

| Response | When                                                                       |
| -------- | -------------------------------------------------------------------------- |
| 200      | Processed, a duplicate, ignored, or flagged for a person                   |
| 401      | Bad signature, or a different store. Nothing is done.                      |
| 503      | A refund arrived before its order. Shopify retries (8 times over 4 hours). |
| 500      | Our side failed. Shopify retries; every step is safe to repeat.            |

### What an order does

1. Ignored if it is not paid, or is a test order while `accept_test_orders` is off.
2. Flagged if it is not in US dollars.
3. Mirrored into `orders` and `order_items`.
4. The buyer is matched to a member: by a Shopify customer already linked, otherwise by email, in
   which case the link is made now. A linked member is never re-linked to a different customer.
5. Each discount code on the order that is one of our reward codes fulfils its reward.
6. Points are awarded on `subtotal_price`: the goods after discounts, before tax, tips and
   shipping. A free reward item earns nothing.

### What a refund does

1. If its order has not been mirrored yet, it asks Shopify to retry, up to four times, then gives
   up (the order is one we do not track: a test order, or from before the app was installed).
2. The refunded goods value is taken from the refund's line items, and capped at what is left of
   the order.
3. The order becomes partially refunded or refunded.
4. Earned points are taken back in proportion, capped at the member's balance. Points spent on a
   reward are not restored.

### Deliveries that need a person

A delivery marked `flagged` was applied as far as it safely could be and needs someone to look.
Owners can see them (the admin dashboard will list them in S4):

```sql
select id, topic, resource_id, note, received_at
from shopify_webhook_events where status = 'flagged' order by received_at;
```

| Note                                                        | Meaning                                                                                                                                            |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `unsupported currency`                                      | An order that was not in US dollars                                                                                                                |
| `order amounts are inconsistent`                            | Shopify's totals did not add up                                                                                                                    |
| `reward code ... used on an order for a different customer` | A member's code ended up on someone else's sale                                                                                                    |
| `reward code ... could not be taken again`                  | A code was used after its hold lapsed and the member had already spent the returned points. They received the reward without paying points for it. |

## Rewards at the till

A reward travels to Shopify's checkout as a discount code.

```
tile: "apply Free protein bar to this Chocolate Bar"
  │
  ▼ pos-reserve-reward
backend: reward live and set up for the till?           no → refused, nothing changes
         item in the reward's Shopify collection?       no → refused, nothing changes
         price of the item (from Shopify) → amount
         enough points?                                 no → refused, nothing changes
         debit points, issue code BB-XXXX-XXXX-XXXX     (one database transaction)
         create the discount code in Shopify            fails → points returned at once
  │
  ▼
tile: applies the code to the cart; cashier takes payment
  │
  ├─ sale completes  → orders/paid lists the code → reward fulfilled, points stay spent
  ├─ reward removed  → pos-release-reward deletes the code, points returned
  └─ nothing happens → hold lapses after 15 minutes (+5 minutes' grace), points returned
```

The code Shopify receives:

| Property | Value                                                                  |
| -------- | ---------------------------------------------------------------------- |
| Who      | Only this member's Shopify customer                                    |
| Uses     | One                                                                    |
| What     | Only the chosen product variant                                        |
| Amount   | The variant's Shopify price × the reward's quantity, as a fixed amount |
| Valid    | From now until the hold ends                                           |

**A code used after its hold lapsed.** Webhooks can be slow, so a sale can finish in time and be
reported late, after the points were returned. When that order arrives, the points are debited
again and the reward is fulfilled. If the member has spent them in the meantime, the delivery is
flagged.

**Setting up a reward for the till.** Each reward needs a Shopify collection: the products it can
be spent on (for example a "Bars" collection for the free bar). Until `rewards.shopify_collection_id`
is set, the tile shows the reward as not available at the till. The admin dashboard will offer
this in S4; until then it is set in SQL.

## Endpoints for the POS tile

`POST`, JSON, with Shopify's ID token in `Authorization: Bearer`. The token is a JWT Shopify signs
with the app's client secret; the backend checks the signature (HS256 only), expiry, that it was
issued for this app, and that it comes from our store.

The token identifies the Shopify account signed in to the POS app on the device, not the staff
member who entered a PIN. Shopify only issues it to accounts that have been given access to the
app.

| Function             | Body                                                        | Returns                              |
| -------------------- | ----------------------------------------------------------- | ------------------------------------ |
| `pos-member`         | `membership_code` or `shopify_customer_id`                  | Member name and points, live rewards |
| `pos-reserve-reward` | `customer_id`, `reward_id`, `idempotency_key`, `variant_id` | The discount code and new balance    |
| `pos-release-reward` | `redemption_id`                                             | New balance                          |

The first time a member is scanned, `pos-member` finds their Shopify customer by email, or creates
one, and records the link. The response never includes the member's email or phone.

Errors: `{ "error": { "code": "...", "message": "..." } }`.

| HTTP | `code`                  | Meaning                                                    |
| ---- | ----------------------- | ---------------------------------------------------------- |
| 400  | `invalid_request`       | Malformed body or an unknown field                         |
| 401  | `unauthenticated`       | Not a valid Shopify POS session for our store              |
| 404  | `not_a_member`          | The code or customer is not a rewards member               |
| 409  | `insufficient_points`   | Not enough points (`BB001`)                                |
| 409  | `invalid_state`         | For example, the member has not been scanned yet (`BB002`) |
| 409  | `conflict`              | Already linked to someone else, or a key reused (`BB003`)  |
| 409  | `not_available`         | Reward retired, or not set up for the till (`BB004`)       |
| 409  | `redemption_final`      | The reward was already used, released or expired (`BB005`) |
| 422  | `reward_not_applicable` | The item is not one this reward covers                     |
| 422  | `product_not_found`     | Shopify does not know that product                         |
| 502  | `shopify_unavailable`   | Shopify could not be reached. Safe to retry.               |
| 500  | `internal_error`        | Unexpected. Details are in the server log only.            |

## Calls we make to Shopify

Admin GraphQL API, authenticated with the client credentials grant (the app's client id and
secret are exchanged for a 24-hour token, cached and refreshed before expiry).

| Call                      | When                                        | Scope             |
| ------------------------- | ------------------------------------------- | ----------------- |
| `customerByIdentifier`    | First scan of a member: find them by email  | `read_customers`  |
| `customerCreate`          | First scan, if Shopify has no such customer | `write_customers` |
| `productVariant`          | Applying a reward: price, collection        | `read_products`   |
| `discountCodeBasicCreate` | Applying a reward                           | `write_discounts` |
| `discountCodeDelete`      | Removing a reward before payment            | `write_discounts` |

Receiving the two webhooks needs `read_orders`.

## Settings

Owner-editable, in `app_settings`:

| Setting               | Default | Meaning                                                 |
| --------------------- | ------- | ------------------------------------------------------- |
| `points_per_dollar`   | 10      | Earn rate                                               |
| `reward_hold_minutes` | 15      | How long an applied reward waits for the sale to finish |
| `accept_test_orders`  | off     | On for a development store, where every order is a test |

## Secrets

| Secret                  | Used for                                         |
| ----------------------- | ------------------------------------------------ |
| `SHOPIFY_SHOP_DOMAIN`   | Which store we talk to and accept webhooks from  |
| `SHOPIFY_CLIENT_ID`     | Identifies the app; checks ID tokens are for us  |
| `SHOPIFY_CLIENT_SECRET` | Verifies webhooks and ID tokens; gets API tokens |
| `SHOPIFY_API_VERSION`   | Optional; defaults to `2026-10`                  |

Only `supabase/functions/_shared/runtime.ts` reads them. The client secret is sent only to our
own store's token endpoint and is never logged or put in an error.

## How it is tested

| Layer              | Tests                                                                                                                                                      |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database functions | 169 pgTAP tests in `08_shopify_orders.sql` and `09_shopify_rewards.sql`                                                                                    |
| Races              | One order webhook 20 times at once; 30 simultaneous reward requests against 300 points; one refund 20 times at once                                        |
| Edge Functions     | 91 Deno tests with the database and Shopify faked                                                                                                          |
| Signatures         | Webhook HMAC against a known answer computed with `openssl`; ID tokens forged, expired, for another app, for another store                                 |
| End to end         | Real handlers against the real database: scan, link, reward, signed order webhook, replay, forged webhook, refund, out-of-order refund, release (16 steps) |
| POS tile           | 18 tests of its display logic and API client. The screens themselves are not tested.                                                                       |

The suites were checked against 52 deliberately introduced Shopify-path defects (signature check
skipped, ID token not verified, discount open to any customer, points awarded on tax, and so on).
51 were caught by a test; the other changed no behaviour in the scenario it was tried in.

## Not yet verified

All of these need a Shopify development store, which the owner must create:

1. **Any real request to or from Shopify.** The five Admin API calls, the token exchange, and the
   webhook deliveries have only met fakes built from the documentation.
2. **The POS tile on a device.** `Tile.jsx` and `Modal.jsx` have never been built by Shopify CLI
   or opened in Shopify POS. Component names and Cart, Scanner and Session calls follow the
   2026-10 reference but are untested.
3. **Discount code behaviour in POS.** That a customer-specific, variant-specific, fixed-amount
   code applies as expected when added by the tile, and whether two codes can sit on one cart.
4. **Cross-origin requests from the tile** to Supabase Edge Functions (CORS headers are in place).
5. **Refund payload details** for POS refunds: that goods value appears in `refund_line_items` the
   way the documented sample shows.
6. **The scheduled expiry** on Supabase (`pg_cron`).
7. **Tap to Pay** is Shopify's feature and is not something this project implements or can test
   before the store is on Shopify Payments.

`docs/RUNBOOK.md`, "Connect Shopify", has the steps for the first real run.
