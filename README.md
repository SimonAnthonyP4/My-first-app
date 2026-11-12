# Bro Batch

Point-of-sale and customer loyalty platform for Bro Batch protein bars: an employee POS app and a
customer Rewards app for iPhone, a web admin dashboard, and one shared Supabase backend.

## Status

| Milestone | Scope                                            | State                             |
| --------- | ------------------------------------------------ | --------------------------------- |
| M0        | Repository, tooling, CI, shared contracts        | Done                              |
| M1        | Database schema, row-level security, tests       | Done                              |
| M2        | Loyalty engine (earn, reverse, redeem functions) | Done                              |
| M3        | Payments backend (checkout, webhooks, refunds)   | Built, not yet run against Stripe |
| M4        | Admin dashboard                                  | Not started                       |
| M5        | POS iOS app (without card payments)              | Not started                       |
| M6        | Tap to Pay on iPhone                             | Not started                       |
| M7        | Rewards iOS app                                  | Not started                       |
| M8        | Push notifications                               | Not started                       |
| M9        | Hardening and launch preparation                 | Not started                       |

Nothing is deployed. No Supabase project, Stripe account, Apple entitlement or APNs key has been
configured; see `docs/RUNBOOK.md` for what each needs.

## Repository layout

```
apps/admin/          Next.js admin dashboard (placeholder page until M4)
apps/pos-ios/        POS iPhone app (M5, not built)
apps/rewards-ios/    Rewards iPhone app (M7, not built)
packages/contracts/  Shared TypeScript: money, points formula, enums, validation schemas
supabase/migrations/ Database schema, triggers, functions, row-level security
supabase/functions/  Edge Functions: checkout, Stripe webhook, refunds (Deno)
supabase/tests/      pgTAP tests for the database
supabase/seed.sql    Sandbox catalog for development (placeholder products)
scripts/             Database test runner, concurrency test, contract drift check
docs/                Plan, architecture, database reference, runbook
```

## Getting started

Requirements: Node 22.18 or newer, pnpm 10, and for the database tests either PostgreSQL 16 with
pgTAP or Docker (details in `docs/DATABASE.md`).

```bash
make setup    # install dependencies, enable git hooks
make test     # unit tests, Edge Function tests, database tests
make check    # everything CI runs: format, lint, typecheck, tests, build
make help     # all tasks
```

## Documentation

- `docs/PLAN.md` — full architecture, schema design and milestone plan.
- `docs/ARCHITECTURE.md` — what exists today and how the pieces fit.
- `docs/DATABASE.md` — tables, invariants, who can read and write what, how to test.
- `docs/LOYALTY.md` — how points are earned, spent and taken back, with worked examples.
- `docs/PAYMENTS.md` — checkout, webhooks, refunds, endpoints, and what is still unverified.
- `docs/RUNBOOK.md` — local setup, creating the hosted project, first owner account, secrets.

## Ground rules

- Money is integer cents everywhere. No floating-point dollars.
- Clients never write orders, payments, refunds or loyalty points. The server does, after a
  verified payment.
- No secret keys in the iOS apps, in browser JavaScript, or in git.
- No card numbers are stored anywhere. Card data stays inside Stripe.
