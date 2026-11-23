# Bro Batch

Customer loyalty platform for Bro Batch protein bars, built around Shopify POS: a rewards tile
inside the till, a customer Rewards app for iPhone, a web admin dashboard, and one Supabase
backend that keeps the points.

## Status

| Milestone | Scope                                        | State                                                |
| --------- | -------------------------------------------- | ---------------------------------------------------- |
| M0        | Repository, tooling, CI, shared contracts    | Done                                                 |
| M1        | Loyalty database, row-level security         | Done                                                 |
| M2        | Loyalty engine (earn, reverse, redeem)       | Done                                                 |
| S1        | Shopify backend (webhooks, rewards as codes) | Built, tested with Shopify faked                     |
| S2        | Rewards tile for Shopify POS                 | Builds and is tested; never run on a device          |
| S3        | Connect a Shopify dev store                  | Deploy path written; waiting on accounts and secrets |
| S4        | Admin dashboard                              | Not started                                          |
| S5        | Rewards iPhone app                           | Not started                                          |
| S6        | Push notifications                           | Not started                                          |
| S7        | Hardening and go-live                        | Not started                                          |

Nothing is deployed and nothing has been connected to Shopify. The owner has a Shopify account and
Shopify POS; the project still needs a Supabase project, a Shopify app and four deploy secrets.
`docs/RUNBOOK.md`, "Connect Shopify", has the steps.

## Repository layout

```
apps/shopify/        Shopify app config and the POS rewards tile (UI extension)
apps/admin/          Next.js admin dashboard (placeholder page until S4)
apps/rewards-ios/    Rewards iPhone app (S5, not built)
packages/contracts/  Shared TypeScript: money, points formula, enums, validation schemas
supabase/migrations/ Database schema, triggers, functions, row-level security
supabase/functions/  Edge Functions: Shopify webhook and the POS tile's endpoints (Deno)
supabase/tests/      pgTAP tests for the database
scripts/             Database test runner, concurrency test, contract drift check, deploy checks
docs/                Plan, architecture, Shopify integration, loyalty rules, runbook
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

- `docs/PLAN.md` — the direction, where each requirement lives, milestones, what is needed next.
- `docs/ARCHITECTURE.md` — what exists today and how the pieces fit.
- `docs/SHOPIFY.md` — webhooks, rewards as discount codes, endpoints, what is still unverified.
- `docs/LOYALTY.md` — how points are earned, spent and taken back, with worked examples.
- `docs/DATABASE.md` — tables, invariants, who can read and write what, how to test.
- `docs/RUNBOOK.md` — local setup, connecting Shopify, first owner account, secrets.

## Ground rules

- Money is integer cents everywhere. No floating-point dollars.
- Points move only on a signed message from Shopify. The till and the apps cannot award them.
- No secret keys in the POS tile, the iOS app, browser JavaScript, or git.
- No card or payment data is stored here. Shopify takes and records payments.
