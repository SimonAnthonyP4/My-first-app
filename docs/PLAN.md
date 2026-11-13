# Bro Batch — Plan

Status: **the loyalty backend and the rewards tile are built and tested. Nothing has been connected
to a real Shopify store yet.** The owner has a Shopify account and Shopify POS. Connecting them is
the next step and needs a few things only the owner can create (see "What is needed from the
owner").

## The direction

Shopify POS is the till. Bro Batch's own software is the loyalty program around it.

| Piece                    | What it is                                                  | Built by |
| ------------------------ | ----------------------------------------------------------- | -------- |
| Till                     | Shopify POS on iPhone, with Shopify Payments and Tap to Pay | Shopify  |
| Rewards tile in the till | A POS UI extension inside Shopify POS                       | Us       |
| Loyalty backend          | Supabase: members, points ledger, rewards, redemptions      | Us       |
| Bro Batch Rewards        | Customer iPhone app (SwiftUI)                               | Us       |
| Bro Batch Admin          | Web dashboard (Next.js)                                     | Us       |

The original plan was a custom SwiftUI till on Stripe Terminal. It is archived in
`docs/archive/PLAN_ORIGINAL_CUSTOM_POS.md`.

### Why this split

Shopify does not offer a way for a custom app to take card payments through Shopify Payments, so
"Shopify" means Shopify's own POS app is the till. In exchange:

- **No Apple entitlement and no App Store review for the till.** Shopify POS already has Tap to
  Pay on iPhone. In the original plan this was the one milestone blocked on Apple.
- **No payment code of ours touches a card.** Shopify takes, records and refunds payments.
- **Catalog, stock, refunds, receipts, staff PINs and sales reports come built in.**

What is given up: the till's look and flow are Shopify's, not a custom design. The custom, branded
experience lives in the Rewards app and the admin dashboard.

## Where each requirement lives now

| Requirement from the brief                                | Provided by                                                            |
| --------------------------------------------------------- | ---------------------------------------------------------------------- |
| Product catalog with images and flavors                   | Shopify (products, collections)                                        |
| Cart, quantities, subtotal and total                      | Shopify POS                                                            |
| Tap to Pay checkout                                       | Shopify POS with Shopify Payments                                      |
| Transaction history, refunds                              | Shopify POS and Shopify admin                                          |
| Inventory tracking                                        | Shopify                                                                |
| Employee sign-in and permissions at the till              | Shopify POS staff, PINs and roles                                      |
| Discounts                                                 | Shopify POS                                                            |
| Customer QR scanning and lookup                           | Our POS extension, calling our backend                                 |
| Reward redemption at the till                             | Our POS extension and backend, as a single-use Shopify code            |
| 10 points per $1, rewards at 300 / 750 / 1,400            | Our backend (built)                                                    |
| Points only after confirmed payment                       | Our backend, from Shopify's signed `orders/paid` webhook (built)       |
| Refund reversals, duplicate protection                    | Our backend (built)                                                    |
| Customer app: card, QR, balance, rewards, history, push   | Bro Batch Rewards app (not built)                                      |
| Admin: reward configuration, loyalty analytics, customers | Bro Batch Admin (not built)                                            |
| Admin: revenue, sales, best sellers                       | Bro Batch Admin from mirrored orders; Shopify analytics also has these |
| Admin: inventory levels, employee management              | Shopify admin (not duplicated)                                         |

## How a sale works

```
Customer app        Shopify POS + our tile        Our backend              Shopify
    │ shows QR ───────► scan                          │                       │
    │                    │── who is this? ──────────►│ find member,          │
    │                    │                           │ link to Shopify ─────►│ find/create customer
    │                    │◄─ name, points, rewards ──│                       │
    │                    │ attach customer to cart   │                       │
    │                    │── apply "Free bar" ──────►│ check item + price ──►│ variant price, collection
    │                    │                           │ debit 300 points      │
    │                    │                           │ create code ─────────►│ single-use discount code
    │                    │◄─ code ───────────────────│                       │
    │                    │ apply code, Tap to Pay ───────────────────────────►│ takes payment
    │                    │                           │◄── signed webhook: orders/paid ──│
    │                    │                           │ mirror order, fulfil reward,     │
    │◄─ points updated ──────────────────────────────│ award points on goods paid for   │
```

If the reward is not used, its hold lapses after 15 minutes (configurable) and the points return.
A refund in Shopify sends `refunds/create`; the backend takes back the points that order earned.

Details: `docs/SHOPIFY.md`. Loyalty rules: `docs/LOYALTY.md`.

## Milestones

| #   | Milestone                               | State                                                               |
| --- | --------------------------------------- | ------------------------------------------------------------------- |
| M0  | Repository, tooling, CI                 | Done                                                                |
| M1  | Loyalty database and security           | Done                                                                |
| M2  | Loyalty engine                          | Done                                                                |
| S1  | Shopify backend                         | Built and tested with Shopify faked                                 |
| S2  | Rewards tile for Shopify POS            | Builds with Shopify CLI and is tested; never run on a device        |
| S3  | Connect a Shopify dev store             | Deploy path written and tested with stand-ins; waiting on the owner |
| S4  | Admin dashboard                         | Not started                                                         |
| S5  | Bro Batch Rewards iPhone app            | Not started                                                         |
| S6  | Push notifications                      | Not started                                                         |
| S7  | Hardening and go-live on the real store | Not started                                                         |

### S1 — Shopify backend (built)

- Signed webhook intake for `orders/paid` and `refunds/create`, applied once each.
- Orders and refunds mirrored; members linked to Shopify customers; points awarded and reversed.
- Reward codes: reserve, fulfil when used, expire when not, recover when used late.
- Three endpoints for the POS tile, authenticated by Shopify's ID token.
- A reward a member is already holding is reported to the tile, so it can still be removed after
  the rewards screen was closed.
- **Done when:** met for everything that can be tested without Shopify. 487 database tests, 29
  concurrency checks, 92 function tests and a 17-step end-to-end run pass.

### S2 — Rewards tile for Shopify POS (built and tested off-device)

- Tile on the POS home screen; scan member; show points and rewards; apply and remove a reward.
- Verified without a device: Shopify CLI builds it; every call it makes to Shopify POS is checked
  against Shopify's type definitions; 25 tests run its two screens in Shopify's extension tester.
- **Done when:** it runs on an iPhone in a dev store. How it looks, the camera scanner and how
  Shopify POS treats the discount code are unverified until then.

### S3 — Connect a Shopify dev store (next; needs the owner)

- Built: a manual Deploy workflow on GitHub (no terminal needed) with a preflight that refuses a
  half-configured deploy, and a verification step that checks the live backend and the store can
  talk to each other. It has never run against a real project.
- The owner creates a Supabase project, a Shopify app and a dev store, and adds four secrets on
  GitHub (`docs/RUNBOOK.md`, "Connect Shopify"). Then deploy.
- Run a test-mode sale with a reward, and a refund, on a real device.
- Fix whatever the first real run turns up in S1 and S2.
- **Done when:** a sale in Shopify POS gives a member points, a reward takes an item off the
  bill, and a refund takes the points back, all visible in the database.

### S4 — Admin dashboard

- Sign-in for owner and managers.
- Reward configuration: thresholds, and which Shopify collection each reward applies to.
- Members: search, balance, ledger. Loyalty analytics. Flagged webhook deliveries.
- Sales, bars sold and best-selling flavors from mirrored orders; product details (flavor, pack
  size) for Shopify variants.
- Links out to Shopify admin for catalog, stock, staff and refunds.

### S5 — Bro Batch Rewards iPhone app

- Sign-up and sign-in, membership card with QR, live balance, rewards, purchase history, profile.
- Needs: Apple Developer Program membership, and a Mac or macOS CI to build.

### S6 — Push notifications

- Points earned, reward available, refund processed. Needs an APNs key.

### S7 — Hardening and go-live

- Reconciliation: periodically compare with Shopify and pull any order whose webhook was missed.
- Privacy webhooks (customer data requests and erasure), a restore drill, alerting.
- Switch from the development store to the real store with Shopify Payments.

## What is needed from the owner

| Needed                               | For | Notes                                                                                          |
| ------------------------------------ | --- | ---------------------------------------------------------------------------------------------- |
| A Shopify account                    | S3  | **Have.** The real store must appear under Stores in the Shopify Dev Dashboard                 |
| Shopify POS installed on an iPhone   | S3  | **Have.**                                                                                      |
| A Shopify app and a dev store        | S3  | Created in the Dev Dashboard, about ten minutes; a dev store keeps tests out of the real store |
| A Supabase project                   | S3  | Free tier is enough to start                                                                   |
| Four deploy secrets on GitHub        | S3  | Named in the runbook. Never shared in chat.                                                    |
| A Shopify plan with Shopify Payments | S7  | Tap to Pay on iPhone needs a US-dollar store on Shopify Payments                               |
| Apple Developer Program membership   | S5  | For the Rewards app only. The till no longer needs it.                                         |
| APNs key                             | S6  |                                                                                                |

Check Shopify's current pricing for the plan and for POS Pro before S7; which POS features need
POS Pro has not been confirmed for this project.

## Decisions

| Decision                       | Choice                                                                    |
| ------------------------------ | ------------------------------------------------------------------------- |
| Till                           | Shopify POS                                                               |
| Points base                    | Goods paid for after discounts. Not tax, tips or shipping.                |
| Refund after points were spent | Spent points stay spent. Clawback is capped at the current balance.       |
| Negative balance               | Never                                                                     |
| How a reward reaches checkout  | A Shopify discount code: one use, one customer, one product, fixed amount |
| Reward hold                    | 15 minutes, owner-configurable                                            |
| Online-store orders            | Earn points the same way as till sales                                    |
| Test orders                    | Ignored unless switched on (needed for a development store)               |
| Who can use the rewards tile   | Whoever is signed in to Shopify POS on the device with access to the app  |

## Open questions

1. **Membership code:** static per member (built), or a rotating code that cannot be screenshotted?
2. **Customer sign-in:** email and password only, or also Sign in with Apple?
3. **More than one reward per sale:** whether Shopify POS accepts two discount codes on one cart
   is not verified. The tile applies one reward per sale.
4. **Which products each reward covers:** the owner chooses a Shopify collection per reward.
5. **Data retention** for closed member accounts.
