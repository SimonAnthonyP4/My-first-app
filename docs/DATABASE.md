# Database reference

The migrations in `supabase/migrations` are the source of truth. This page explains what they set
up and how to work with them.

Shopify is the record of products, prices, stock, card payments and till staff. This database is
the record of the loyalty program, and keeps a read-only mirror of Shopify's paid orders and
refunds.

## Tables

| Table                    | Purpose                                                                  | Written by                  |
| ------------------------ | ------------------------------------------------------------------------ | --------------------------- |
| `customers`              | Rewards members, each linked to a Shopify customer                       | `register_customer()`; self |
| `employees`              | Dashboard users (owner, manager) and their roles                         | Server; owners edit         |
| `loyalty_accounts`       | Cached points balance per member                                         | Trigger only                |
| `loyalty_transactions`   | Append-only points ledger                                                | Server only                 |
| `rewards`                | Reward catalog, thresholds, and each reward's Shopify collection         | Managers                    |
| `redemptions`            | A member's claim on a reward, with its discount code                     | Server only                 |
| `orders`                 | Mirror of paid Shopify orders                                            | Server only                 |
| `order_items`            | Mirror of their line items                                               | Server only                 |
| `refunds`                | Mirror of Shopify refunds                                                | Server only                 |
| `refund_items`           | Which line items a refund covered                                        | Server only                 |
| `products`               | Reporting details for Shopify variants: flavor, pack type, bars per unit | Managers                    |
| `app_settings`           | One row: earn rate, reward hold time, test-order switch                  | Owners                      |
| `shopify_webhook_events` | One row per webhook delivery: the idempotency record                     | Server only                 |
| `audit_log`              | Append-only record of configuration changes                              | Trigger only                |
| `push_tokens`            | APNs device tokens                                                       | Members (own)               |

"Server" means the service role, used by the Edge Functions in `supabase/functions`.

There are no payment, card or stock tables. Shopify holds those.

## Invariants

Enforced by constraints and triggers, so they hold for every writer, including the service role.

**Money**

- All amounts are integer cents (`bigint`), never negative.
- `orders.total_cents = subtotal_cents − discount_cents − reward_cents`. `total_cents` is the
  goods actually paid for, which is what points are earned on. Tax and the grand total are stored
  separately and earn nothing.
- `order_items.line_total_cents = unit_price_cents × quantity`.
- A paid order has `paid_at`.
- No column can hold card or payment-provider data.

**Loyalty**

- `loyalty_accounts.balance` always equals the sum of that member's `loyalty_transactions`. A
  trigger applies each ledger insert to the balance under a row lock; nothing else can change it.
- The balance is never negative. A debit larger than the balance fails with SQLSTATE `BB001`.
- Ledger rows cannot be updated, deleted or truncated.
- A ledger insert the database skips (`ON CONFLICT DO NOTHING`) does not move the balance, and two
  rows for one member cannot be written in a single statement.
- An order earns at most once. A refund reverses at most once. A redemption is debited at most
  once and released at most once.
- A redemption moves from `reserved` to `fulfilled`, `released` or `expired` and then never
  changes. Its member, reward, cost and key never change. Redemptions cannot be deleted.
- Once a refund's point reversal is recorded it cannot be altered.

**Shopify**

- A Shopify order, refund, line item or webhook delivery is mirrored at most once (unique ids).
- A member is linked to at most one Shopify customer, and a Shopify customer to at most one member.
- A discount code belongs to exactly one redemption.
- Shopify ids are stored as `bigint` and never pass through a JavaScript number.

**People**

- An auth user is a member or a dashboard user, never both.
- The last active owner cannot be demoted or deactivated.
- `customers.email` is copied from the auth user, never taken from client input.
- Membership codes are 32 random hex characters, not derived from anything personal.

**Audit**

- Every insert, update and delete on `employees`, `products`, `rewards` and `app_settings` writes
  an `audit_log` row with the actor, their role, and the before and after values. Audit rows
  cannot be changed.

## Who can do what

`anon` (not signed in) can do nothing: no table, no function.

| Table                                      | Member                            | Dashboard user (no manager role) | Manager             | Owner                             |
| ------------------------------------------ | --------------------------------- | -------------------------------- | ------------------- | --------------------------------- |
| `customers`                                | Own row; edit name, phone, opt-in | Lookup functions only            | Read all            | Read all                          |
| `employees`                                | —                                 | Own row                          | Read all            | Read all; edit name, role, active |
| `loyalty_accounts`, `loyalty_transactions` | Own                               | Lookup functions only            | Read all            | Read all                          |
| `rewards`                                  | Read live rewards                 | Read live rewards                | Read all; add; edit | Same as manager                   |
| `redemptions`                              | Own                               | Read all                         | Read all            | Read all                          |
| `orders`, `order_items`                    | Own completed orders              | Read all                         | Read all            | Read all                          |
| `refunds`, `refund_items`                  | —                                 | Read all                         | Read all            | Read all                          |
| `products`                                 | Read active                       | Read active                      | Read all; add; edit | Same as manager                   |
| `app_settings`                             | Read                              | Read                             | Read                | Read; edit                        |
| `shopify_webhook_events`                   | —                                 | —                                | —                   | Read                              |
| `audit_log`                                | —                                 | —                                | —                   | Read                              |
| `push_tokens`                              | Own: read, add, remove            | —                                | —                   | —                                 |

Nobody can delete products, rewards, members, dashboard users, orders or ledger rows.

Members cannot change their own `email`, `membership_code`, `shopify_customer_id` or `deleted_at`.

Till staff do not appear here: they sign in to Shopify, not to this database. The POS tile reaches
the database only through the Edge Functions.

## Functions

### Callable by signed-in users

| Function                                 | Caller         | What it does                                                                                                 |
| ---------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------ |
| `register_customer(name, phone, opt_in)` | Signed-in user | Creates the caller's member profile and loyalty account. Email comes from the auth user. Safe to call twice. |
| `lookup_customer_by_code(code)`          | Dashboard user | Finds a member by membership code. No email or phone.                                                        |
| `find_customer_by_contact(text)`         | Dashboard user | Exact match on email or phone, at most 5 rows.                                                               |
| `custom_access_token_hook(event)`        | Auth service   | Adds the `user_role` claim to access tokens.                                                                 |

### Service role only

| Function                    | What it does                                                              |
| --------------------------- | ------------------------------------------------------------------------- |
| `award_points_for_order`    | Awards points for a paid order, once.                                     |
| `reverse_points_for_refund` | Takes back earned points for a refund, capped at the balance.             |
| `redeem_points`             | Reserves a reward and debits its cost. Idempotent on the key.             |
| `release_redemption`        | Returns the points of an unfulfilled reservation.                         |
| `fulfill_redemption`        | Marks a reservation as honored on a paid order.                           |
| `ingest_shopify_order`      | Webhook `orders/paid`: mirror, link member, fulfil rewards, award points. |
| `ingest_shopify_refund`     | Webhook `refunds/create`: mirror, update order, reverse points.           |
| `pos_lookup_member`         | The member behind a scanned code, a Shopify customer id, or an id.        |
| `pos_rewards`               | The rewards the till can offer.                                           |
| `link_shopify_customer`     | Records which Shopify customer a member is. Once.                         |
| `reserve_reward_for_pos`    | Debits points and issues the single-use discount code.                    |
| `attach_reward_discount`    | Records the Shopify discount created for a redemption.                    |
| `expire_stale_redemptions`  | Returns the points of holds that lapsed. Run every five minutes.          |

Loyalty rules and examples: `LOYALTY.md`. Webhooks, the reward flow and endpoints: `SHOPIFY.md`.

## Running the tests

`make db-test` picks whichever setup is available.

**Plain PostgreSQL (no Docker).** Needs PostgreSQL 16, pgTAP and `pg_prove`:

```bash
# Ubuntu / Debian
sudo apt-get install postgresql-16 postgresql-16-pgtap libtap-parser-sourcehandler-pgtap-perl
sudo -u postgres psql -c "alter user postgres password 'postgres'"

make db-test-plain
```

`scripts/db-test.sh` creates a throwaway database, applies `scripts/db/supabase-shim.sql`
(stand-ins for the roles, `auth.users` and `auth.uid()` that Supabase provides, with Supabase's
permissive default grants), then every migration and the seed. It then runs the contract drift
check, the pgTAP suite, the concurrency test and the Edge Function integration test, and drops the
database. Connection settings come from `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`. Set `KEEP_DB=1`
to keep the database for inspection.

**Supabase local stack (Docker).**

```bash
make db-test-supabase     # supabase db start && supabase test db
```

This uses the real Supabase Postgres image and runs the pgTAP suite only. CI runs both setups.

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
5. If you changed a value list (a `CHECK ... IN (...)` or an enum) or a `BBnnn` error code, update
   `packages/contracts/src/enums.ts`. The drift check fails otherwise.
6. Run `make db-test`.

## Leftovers from the custom-till design

A few columns remain from before Shopify became the till. They are harmless and unused by the
Shopify path:

| Column                                                 | Now                                                                    |
| ------------------------------------------------------ | ---------------------------------------------------------------------- |
| `orders.employee_id`                                   | Null for Shopify orders. The Shopify staff id is in `shopify_user_id`. |
| `refunds.requested_by`, `approved_by`                  | Null. Shopify decides who may refund.                                  |
| `products.price_cents`, `sku`, `image_path`            | Optional notes only. Shopify holds the real catalog.                   |
| `order_status` values `pending`, `cancelled`, `failed` | Not used: only paid orders are mirrored.                               |

They can be removed in a later migration once the first real Shopify run confirms nothing needs
them.
