# Database reference

The migrations in `supabase/migrations` are the source of truth. This page explains what they
set up and how to work with them.

## Tables

| Table                  | Purpose                                       | Written by                  |
| ---------------------- | --------------------------------------------- | --------------------------- |
| `employees`            | Staff accounts and roles                      | Server; owners edit         |
| `customers`            | Rewards members                               | `register_customer()`; self |
| `products`             | Catalog. Deactivated, never deleted           | Managers                    |
| `inventory_levels`     | Cached stock per product, plus reorder point  | Trigger; managers (reorder) |
| `inventory_movements`  | Append-only stock ledger                      | Managers (manual); server   |
| `orders`               | One row per checkout                          | Server only                 |
| `order_items`          | Line items with a price snapshot              | Server only                 |
| `payments`             | Mirror of Stripe PaymentIntents. No card data | Server only                 |
| `refunds`              | Refund requests and results                   | Server only                 |
| `refund_items`         | Which line items a refund covers              | Server only                 |
| `loyalty_accounts`     | Cached points balance per customer            | Trigger only                |
| `loyalty_transactions` | Append-only points ledger                     | Server only                 |
| `rewards`              | Reward catalog and thresholds                 | Managers                    |
| `redemptions`          | A customer's claim on a reward                | Server only                 |
| `app_settings`         | One row: earn rate, refund approval threshold | Owners                      |
| `stripe_events`        | Webhook events already accepted (idempotency) | Server only                 |
| `audit_log`            | Append-only record of configuration changes   | Trigger only                |
| `push_tokens`          | APNs device tokens                            | Customers (own)             |

"Server" means the service role: Edge Functions and the admin server. Neither exists yet (M3, M4).

## Invariants

These are enforced by constraints and triggers, so they hold for every writer, including the
service role.

**Money**

- All amounts are integer cents (`bigint`), never negative.
- `orders.total_cents = subtotal_cents − discount_cents − reward_cents`. There is no tax.
- `order_items.line_total_cents = unit_price_cents × quantity`.
- A paid order has `paid_at`; an unpaid one does not.
- An order can have at most one succeeded payment.
- A Stripe PaymentIntent, charge or refund id appears at most once.
- `card_last4` is exactly four digits. No column can hold a card number.

**Loyalty**

- `loyalty_accounts.balance` always equals the sum of that customer's `loyalty_transactions`.
  A trigger applies each ledger insert to the balance under a row lock; nothing else can change
  the balance.
- The balance is never negative. A debit larger than the balance fails with SQLSTATE `BB001`.
- Ledger rows cannot be updated, deleted or truncated.
- An order earns points at most once. A refund reverses at most once. A redemption is debited at
  most once and released at most once. A webhook event id is used at most once.
- Earns are positive, debits negative. Manual adjustments need a reason and the employee's id.

**Inventory**

- `inventory_levels.on_hand` always equals the sum of that product's movements, maintained the
  same way as the loyalty balance.
- Movements cannot be updated or deleted.
- `on_hand` may be negative. A bar that is physically on the shelf stays sellable when the count
  has drifted; a negative level means "recount".

**People**

- An auth user is a customer or an employee, never both.
- The last active owner cannot be demoted or deactivated.
- `customers.email` is copied from the auth user, never taken from client input, and follows
  email changes.
- Membership codes are 32 random hex characters, unique, and not derived from anything personal.

**Audit**

- Every insert, update and delete on `employees`, `products`, `rewards` and `app_settings`, and
  every reorder-point change, writes an `audit_log` row with the actor, their role, and the
  before and after values. Audit rows cannot be changed.

## Who can do what

`anon` (not signed in) can do nothing: no table, no function.

| Table                                      | Customer                          | Cashier               | Manager                       | Owner                             |
| ------------------------------------------ | --------------------------------- | --------------------- | ----------------------------- | --------------------------------- |
| `customers`                                | Own row; edit name, phone, opt-in | Lookup functions only | Read all                      | Read all                          |
| `employees`                                | —                                 | Own row               | Read all                      | Read all; edit name, role, active |
| `products`                                 | Read active                       | Read active           | Read all; add; edit           | Same as manager                   |
| `inventory_levels`                         | —                                 | Read                  | Read; set reorder point       | Same as manager                   |
| `inventory_movements`                      | —                                 | —                     | Read; record manual movements | Same as manager                   |
| `orders`, `order_items`                    | Own completed orders              | Read all              | Read all                      | Read all                          |
| `payments`, `refunds`, `refund_items`      | —                                 | Read all              | Read all                      | Read all                          |
| `loyalty_accounts`, `loyalty_transactions` | Own                               | Lookup functions only | Read all                      | Read all                          |
| `rewards`                                  | Read live rewards                 | Read live rewards     | Read all; add; edit           | Same as manager                   |
| `redemptions`                              | Own                               | Read all              | Read all                      | Read all                          |
| `app_settings`                             | Read                              | Read                  | Read                          | Read; edit                        |
| `audit_log`                                | —                                 | —                     | —                             | Read                              |
| `stripe_events`                            | —                                 | —                     | —                             | —                                 |
| `push_tokens`                              | Own: read, add, remove            | —                     | —                             | —                                 |

Nobody can delete products, rewards, customers, employees, orders or ledger rows.

Column-level limits: customers cannot change their own `email`, `membership_code` or
`deleted_at`; nobody can write `on_hand` or a loyalty balance.

## Functions

| Function                                 | Caller         | What it does                                                                                                                          |
| ---------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `register_customer(name, phone, opt_in)` | Signed-in user | Creates the caller's customer profile and loyalty account. Email comes from the auth user. Safe to call twice. Refused for employees. |
| `lookup_customer_by_code(code)`          | Staff          | Finds a customer by scanned membership code. Returns id, name, balance, member-since. No email or phone.                              |
| `find_customer_by_contact(text)`         | Staff          | Exact match on email or phone, at most 5 rows, same columns. No partial search.                                                       |
| `custom_access_token_hook(event)`        | Auth service   | Adds the `user_role` claim to access tokens.                                                                                          |

The functions that award, reverse and redeem points are milestone M2.

## Running the tests

`make db-test` picks whichever setup is available.

**Plain PostgreSQL (no Docker).** Needs PostgreSQL 16, pgTAP and `pg_prove`:

```bash
# Ubuntu / Debian
sudo apt-get install postgresql-16 postgresql-16-pgtap libtap-parser-sourcehandler-pgtap-perl
sudo -u postgres psql -c "alter user postgres password 'postgres'"

make db-test-plain
```

`scripts/db-test.sh` creates a throwaway database, applies `scripts/db/supabase-shim.sql` (stand-ins
for the roles, `auth.users` and `auth.uid()` that Supabase provides, with Supabase's permissive
default grants), then every migration and the seed. It then runs the contract drift check, the
pgTAP suite and the concurrency test, and drops the database. Connection settings come from
`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`. Set `KEEP_DB=1` to keep the database for inspection.

**Supabase local stack (Docker).**

```bash
make db-test-supabase     # supabase db start && supabase test db
```

This uses the real Supabase Postgres image. It does not run the concurrency test or the drift
check; CI runs both setups.

## Adding a migration

1. Create `supabase/migrations/<UTC timestamp>_<name>.sql`. Never edit a migration that has been
   applied to a shared database.
2. For every new table: enable row-level security, grant only what clients need, and add policies.
   New tables are closed by default (the first migration removes Supabase's automatic grants).
3. For every new function: `revoke all ... from public, anon, authenticated`, then grant to the
   roles that need it. `SECURITY DEFINER` functions must `set search_path = ''` and
   schema-qualify every name.
4. Add pgTAP tests. Update the allow-lists in `supabase/tests/01_structure_and_privileges.sql`
   if you intentionally added a client write path or a callable function; that test fails
   otherwise, on purpose.
5. If you changed a value list (a `CHECK ... IN (...)` or an enum), update
   `packages/contracts/src/enums.ts`. The drift check fails otherwise.
6. Run `make db-test`.

## Differences from the original plan

| Plan                               | Built                                               | Why                                                        |
| ---------------------------------- | --------------------------------------------------- | ---------------------------------------------------------- |
| RLS reads the role from the JWT    | RLS reads the `employees` table                     | Deactivation takes effect at once, not at token expiry     |
| `employees.pin_hash`               | Left out                                            | Not in the requirements; one less secret to store          |
| `rewards.product_id` only          | Added `rewards.grants_category`                     | "Free protein bar" means any flavor, not one product       |
| —                                  | Added `products.bar_count`, `order_items.bar_count` | Needed for the "bars sold" metric (a six-pack is six bars) |
| —                                  | Added `app_settings`                                | Earn rate and refund threshold must be configurable        |
| Balance maintained by M2 functions | Balance maintained by a trigger on the ledger       | Balance cannot diverge from the ledger, whoever writes     |
| `tax_cents`                        | Removed                                             | No sales tax                                               |
| Customers cannot read orders       | Customers read their own completed orders           | The Rewards app needs purchase history                     |
| `audit_log.entity_id uuid`         | `text`                                              | Not every audited table has a uuid key                     |
