# Architecture — as built

What is in the repository today and how the pieces fit. The plan and the reasons for the overall
direction are in `PLAN.md`.

## What exists

```
   (not built)            Shopify POS  ── Shopify's app ──┐
  ┌──────────────┐      ┌─────────────────────────────┐   │   ┌──────────────────┐
  │ Rewards app  │      │ Bro Batch Rewards tile      │   │   │ Admin (Next.js)  │
  │ (SwiftUI)    │      │ written, never run          │   │   │ placeholder page │
  └──────┬───────┘      └───────────────┬─────────────┘   │   └────────┬─────────┘
         │                              │ ID token        │ signed     │
         │                              ▼                 ▼ webhooks   │
         │              ┌───────────────────────────────────────┐      │
         │              │ Edge Functions (Deno)        built    │      │
         │              │  pos-member · pos-reserve-reward      │      │
         │              │  pos-release-reward · shopify-webhook │──────┼──► Shopify Admin API
         │              └───────────────────┬───────────────────┘      │    (customers, prices,
         │                                  │ service role             │     discount codes)
         ▼                                  ▼                          ▼
  ┌──────────────────────────────────────────────────────────────────────────┐
  │ Supabase Postgres                                              built     │
  │  members · points ledger · rewards · redemptions                         │
  │  mirror of Shopify orders and refunds · webhook log · audit log          │
  │  row-level security · integrity triggers · loyalty and Shopify functions │
  └──────────────────────────────────────────────────────────────────────────┘
```

Built and tested: the database, the loyalty engine, the Shopify ingestion and reward functions,
and the Edge Functions. Written but never run: the POS tile. Not built: the dashboard screens and
the Rewards iPhone app.

**Nothing has been connected to Shopify.** Every test stands in for Shopify with a fake built from
its documentation. `SHOPIFY.md` lists what that leaves unverified.

## Layers and their jobs

### Database (`supabase/migrations`)

The database enforces the rules that must hold whatever code is running.

- **Access.** Every table has row-level security. Anonymous users can reach nothing. Signed-in
  users get explicit grants only.
- **Server-only writes.** Orders, refunds, the points ledger, redemptions and the webhook log have
  no client write path. Only the service role writes them, and only from verified Shopify
  webhooks or authenticated POS requests.
- **The ledger owns the balance.** `loyalty_transactions` is append-only. A trigger applies each
  row to the cached balance under a row lock and rejects anything that would overdraw.
- **Once only.** Unique keys on webhook delivery ids, Shopify order and refund ids, one earn per
  order, one reversal per refund, one debit per redemption.

### Loyalty engine (`20261112000100_loyalty_engine.sql`)

Five functions decide every points movement: `award_points_for_order`,
`reverse_points_for_refund`, `redeem_points`, `release_redemption`, `fulfill_redemption`. Rules and
worked examples: `LOYALTY.md`.

### Shopify layer (`20261112000200_shopify.sql`)

- `ingest_shopify_order` and `ingest_shopify_refund` turn a webhook body into mirrored rows and
  call the loyalty engine. They take the body as raw text, because Shopify ids can exceed what a
  JavaScript number holds exactly.
- `reserve_reward_for_pos` debits points and issues a discount code; `expire_stale_redemptions`
  returns the points of holds that lapsed.
- `pos_lookup_member`, `pos_rewards`, `link_shopify_customer` serve the POS tile.

### Edge Functions (`supabase/functions`)

The HTTP layer between Shopify and the database. A function authenticates the caller, validates
the request, calls Shopify if needed, and calls database functions. It holds no loyalty rules.

- Handlers take their dependencies (database, Shopify client, clock) as arguments, so tests run
  them with in-memory fakes and no network.
- `_shared/runtime.ts` is the only module that reads secrets.
- `_shared/shopify_hmac.ts` verifies webhook signatures; `_shared/shopify_id_token.ts` verifies
  the POS tile's ID token; `_shared/shopify_admin.ts` is a small Admin API client.

### POS tile (`apps/shopify`)

A Shopify POS UI extension: a tile and a full-screen modal. It scans the member's QR, attaches the
customer to the cart, lists rewards, and applies the discount code the backend returns. Its code
is delivered to the device, so it holds no secrets and makes no decisions about points or prices.

### Contracts (`packages/contracts`)

Shared TypeScript: the `Cents` money type, the points formula, the membership QR format, enum
values that mirror database constraints, and validation schemas. Consumed as source by Next.js,
Vitest, Node and Deno. `scripts/check-contract-drift.mjs` compares it with the database on every
test run.

### Admin app (`apps/admin`)

A Next.js project with a placeholder page, the design tokens, security headers, and a build guard
that fails if a server secret is placed in a browser-exposed variable.

## Identity

| Who            | Signs in with                              | Known to us as                                 |
| -------------- | ------------------------------------------ | ---------------------------------------------- |
| Member         | Supabase Auth (Rewards app)                | `customers`, linked to a Shopify customer id   |
| Owner, manager | Supabase Auth (admin dashboard)            | `employees` with a role                        |
| Till staff     | Shopify POS (their Shopify sign-in or PIN) | Not stored. Requests carry Shopify's ID token. |

A member is linked to a Shopify customer the first time their QR is scanned at the till, or when
a paid order arrives for a Shopify customer with the same email. The link is made once.

Dashboard permissions are checked against the `employees` table on every statement, so
deactivating someone takes effect on their next request. The `user_role` claim in the token is a
convenience for choosing screens only.

## Testing strategy

| Suite                   | What it proves                                                                                                  | Where                                              |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| pgTAP (474 tests)       | Structure, constraints, RLS, privileges, triggers, the 20 loyalty examples, Shopify orders, refunds and rewards | `supabase/tests`                                   |
| Concurrency (29 checks) | Eight races on real connections: points and orders are never duplicated or lost                                 | `scripts/db-concurrency-test.sh`                   |
| Contract drift check    | TypeScript enums, error codes and the points formula match the database                                         | `scripts/check-contract-drift.mjs`                 |
| Deno (91 tests)         | Edge Function handlers, webhook signatures, ID tokens, the Shopify client, error mapping                        | `supabase/functions/tests`                         |
| Integration (16 steps)  | The real handlers against the real database, scan through refund                                                | `supabase/functions/tests/integration_test.ts`     |
| Vitest (137 tests)      | Money math, points formula, QR format, validation, env guard, POS tile logic                                    | `packages/contracts`, `apps/admin`, `apps/shopify` |

CI runs the database suite twice: on plain PostgreSQL with a shim for Supabase's roles (fast, and
what runs locally without Docker), and on the real Supabase Postgres image.

The suites have been checked by introducing defects on purpose, one at a time, and confirming a
test fails: disabled RLS, removed guards, wrong rounding, skipped signature checks, unverified
tokens. Of the 96 tried against the code that is in the repository today, 94 were caught; the
other two changed no behaviour in the scenarios tried.

## What changed along the way

- **The till moved from a custom app on Stripe to Shopify POS.** The Stripe checkout code was
  built, tested and then removed; it is in git history at commit `ca4dd52`. The payments, card
  and stock tables went with it, because Shopify is the record of those.
- **Permissions read the database, not the token**, so a deactivated account stops working at
  once.
- **The balance is applied in an AFTER INSERT trigger.** The first version used BEFORE INSERT,
  which could have moved a balance for a row the database then skipped.
