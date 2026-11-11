# Bro Batch — Architecture & Milestone Plan

Status: **Planning only. No product code has been written yet.**
This document covers architecture, repository layout, database schema, payment and loyalty rules, milestones, and the external dependencies that block parts of the build.

---

## 1. What is being built

| Component | Users | Platform | Built with |
|---|---|---|---|
| Bro Batch POS | Employees | iPhone (SwiftUI) | SwiftUI, Stripe Terminal iOS SDK, Supabase Swift SDK |
| Bro Batch Rewards | Customers | iPhone (SwiftUI) | SwiftUI, Supabase Swift SDK, APNs |
| Bro Batch Admin | Owners, managers | Web | Next.js (App Router), TypeScript |
| Shared backend | All of the above | Supabase | Postgres, Auth, Row-Level Security, Edge Functions, Storage |
| Payments | — | Stripe | Stripe Payments, Stripe Terminal, Tap to Pay on iPhone, webhooks |

All three clients talk to **one** Supabase project. Clients never hold secrets. Anything that moves money or changes loyalty balances runs server-side in an Edge Function or a database function.

---

## 2. Architecture

```
 ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
 │  Bro Batch POS   │   │ Bro Batch Rewards│   │  Bro Batch Admin │
 │  (SwiftUI)       │   │  (SwiftUI)       │   │  (Next.js)       │
 │  Stripe Terminal │   │  APNs token      │   │  Server actions  │
 └──────┬─────┬─────┘   └────────┬─────────┘   └────────┬─────────┘
        │     │ connection token │ anon key + user JWT  │ user JWT (SSR)
        │     │                  │                      │
        │  ┌──▼──────────────────▼──────────────────────▼──────────┐
        │  │                    Supabase                           │
        │  │  Auth ── JWT claims: role = customer | employee |     │
        │  │          manager | owner                              │
        │  │  PostgREST + RLS: reads, plus limited self-service    │
        │  │  Edge Functions (service role, server-only):          │
        │  │    • create-payment-intent                            │
        │  │    • terminal-connection-token                        │
        │  │    • stripe-webhook   (verified signature, idempotent)│
        │  │    • process-refund                                   │
        │  │    • redeem-reward                                    │
        │  │    • send-push                                        │
        │  │  Postgres: domain tables + SECURITY DEFINER functions │
        │  │    • award_points_for_payment()                       │
        │  │    • reverse_points_for_refund()                      │
        │  │    • redeem_points()                                  │
        │  └────────────┬───────────────────────┬──────────────────┘
        │               │                       │
        │          ┌────▼─────┐           ┌─────▼──────┐
        └─────────►│  Stripe  │──webhook─►│   APNs     │
   card data stays └──────────┘           └────────────┘
   inside Stripe
```

### 2.1 Key decisions

1. **Single source of truth in Postgres.** Orders, payments, refunds and loyalty are rows in Postgres. Stripe is the source of truth for money movement. Our `payments` table mirrors Stripe state through webhooks.
2. **Points are only awarded on confirmed payment.** The award happens in the `payment_intent.succeeded` webhook handler, not when the POS app says the sale finished. The POS UI may show "points pending" until the webhook lands. This prevents a client from awarding points by faking a sale.
3. **Append-only loyalty ledger.** `loyalty_transactions` is never updated or deleted. `loyalty_accounts.balance` is a cached sum, updated in the same DB transaction as each ledger insert under a row lock. Refunds write a *reversal* row. They never edit the original earn row.
4. **Idempotency everywhere money or points move.** Every Stripe webhook event ID, every POS checkout attempt and every redemption carries a unique key. Replays are no-ops.
5. **No raw card data, ever.** Card entry and tap happen in Stripe Terminal. The apps receive only a PaymentIntent status. Our database stores Stripe IDs, last4 and brand at most.
6. **Secrets stay server-side.** The Stripe secret key, the webhook signing secret, the APNs `.p8` key and the Supabase service-role key live only in Edge Function secrets or the Next.js server environment. The iOS apps ship only the Supabase URL, the anon key and the Stripe publishable key, and Terminal uses short-lived connection tokens from the server.
7. **Clients cannot write money tables directly.** RLS denies client `INSERT`/`UPDATE` on `orders`, `payments`, `refunds`, `loyalty_*` and `redemptions`. Those writes happen only through Edge Functions or `SECURITY DEFINER` functions with fixed search paths.

### 2.2 The checkout flow (Tap to Pay)

```
POS                     Edge Fn                    Stripe                  Postgres
 │ create_order(cart,    │                          │                       │
 │   customer?, rewards) │─ validate prices ──────────────────────────────►│ orders (pending)
 │                       │   (server prices, not client prices)            │
 │                       │─ PaymentIntent.create ──►│                       │
 │◄── client_secret ─────│   idempotency_key=order  │                       │
 │ Terminal.collect +    │                          │                       │
 │   process (tap)       │◄────────── tap ─────────►│ (card read in SDK)    │
 │                       │                          │                       │
 │                       │◄── webhook: payment_intent.succeeded (signed) ──│
 │                       │─ verify sig, dedupe event_id ─────────────────►│ stripe_events
 │                       │─ award_points_for_payment() (one DB txn) ─────►│ payments, orders,
 │                       │                          │                       │ loyalty_transactions,
 │                       │                          │                       │ loyalty_accounts
 │◄── Realtime: order paid ──────────────────────────────────────────────────│
```

Two rules follow from this flow:

- **Prices are computed on the server.** The POS sends product IDs, quantities and requested reward IDs. The server looks up prices, applies discounts and redemptions, and computes the total. The client's total is only a display value.
- **Redemption and discounts are reserved before payment and committed on success.** A reward is reserved (points held) when the order is created. If the payment fails or is cancelled, the hold is released. If it succeeds, the hold becomes a debit.

### 2.3 Refund flow

1. Employee selects a paid order in POS, picks items or the whole order, and enters a reason.
2. `process-refund` Edge Function calls Stripe `refunds.create` with an idempotency key.
3. The Stripe `charge.refunded` webhook confirms the refund. Our handler writes a `refunds` row and calls `reverse_points_for_refund()`.
4. Reversal rule: points earned on the refunded amount are clawed back, capped at the customer's current balance. Points already spent on redemptions are **not** restored. Any shortfall is forfeited, so the balance never goes below zero.

### 2.4 Authorization model

| Role | Who | Can do |
|---|---|---|
| `customer` | Rewards app users | Read own profile, card, balance, ledger, redemptions. Update own profile. Request a redemption (through a function). |
| `employee` | POS users | Read catalog and inventory. Create orders. Look up customers by membership code. Process payments and refunds within limits. |
| `manager` | Store managers | Everything employee can do, plus inventory adjustments and void/refund approval above a threshold. |
| `owner` | Owner | Everything, including employee management, reward configuration and analytics. |

Roles come from `employees.role`, mirrored into the Supabase JWT via a custom access token hook so RLS can read them without a join. Admin dashboard access requires `manager` or `owner`.

---

## 3. Repository structure

Single monorepo, so shared constants, schemas and the database contract live in one place.

```
My-first-app/
├── README.md
├── docs/
│   ├── PLAN.md                  ← this document
│   ├── ARCHITECTURE.md          ← kept current as built
│   ├── PAYMENTS.md              ← Stripe modes, webhook list, refund rules
│   ├── LOYALTY.md               ← earn/reverse/redeem rules, worked examples
│   └── RUNBOOK.md               ← deploy, secrets rotation, incident steps
├── .github/
│   └── workflows/
│       ├── backend.yml          ← SQL migrations + pgTAP + Edge Function tests
│       ├── admin.yml            ← lint, typecheck, unit, e2e, build
│       └── ios.yml              ← build + unit tests (macOS runner, added in M5)
├── supabase/
│   ├── config.toml
│   ├── migrations/              ← ordered, immutable SQL migrations
│   ├── seed.sql                 ← sandbox products, rewards, one test employee
│   ├── tests/                   ← pgTAP: RLS, loyalty math, idempotency, races
│   └── functions/
│       ├── _shared/             ← money, stripe client, auth, validation, errors
│       ├── create-payment-intent/
│       ├── terminal-connection-token/
│       ├── stripe-webhook/
│       ├── process-refund/
│       ├── redeem-reward/
│       └── send-push/
├── packages/
│   └── contracts/               ← TypeScript: enums, reward/points constants,
│                                  request/response schemas (zod), shared by
│                                  Edge Functions and admin. Swift mirrors
│                                  generated from the same JSON schema.
├── apps/
│   ├── admin/                   ← Next.js (App Router) + TypeScript
│   │   ├── app/
│   │   │   ├── (auth)/login/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── page.tsx             ← revenue, sales, bars sold, flavors
│   │   │   │   ├── sales/
│   │   │   │   ├── inventory/
│   │   │   │   ├── customers/
│   │   │   │   ├── loyalty/
│   │   │   │   ├── refunds/
│   │   │   │   ├── employees/
│   │   │   │   └── rewards/             ← threshold configuration
│   │   ├── components/
│   │   ├── lib/supabase/        ← server + browser clients (no service key in browser)
│   │   └── tests/               ← vitest (unit), playwright (e2e)
│   ├── pos-ios/                 ← Xcode project, SwiftUI
│   │   ├── BroBatchPOS/
│   │   │   ├── App/
│   │   │   ├── Features/
│   │   │   │   ├── Auth/
│   │   │   │   ├── Catalog/
│   │   │   │   ├── Cart/
│   │   │   │   ├── Customer/            ← QR scan + lookup
│   │   │   │   ├── Checkout/            ← Terminal SDK, Tap to Pay
│   │   │   │   ├── History/
│   │   │   │   ├── Refunds/
│   │   │   │   └── Inventory/
│   │   │   ├── Core/
│   │   │   │   ├── Backend/             ← Supabase client, Edge Function calls
│   │   │   │   ├── Money/               ← integer-cents type, formatting
│   │   │   │   └── Design/              ← tokens: charcoal, cream, gold
│   │   │   └── Resources/               ← product imagery
│   │   └── BroBatchPOSTests/
│   └── rewards-ios/             ← Xcode project, SwiftUI
│       ├── BroBatchRewards/
│       │   ├── App/
│       │   ├── Features/
│       │   │   ├── Auth/
│       │   │   ├── MembershipCard/      ← rotating-free QR code rendering
│       │   │   ├── Balance/
│       │   │   ├── Rewards/
│       │   │   ├── History/
│       │   │   ├── Profile/
│       │   │   └── Notifications/
│       │   └── Core/
│       └── BroBatchRewardsTests/
└── scripts/
    ├── gen-swift-contracts.ts   ← emits Swift Codable types from contracts
    └── seed-sandbox.ts          ← Stripe test-mode product/price seeding
```

### 3.1 Why a monorepo

- The points formula, reward thresholds and order schema are used by the database, Edge Functions, the admin site and both iOS apps. One definition avoids drift.
- Migrations and the client contract change together. A pull request that changes a column can update the Swift and TypeScript types in the same change.

---

## 4. Database schema

All money is stored as **integer cents** (`bigint`). Floats are never used for money. All timestamps are `timestamptz` in UTC. Primary keys are `uuid` unless noted.

### 4.1 Identity and people

```sql
-- Customers: one row per rewards account. Linked to auth.users.
create table customers (
  id              uuid primary key references auth.users(id) on delete restrict,
  full_name       text not null check (length(full_name) between 1 and 120),
  email           citext unique not null,
  phone           text,
  -- Opaque, random, non-guessable code printed in the QR. NOT derived from id or PII.
  membership_code text unique not null default encode(gen_random_bytes(16), 'hex'),
  marketing_opt_in boolean not null default false,
  created_at      timestamptz not null default now(),
  deleted_at      timestamptz           -- soft delete; PII purge handled separately
);

-- Employees: staff accounts. Linked to auth.users.
create table employees (
  id          uuid primary key references auth.users(id) on delete restrict,
  full_name   text not null,
  role        text not null check (role in ('employee','manager','owner')),
  is_active   boolean not null default true,
  pin_hash    text,                     -- optional quick-switch PIN, bcrypt/argon2 at app layer
  created_at  timestamptz not null default now(),
  created_by  uuid references employees(id)
);
```

Employees do not sign in to the customer app, and customers do not sign in to POS. The JWT role claim decides which surface a user gets.

### 4.2 Catalog and inventory

```sql
create table products (
  id           uuid primary key default gen_random_uuid(),
  sku          text unique not null,
  name         text not null,
  flavor       text not null,               -- e.g. 'Cookies & Cream'
  category     text not null check (category in ('bar','three_pack','six_pack','other')),
  description  text,
  price_cents  bigint not null check (price_cents >= 0),
  image_path   text,                        -- Supabase Storage path
  is_active    boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Current on-hand quantity. Derived from inventory_movements, cached here.
create table inventory_levels (
  product_id   uuid primary key references products(id),
  on_hand      int not null default 0,
  reorder_at   int not null default 0,
  updated_at   timestamptz not null default now()
);

-- Append-only stock ledger.
create table inventory_movements (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references products(id),
  delta        int not null check (delta <> 0),
  reason       text not null check (reason in ('restock','sale','refund_restock','adjustment','waste','count')),
  order_id     uuid,                        -- set for sale / refund_restock
  employee_id  uuid references employees(id),
  note         text,
  created_at   timestamptz not null default now()
);
```

Products are not deleted, only deactivated, so historical orders stay readable.

### 4.3 Orders and payments

```sql
create type order_status as enum ('pending','paid','partially_refunded','refunded','cancelled','failed');

create table orders (
  id                   uuid primary key default gen_random_uuid(),
  order_number         bigint generated always as identity unique,   -- human-friendly
  customer_id          uuid references customers(id),
  employee_id          uuid not null references employees(id),
  status               order_status not null default 'pending',
  subtotal_cents       bigint not null check (subtotal_cents >= 0),
  discount_cents       bigint not null default 0 check (discount_cents >= 0),
  reward_cents         bigint not null default 0 check (reward_cents >= 0),
  total_cents          bigint not null check (total_cents >= 0),
  points_reserved      int not null default 0 check (points_reserved >= 0),
  points_awarded       int not null default 0,
  idempotency_key      text unique not null,      -- client-generated UUID per checkout attempt
  created_at           timestamptz not null default now(),
  paid_at              timestamptz,
  check (total_cents = subtotal_cents - discount_cents - reward_cents)
);

create table order_items (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references orders(id) on delete restrict,
  product_id        uuid not null references products(id),
  -- snapshot at sale time, so later catalog edits do not rewrite history
  product_name      text not null,
  flavor            text not null,
  unit_price_cents  bigint not null check (unit_price_cents >= 0),
  quantity          int not null check (quantity > 0),
  line_total_cents  bigint not null check (line_total_cents = unit_price_cents * quantity),
  refunded_quantity int not null default 0 check (refunded_quantity between 0 and quantity)
);

create table payments (
  id                       uuid primary key default gen_random_uuid(),
  order_id                 uuid not null references orders(id),
  provider                 text not null default 'stripe',
  provider_payment_intent  text unique not null,       -- pi_...
  provider_charge_id       text unique,                -- ch_...
  amount_cents             bigint not null check (amount_cents > 0),
  currency                 char(3) not null default 'usd',
  status                   text not null check (status in ('requires_payment_method','processing','succeeded','canceled','failed')),
  card_brand               text,                       -- display only
  card_last4               char(4),                    -- display only
  reader_location          text,                       -- 'tap_to_pay' | reader id
  created_at               timestamptz not null default now(),
  succeeded_at             timestamptz
);
```

No card number, expiry, CVC or full magstripe data is ever stored, and no column is named to suggest it.

### 4.4 Refunds

```sql
create table refunds (
  id                   uuid primary key default gen_random_uuid(),
  order_id             uuid not null references orders(id),
  payment_id           uuid not null references payments(id),
  amount_cents         bigint not null check (amount_cents > 0),
  reason               text not null check (reason in ('customer_request','damaged','wrong_item','duplicate','other')),
  note                 text,
  status               text not null check (status in ('pending','succeeded','failed','canceled')),
  provider_refund_id   text unique,                      -- re_...
  requested_by         uuid not null references employees(id),
  approved_by          uuid references employees(id),   -- required above threshold
  points_reversed      int not null default 0,
  created_at           timestamptz not null default now(),
  completed_at         timestamptz
);

create table refund_items (
  refund_id        uuid not null references refunds(id),
  order_item_id    uuid not null references order_items(id),
  quantity         int not null check (quantity > 0),
  primary key (refund_id, order_item_id)
);
```

### 4.5 Loyalty

```sql
create table loyalty_accounts (
  customer_id     uuid primary key references customers(id),
  balance         bigint not null default 0 check (balance >= 0),   -- cached; never negative
  lifetime_earned bigint not null default 0 check (lifetime_earned >= 0),
  updated_at      timestamptz not null default now()
);

create table loyalty_transactions (
  id               uuid primary key default gen_random_uuid(),
  customer_id      uuid not null references customers(id),
  kind             text not null check (kind in ('earn','redeem','reverse_earn','reverse_redeem','adjust','expire')),
  points           bigint not null check (points <> 0),       -- signed: + credit, - debit
  balance_after    bigint not null,
  order_id         uuid references orders(id),
  refund_id        uuid references refunds(id),
  redemption_id    uuid,                                       -- FK added after redemptions
  source_event_id  text unique,                                -- e.g. Stripe event id: dedupe key
  reason           text,
  created_by       uuid,                                       -- employee or null for system
  created_at       timestamptz not null default now()
);

create table rewards (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,                    -- 'Free protein bar'
  description  text,
  points_cost  bigint not null check (points_cost > 0),
  product_id   uuid references products(id),     -- the item granted, if any
  quantity     int not null default 1 check (quantity > 0),
  is_active    boolean not null default true,
  starts_at    timestamptz,
  ends_at     timestamptz,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create type redemption_status as enum ('reserved','fulfilled','released','expired');

create table redemptions (
  id              uuid primary key default gen_random_uuid(),
  customer_id     uuid not null references customers(id),
  reward_id       uuid not null references rewards(id),
  points_cost     bigint not null check (points_cost > 0),   -- snapshot at redemption time
  status          redemption_status not null default 'reserved',
  order_id        uuid references orders(id),
  idempotency_key text unique not null,
  created_at      timestamptz not null default now(),
  fulfilled_at    timestamptz
);
```

### 4.6 Platform tables

```sql
-- Every Stripe webhook event we have processed. Primary key = Stripe event id.
create table stripe_events (
  id           text primary key,                -- evt_...
  type         text not null,
  received_at  timestamptz not null default now(),
  processed_at timestamptz,
  status       text not null check (status in ('received','processed','failed','ignored')),
  error        text,
  payload      jsonb not null
);

-- Append-only audit trail for staff actions and money-moving functions.
create table audit_log (
  id           bigint generated always as identity primary key,
  actor_id     uuid,
  actor_role   text,
  action       text not null,                   -- 'refund.create', 'reward.update', ...
  entity       text not null,
  entity_id    uuid,
  before       jsonb,
  after        jsonb,
  created_at   timestamptz not null default now()
);

-- Device push tokens for APNs.
create table push_tokens (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  token       text not null unique,
  platform    text not null default 'ios',
  created_at  timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
```

### 4.7 Row-Level Security summary

| Table | Customer | Employee | Manager/Owner | Writes |
|---|---|---|---|---|
| `customers` | own row (read/update own profile) | read (for lookup, minimal columns via view) | read | customer self-update; create via sign-up function |
| `loyalty_accounts` | own | read via view | read | functions only |
| `loyalty_transactions` | own | read via view | read | functions only |
| `rewards` | read active | read active | full | owner/manager only |
| `redemptions` | own | read | read | functions only |
| `products`, `inventory_*` | read active products | read | write (manager) | manager; movements via function |
| `orders`, `order_items`, `payments`, `refunds` | none | own store's recent | read | Edge Functions only |
| `stripe_events`, `audit_log` | none | none | read (owner) | service role only |
| `employees` | none | self | full (owner) | owner |

Customer lookup from POS goes through a `SECURITY DEFINER` function that accepts a membership code and returns only name, first name, tier and balance. It never returns email or phone to a cashier.

### 4.8 Core database functions (designed here, implemented in M2)

- `award_points_for_payment(payment_id, event_id)`: idempotent. If `loyalty_transactions.source_event_id` already exists, it returns without change. Otherwise it locks the customer's `loyalty_accounts` row, computes points, inserts the ledger row, updates the balance and `orders.points_awarded`, and marks the payment succeeded.
- `reverse_points_for_refund(refund_id)`: inserts `reverse_earn` for points proportional to the refunded amount, rounded down. It cannot reverse more than was awarded for that order, and it cannot reverse more than the customer's current balance. Any shortfall is forfeited rather than debited below zero.
- `redeem_points(customer_id, reward_id, order_id, idem_key)`: checks the reward is active, `balance >= points_cost`, and the idempotency key is unused. It locks the account, debits the balance, and inserts a `reserved` redemption.
- `release_redemption(redemption_id)`: called on failed or cancelled payment. Credits points back and marks the redemption released.
- `set_updated_at()` and `audit_write()` triggers on mutable tables.

Each function sets `search_path = ''` and schema-qualifies every reference, which blocks search-path hijacking.

---

## 5. Loyalty rules (initial)

- **Earn:** `points = floor(paid_amount_cents / 10)`. This is 10 points per $1, so $9.00 gives 90 points. Earn is calculated on the **net paid amount after discounts**. No tax applies. Rewards redeemed in the same order do not earn points.
- **Thresholds (configurable in admin):**

  | Reward | Points | Grants |
  |---|---|---|
  | Free protein bar | 300 | 1 × bar (product selectable) |
  | Free three-pack | 750 | 1 × three-pack |
  | Free six-pack | 1,400 | 1 × six-pack |

- **Redemption:** Debits points at the time of order creation (reserved). Fulfilled when the payment succeeds. Released if the payment fails or the order is cancelled before payment.
- **Refund:** Claws back points earned on the refunded amount, capped at the customer's current balance. Points already spent on redemptions are not restored. The balance never goes below zero.
- **Expiry:** None in v1. The schema has `expire` for later.

---

## 6. Security checklist (applies to every milestone)

- [ ] Stripe secret key and webhook secret only in Edge Function secrets or Next.js server env. Never in iOS bundles, git, or client-side JS.
- [ ] Stripe webhook: verify signature with the raw body, reject if older than tolerance, dedupe on `event.id`.
- [ ] Every money-moving Edge Function requires a valid JWT, checks role, and writes to `audit_log`.
- [ ] Idempotency keys on: order creation, PaymentIntent creation, refund creation, redemption, webhook events.
- [ ] RLS enabled on every table in `public`. Tests assert a customer cannot read another customer's rows.
- [ ] `SECURITY DEFINER` functions use `search_path = ''`, and their grants are revoked from `anon` and `public`.
- [ ] Client-supplied prices, totals and points are never trusted.
- [ ] Money as integer cents everywhere. No `Double` or `float` in Swift or TypeScript for money.
- [ ] Rate limits on login, membership-code lookup and redemption endpoints.
- [ ] Logs never contain card data, full emails, or service keys.
- [ ] Apple: sign-in and account deletion (App Store requirement for apps with accounts).
- [ ] Privacy policy and data deletion path for customers before public launch.

---

## 7. Milestones

Each milestone has the same definition of done: code, migrations, tests that pass in CI, a doc update, and a short demo or screenshot. A milestone is not "done" if it only works on the happy path.

### M0 — Foundations (repo, tooling, CI)
- Monorepo layout from §3, `docs/` skeleton, `.editorconfig`, `.gitignore`, pre-commit lint.
- `packages/contracts` with money type, points constants, and zod schemas for every API payload.
- Supabase project config, local stack (`supabase start`), seed script.
- GitHub Actions: backend, admin workflows. iOS workflow stubbed.
- **Done when:** a fresh clone runs `make setup && make test` green.

### M1 — Database schema and security
- Migrations for §4 tables, enums, constraints, indexes, triggers.
- RLS policies for every table, per §4.7.
- Custom access token hook to put `role` into the JWT.
- pgTAP tests: every table has RLS enabled; customer A cannot read customer B; employee cannot write `orders` directly; check constraints reject negative money.
- **Done when:** all pgTAP tests pass in CI and a negative-test suite proves the RLS rules.

### M2 — Loyalty ledger engine
- `award_points_for_payment`, `reverse_points_for_refund`, `redeem_points`, `release_redemption`.
- Concurrency tests: 50 parallel redemptions against a balance of 300 produce exactly one success.
- Idempotency tests: same webhook event applied 5 times produces one ledger row.
- Rounding tests: $9.00 → 90, $0.99 → 9, $10.05 → 100 (floor).
- **Done when:** the loyalty worked examples in `docs/LOYALTY.md` are executable tests.

### M3 — Payments backend (Stripe sandbox)
- `create-payment-intent`, `terminal-connection-token`, `stripe-webhook`, `process-refund`, `redeem-reward`.
- Server-side price calculation and reward reservation.
- Webhook handler for `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`, `charge.refunded`.
- Tests run against Stripe **test mode** with the `stripe-mock` or real test keys. Signature tests use fixtures.
- **Done when:** a sandbox sale end-to-end produces an order, a payment and points, and a sandbox refund reverses them, all idempotent under replayed webhooks.

### M4 — Admin dashboard (web)
- Login with Supabase Auth, role gate (manager/owner only).
- Read dashboards: total revenue, daily and monthly sales, bars sold, best-selling flavors, inventory levels, refund report, loyalty analytics.
- Management pages: customers (search, detail, ledger), products and inventory adjustments, employees (owner only), reward configuration with threshold edits and audit log.
- Analytics queries are SQL views or RPCs. Charts follow the design direction (charcoal, cream, subtle gold).
- Playwright e2e for login, role gating and reward threshold change.
- **Done when:** all dashboards render from sandbox data and a reward threshold change is reflected in the next Edge Function response.

### M5 — POS iOS app (without card payments)
- Sign-in, role-aware navigation.
- Product catalog with images and flavor categories, cart, quantity controls, subtotal/total (display only, server recalculates).
- Customer QR scan (AVFoundation) and membership-code lookup.
- Discounts and reward selection.
- Transaction history, refund screen, inventory screen.
- Checkout uses a **cash/test** path in dev builds only, so the flow can be exercised before Tap to Pay.
- Unit tests for cart math and money formatting; UI tests for checkout flow.
- **Done when:** the app runs on a simulator against the sandbox backend. Tests run in CI on a macOS runner.

### M6 — Tap to Pay on iPhone
- Stripe Terminal iOS SDK integration, connection token fetch, `collectPaymentMethod`, `processPayment`.
- Tap to Pay requires Apple's entitlement. Code is gated behind a feature flag and a runtime capability check, so the app degrades to a clear "Tap to Pay unavailable" state without the entitlement.
- Unpaid or cancelled PaymentIntents release reserved rewards.
- **Done when:** the flow is verified on a real device with the entitlement. Until then this milestone is **blocked** on Apple approval (see §9), and everything else is built and tested with simulated or test-mode reader paths.

### M7 — Rewards iOS app (customer)
- Account registration, login, sign-out, account deletion.
- Digital membership card with QR rendered from `membership_code`.
- Live balance (Realtime subscription on `loyalty_accounts`).
- Rewards catalog and redemption request (calls `redeem-reward`).
- Purchase history and loyalty ledger.
- Profile management.
- **Done when:** a customer can sign up, see points after a sandbox sale, and redeem a reward that the POS then honors.

### M8 — Push notifications
- APNs key setup, device token registration, `push_tokens` storage.
- `send-push` triggered from database events or the webhook: points earned, reward available, refund processed.
- Per-customer opt-out respected.
- **Done when:** a sandbox sale delivers a push to a test device.

### M9 — Hardening and launch preparation
- Load test on the payment and redemption paths.
- Observability: structured logs, alerts on webhook failures and reconciliation gaps.
- Nightly reconciliation job: Stripe balance transactions vs `payments` vs `loyalty_transactions`.
- Backup and restore drill. Secrets rotation runbook.
- TestFlight build and App Store submission checklist.
- **Done when:** a runbook exists and a restore has been performed in staging.

Suggested order: **M0 → M1 → M2 → M3 → M4 and M5 in parallel → M7 → M8 → M6 when entitlement lands → M9.** M6 is deliberately late. It is the only milestone blocked on an external approval.

---

## 8. Open decisions (need your answer)

1. **Refund and points — DECIDED:** redeemed points stay spent. Refund clawback of earned points is capped at the current balance. The balance never goes negative.
2. **Tax — DECIDED:** no tax. `tax_cents` is removed from the schema.
3. **Refund approval threshold:** above what amount does a manager need to approve a refund? Plan default: $25.
4. **Membership code:** static code per customer (simple, what the plan assumes) or rotating short-lived QR (harder to screenshot-share, more work)?
5. **Customer sign-in:** email + password only, or also Sign in with Apple and Google? Sign in with Apple is required if any other third-party sign-in is offered.
6. **Products and imagery:** who supplies product photography and flavor list? Initial seed will use placeholders.
7. **Number of stores:** single location assumed. Multi-location changes `orders`, `inventory_levels` and reporting keys.
8. **Customer PII retention:** how long to keep deleted-account data for financial records?

---

## 9. External dependencies and what blocks what

These cannot be completed by code alone. The plan does not assume any of them are configured.

| Dependency | Needed for | Owner action | Blocks |
|---|---|---|---|
| Supabase project (prod + staging) | Everything backend | Create project, supply URL and keys | M1 onward in hosted form (local dev works without it) |
| Stripe account, test-mode keys | Payments sandbox | Create account, enable Terminal, create a Terminal location | M3 |
| Stripe Terminal location + reader or Tap to Pay setup | M6 | Configure in Stripe Dashboard | M6 |
| **Apple Developer Program membership** | Any iOS build for devices, TestFlight, APNs | Enroll ($99/yr) | M5 device testing, M7, M8 |
| **Tap to Pay on iPhone entitlement** | Real card acceptance on iPhone | Request from Apple, approval required | M6 device verification |
| APNs key (`.p8`) | Push notifications | Create in Apple Developer portal | M8 |
| Domain + hosting for admin | Admin dashboard in production | Choose host (e.g. Vercel) and domain | M4 deploy only; local dev works |
| Privacy policy, terms | App Store review | Legal review | M9 launch |

I can write and test everything that does not depend on these: the SQL, Edge Functions, Next.js admin, and Swift code. I **cannot** compile or run the Swift apps in this environment, since it is Linux. I also cannot create accounts, obtain keys or request Apple entitlements. Swift code will be checked by careful review and by CI on a macOS runner once that exists.

---

## 10. What I can do in this environment, and what I can't

**I can do here:**
- Write and version-control all SQL migrations, RLS policies and pgTAP tests. Run them if a local Postgres is available (I will check when M1 starts; a Supabase local stack needs Docker, which may not be available here).
- Write TypeScript Edge Functions and unit-test them with Deno or Vitest, using mocked Stripe responses and signed fixtures.
- Build and test the Next.js admin: typecheck, lint, Vitest, Playwright against a local or sandbox backend.
- Write the SwiftUI source for both apps, and the shared Swift models generated from the contracts package.
- Set up GitHub Actions and the project docs.

**I cannot do here:**
- Compile or run the SwiftUI apps or the iOS simulator (no Xcode on Linux). Swift will be unverified until a macOS runner or your machine builds it.
- Test real Tap to Pay, real Terminal readers, or real APNs delivery.
- Create Stripe, Supabase, Apple or APNs accounts, or enter their secrets for you. Secrets will be requested through the secure form, never pasted in chat.
- Submit anything to the App Store or make legal or tax decisions.

---

## 11. Before you start the stronger model

Items to settle first, in order of how much they change the build:

1. Decisions 1 (refunds and points) and 2 (tax) in §8 are settled and reflected in the plan. Decisions 3 to 8 remain open, and none of them blocks M0 or M1.
2. Confirm whether you have, or will get, the Apple Developer account and the Tap to Pay entitlement request in progress. M6 depends on it and its lead time is outside our control.
3. Decide where the Supabase and Stripe accounts live (your accounts, under what owner), so keys are created in the right place.
4. Confirm a Mac is available for iOS builds, or that CI on a macOS runner is acceptable.

Once those are settled, the first implementation step is M0 + M1, which I can start on immediately.
