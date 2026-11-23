-- Bro Batch M1 — row-level security and privileges.
--
-- Model:
--   anon           nothing at all.
--   authenticated  explicit table grants below, narrowed per row by RLS.
--                  Who the caller is (customer / employee / manager / owner)
--                  is decided by private.is_staff() / is_manager() / is_owner(),
--                  which read the employees table on every check.
--   service_role   bypasses RLS. Used only by Edge Functions and the admin
--                  server. It is the sole writer of orders, payments, refunds,
--                  the loyalty ledger, redemptions and stripe_events.
--
-- Policies call helpers as `(select private.is_staff())` so Postgres evaluates
-- them once per statement instead of once per row.

-- ---------------------------------------------------------------------------
-- Start from zero.
-- ---------------------------------------------------------------------------

revoke all on all tables    in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;

grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;

alter table public.employees            enable row level security;
alter table public.customers            enable row level security;
alter table public.products             enable row level security;
alter table public.inventory_levels     enable row level security;
alter table public.inventory_movements  enable row level security;
alter table public.orders               enable row level security;
alter table public.order_items          enable row level security;
alter table public.payments             enable row level security;
alter table public.refunds              enable row level security;
alter table public.refund_items         enable row level security;
alter table public.loyalty_accounts     enable row level security;
alter table public.loyalty_transactions enable row level security;
alter table public.rewards              enable row level security;
alter table public.redemptions          enable row level security;
alter table public.app_settings         enable row level security;
alter table public.stripe_events        enable row level security;
alter table public.audit_log            enable row level security;
alter table public.push_tokens          enable row level security;

-- ---------------------------------------------------------------------------
-- employees
--   read:   yourself; managers and owners see all staff.
--   write:  owners may rename, change role, activate/deactivate.
--   create: service role only (needs an auth user first).
-- ---------------------------------------------------------------------------

grant select on public.employees to authenticated;
grant update (full_name, role, is_active) on public.employees to authenticated;

create policy employees_select on public.employees
  for select to authenticated
  using (id = (select auth.uid()) or (select private.is_manager()));

create policy employees_update_owner on public.employees
  for update to authenticated
  using ((select private.is_owner()))
  with check ((select private.is_owner()));

create policy employees_select_auth_admin on public.employees
  for select to supabase_auth_admin
  using (true);

-- ---------------------------------------------------------------------------
-- customers
--   read:   your own profile; managers and owners see all customers.
--           Cashiers use lookup_customer_by_code / find_customer_by_contact.
--   write:  your own name, phone and marketing preference. Nothing else.
--   create: register_customer() only.
-- ---------------------------------------------------------------------------

grant select on public.customers to authenticated;
grant update (full_name, phone, marketing_opt_in) on public.customers to authenticated;

create policy customers_select on public.customers
  for select to authenticated
  using (
    (id = (select auth.uid()) and deleted_at is null)
    or (select private.is_manager())
  );

create policy customers_update_self on public.customers
  for update to authenticated
  using (id = (select auth.uid()) and deleted_at is null)
  with check (id = (select auth.uid()) and deleted_at is null);

create policy customers_select_auth_admin on public.customers
  for select to supabase_auth_admin
  using (true);

-- ---------------------------------------------------------------------------
-- products
--   read:   active products for everyone signed in; managers see inactive too.
--   write:  managers and owners. No deletes: deactivate instead.
-- ---------------------------------------------------------------------------

grant select on public.products to authenticated;
grant insert (sku, name, flavor, category, bar_count, description, price_cents, image_path, is_active, sort_order)
  on public.products to authenticated;
grant update (sku, name, flavor, category, bar_count, description, price_cents, image_path, is_active, sort_order)
  on public.products to authenticated;

create policy products_select on public.products
  for select to authenticated
  using (is_active or (select private.is_manager()));

create policy products_insert_manager on public.products
  for insert to authenticated
  with check ((select private.is_manager()));

create policy products_update_manager on public.products
  for update to authenticated
  using ((select private.is_manager()))
  with check ((select private.is_manager()));

-- ---------------------------------------------------------------------------
-- inventory
--   levels:    staff read; managers set the reorder point.
--   movements: managers read and record manual movements in their own name.
--              'sale' and 'refund_restock' are written by the server only.
-- ---------------------------------------------------------------------------

grant select on public.inventory_levels to authenticated;
grant update (reorder_at) on public.inventory_levels to authenticated;

create policy inventory_levels_select_staff on public.inventory_levels
  for select to authenticated
  using ((select private.is_staff()));

create policy inventory_levels_update_manager on public.inventory_levels
  for update to authenticated
  using ((select private.is_manager()))
  with check ((select private.is_manager()));

grant select on public.inventory_movements to authenticated;
grant insert (product_id, delta, reason, note, employee_id) on public.inventory_movements to authenticated;

create policy inventory_movements_select_manager on public.inventory_movements
  for select to authenticated
  using ((select private.is_manager()));

create policy inventory_movements_insert_manager on public.inventory_movements
  for insert to authenticated
  with check (
    (select private.is_manager())
    and employee_id = (select auth.uid())
    and reason in ('restock', 'adjustment', 'waste', 'count')
  );

-- ---------------------------------------------------------------------------
-- orders, order_items, payments, refunds, refund_items
--   read:   staff see all; customers see their own completed orders and items.
--   write:  nobody but the service role.
-- ---------------------------------------------------------------------------

grant select on public.orders to authenticated;
grant select on public.order_items to authenticated;
grant select on public.payments to authenticated;
grant select on public.refunds to authenticated;
grant select on public.refund_items to authenticated;

create policy orders_select on public.orders
  for select to authenticated
  using (
    (select private.is_staff())
    or (
      customer_id = (select auth.uid())
      and status in ('paid', 'partially_refunded', 'refunded')
    )
  );

-- Items are visible exactly when their order is: the subquery runs under the
-- caller's own RLS on orders.
create policy order_items_select on public.order_items
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_items.order_id));

create policy payments_select_staff on public.payments
  for select to authenticated
  using ((select private.is_staff()));

create policy refunds_select_staff on public.refunds
  for select to authenticated
  using ((select private.is_staff()));

create policy refund_items_select_staff on public.refund_items
  for select to authenticated
  using ((select private.is_staff()));

-- ---------------------------------------------------------------------------
-- loyalty
--   accounts, ledger: your own; managers and owners see all.
--   rewards:          live rewards for everyone signed in; managers manage.
--   redemptions:      your own; staff see all (to honor them at the till).
--   Points only ever move through server-side functions.
-- ---------------------------------------------------------------------------

grant select on public.loyalty_accounts to authenticated;
grant select on public.loyalty_transactions to authenticated;
grant select on public.redemptions to authenticated;

create policy loyalty_accounts_select on public.loyalty_accounts
  for select to authenticated
  using (customer_id = (select auth.uid()) or (select private.is_manager()));

create policy loyalty_transactions_select on public.loyalty_transactions
  for select to authenticated
  using (customer_id = (select auth.uid()) or (select private.is_manager()));

create policy redemptions_select on public.redemptions
  for select to authenticated
  using (customer_id = (select auth.uid()) or (select private.is_staff()));

grant select on public.rewards to authenticated;
grant insert (name, description, points_cost, grants_category, product_id, quantity, is_active, starts_at, ends_at, sort_order)
  on public.rewards to authenticated;
grant update (name, description, points_cost, grants_category, product_id, quantity, is_active, starts_at, ends_at, sort_order)
  on public.rewards to authenticated;

create policy rewards_select on public.rewards
  for select to authenticated
  using (
    (
      is_active
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at > now())
    )
    or (select private.is_manager())
  );

create policy rewards_insert_manager on public.rewards
  for insert to authenticated
  with check ((select private.is_manager()));

create policy rewards_update_manager on public.rewards
  for update to authenticated
  using ((select private.is_manager()))
  with check ((select private.is_manager()));

-- ---------------------------------------------------------------------------
-- app_settings: everyone signed in may read; owners may change.
-- ---------------------------------------------------------------------------

grant select on public.app_settings to authenticated;
grant update (points_per_dollar, refund_approval_threshold_cents) on public.app_settings to authenticated;

create policy app_settings_select on public.app_settings
  for select to authenticated
  using (true);

create policy app_settings_update_owner on public.app_settings
  for update to authenticated
  using ((select private.is_owner()))
  with check ((select private.is_owner()));

-- ---------------------------------------------------------------------------
-- audit_log: owners read. stripe_events: service role only (no grants).
-- ---------------------------------------------------------------------------

grant select on public.audit_log to authenticated;

create policy audit_log_select_owner on public.audit_log
  for select to authenticated
  using ((select private.is_owner()));

-- ---------------------------------------------------------------------------
-- push_tokens: customers manage the tokens of their own devices.
-- ---------------------------------------------------------------------------

grant select, delete on public.push_tokens to authenticated;
grant insert (customer_id, token, platform) on public.push_tokens to authenticated;

create policy push_tokens_select_own on public.push_tokens
  for select to authenticated
  using (customer_id = (select auth.uid()));

create policy push_tokens_insert_own on public.push_tokens
  for insert to authenticated
  with check (customer_id = (select auth.uid()));

create policy push_tokens_delete_own on public.push_tokens
  for delete to authenticated
  using (customer_id = (select auth.uid()));
