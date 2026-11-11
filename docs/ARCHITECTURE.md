# Architecture — as built

This describes what is in the repository today (milestones M0 and M1). The target design for the
whole platform is in `PLAN.md`.

## What exists

```
                (not built yet)                       (placeholder page)
  ┌──────────────┐   ┌─────────────────┐            ┌──────────────────┐
  │ POS app      │   │ Rewards app     │            │ Admin (Next.js)  │
  └──────┬───────┘   └────────┬────────┘            └────────┬─────────┘
         │                    │                              │
         │        packages/contracts (TypeScript)            │
         │   money · points formula · enums · validation     │
         └────────────────────┬──────────────────────────────┘
                              │
                 ┌────────────▼─────────────┐
                 │ Supabase Postgres        │   built and tested in M1
                 │  18 tables               │
                 │  row-level security      │
                 │  integrity triggers      │
                 │  3 client RPCs + 1 hook  │
                 └──────────────────────────┘
```

Not built: Edge Functions, Stripe integration, the loyalty award/refund/redeem functions, the
dashboard screens, and both iOS apps.

## Layers and their jobs

### Database (`supabase/`)

The database enforces the rules that must hold no matter which client or server code is running:

- **Access.** Every table has row-level security. Anonymous users can reach nothing. Signed-in
  users get explicit grants only. Details in `DATABASE.md`.
- **Server-only writes.** Orders, payments, refunds, the loyalty ledger and redemptions have no
  client write path at all. Only the service role (Edge Functions, admin server) writes them.
- **Ledgers.** Loyalty points and stock are append-only ledgers. Cached totals
  (`loyalty_accounts.balance`, `inventory_levels.on_hand`) are maintained by triggers and cannot
  be edited directly, even by the service role.
- **No negative balances.** A ledger row that would overdraw an account is rejected under a row
  lock, so concurrent writers cannot race past the check.
- **Duplicate protection.** Unique keys on webhook event ids, checkout idempotency keys, refund
  and redemption idempotency keys, one earn per order, one reversal per refund.

### Contracts (`packages/contracts`)

One TypeScript package holding what several components must agree on:

- `money.ts` — the `Cents` type, parsing and formatting without floating point.
- `loyalty.ts` — the points formula (`floor(cents × rate / 100)`) and launch rewards.
- `membership.ts` — the membership QR payload format.
- `enums.ts` — value sets that mirror database constraints.
- `schemas.ts` — zod schemas for RPC arguments, results and admin inputs.

It is consumed as TypeScript source (imports carry `.ts` extensions), so Next.js, Vitest, plain
Node and, later, Deno Edge Functions can all load it without a build step.

`scripts/check-contract-drift.mjs` compares the enums and launch values with the database on
every test run. The database is the authority; the check fails if they differ.

### Admin app (`apps/admin`)

A Next.js App Router project with a single placeholder page, the design tokens (charcoal, cream,
gold), security headers, and an environment guard: the build fails if a server secret is placed
in a `NEXT_PUBLIC_*` variable.

## Identity and roles

One Supabase Auth user is either a customer or an employee, never both.

| Who      | Row in      | Created by                                        |
| -------- | ----------- | ------------------------------------------------- |
| Customer | `customers` | The customer, through `register_customer()`       |
| Employee | `employees` | An owner, through the admin server (service role) |

Employee roles are `employee` (cashier), `manager` and `owner`.

**How permissions are checked.** Row-level security policies call `private.is_staff()`,
`private.is_manager()` and `private.is_owner()`, which read the `employees` table for the calling
user on each statement. Deactivating or demoting someone takes effect on their next request.

**What the token claim is for.** The access token hook adds `user_role` to each JWT so the apps
can choose which screens to show without an extra query. It is a convenience only: no security
decision depends on it, because a token can be up to an hour stale.

This differs from the original plan, which had policies read the role from the JWT. Reading the
table closes the window in which a just-deactivated employee could keep working.

## Testing strategy

| Suite                | What it proves                                                    | Where                              |
| -------------------- | ----------------------------------------------------------------- | ---------------------------------- |
| pgTAP (220 tests)    | Structure, constraints, RLS isolation, privileges, triggers, RPCs | `supabase/tests`                   |
| Concurrency test     | 25 simultaneous debits cannot overdraw a loyalty account          | `scripts/db-concurrency-test.sh`   |
| Contract drift check | TypeScript enums match database constraints                       | `scripts/check-contract-drift.mjs` |
| Vitest (117 tests)   | Money math, points formula, QR format, validation, env guard      | `packages/contracts`, `apps/admin` |

CI runs the database suite twice: on plain PostgreSQL with a shim for Supabase's roles (fast, and
what runs locally without Docker), and on the real Supabase Postgres image.

## Decisions recorded so far

| Decision                           | Choice                                                                 |
| ---------------------------------- | ---------------------------------------------------------------------- |
| Sales tax                          | None. `total = subtotal − discount − reward`.                          |
| Refund after points were spent     | Spent points stay spent. Clawback is capped at the current balance.    |
| Negative loyalty balance           | Never. Enforced by constraint and trigger.                             |
| Negative stock                     | Allowed, as a signal to recount. A sale is never blocked by a count.   |
| Customer and employee on one login | Not allowed.                                                           |
| Hard deletes                       | None for people, products, orders or ledgers. Deactivate or anonymise. |
