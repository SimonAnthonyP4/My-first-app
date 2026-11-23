-- Bro Batch M1 — triggers that enforce invariants no caller can skip.
--
-- These fire for every writer, including the service role, so a bug in an
-- Edge Function cannot corrupt the ledgers.

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.employees
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.customers
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.products
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.inventory_levels
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.payments
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.rewards
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.redemptions
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.loyalty_accounts
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Append-only tables
-- ---------------------------------------------------------------------------

create function private.forbid_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% on %.% is not allowed: the table is append-only',
    tg_op, tg_table_schema, tg_table_name
    using errcode = 'restrict_violation';
end;
$$;

create trigger append_only_rows before update or delete on public.loyalty_transactions
  for each row execute function private.forbid_mutation();
create trigger append_only_truncate before truncate on public.loyalty_transactions
  for each statement execute function private.forbid_mutation();

create trigger append_only_rows before update or delete on public.inventory_movements
  for each row execute function private.forbid_mutation();
create trigger append_only_truncate before truncate on public.inventory_movements
  for each statement execute function private.forbid_mutation();

create trigger append_only_rows before update or delete on public.audit_log
  for each row execute function private.forbid_mutation();
create trigger append_only_truncate before truncate on public.audit_log
  for each statement execute function private.forbid_mutation();

-- ---------------------------------------------------------------------------
-- Identity: an auth user is a customer or an employee, never both.
-- ---------------------------------------------------------------------------

create function private.enforce_single_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Serialise the two possible inserts for the same auth user.
  perform pg_advisory_xact_lock(hashtextextended('brobatch.identity:' || new.id::text, 0));

  if tg_table_name = 'customers'
     and exists (select 1 from public.employees e where e.id = new.id) then
    raise exception 'user % is an employee and cannot also be a customer', new.id
      using errcode = 'unique_violation';
  end if;

  if tg_table_name = 'employees'
     and exists (select 1 from public.customers c where c.id = new.id) then
    raise exception 'user % is a customer and cannot also be an employee', new.id
      using errcode = 'unique_violation';
  end if;

  return new;
end;
$$;

create trigger enforce_single_identity before insert on public.customers
  for each row execute function private.enforce_single_identity();
create trigger enforce_single_identity before insert on public.employees
  for each row execute function private.enforce_single_identity();

-- There must always be at least one active owner, or nobody can administer
-- the business.
create function private.protect_last_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'owner' and old.is_active
     and (tg_op = 'DELETE' or new.role <> 'owner' or not new.is_active) then
    -- Lock the active owners so two concurrent demotions cannot both pass.
    perform 1 from public.employees e
      where e.role = 'owner' and e.is_active
      for update;

    if not exists (
      select 1 from public.employees e
      where e.role = 'owner' and e.is_active and e.id <> old.id
    ) then
      raise exception 'cannot remove the last active owner'
        using errcode = 'restrict_violation';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger protect_last_owner before update or delete on public.employees
  for each row execute function private.protect_last_owner();

-- Keep customers.email equal to the verified address in auth.users.
create function private.sync_customer_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is not null then
    update public.customers c
      set email = new.email
      where c.id = new.id
        and c.deleted_at is null
        and c.email is distinct from new.email;
  end if;
  return new;
end;
$$;

create trigger brobatch_sync_customer_email
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function private.sync_customer_email();

-- ---------------------------------------------------------------------------
-- Loyalty: every customer has an account; the ledger owns the balance.
-- ---------------------------------------------------------------------------

create function private.create_loyalty_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.loyalty_accounts (customer_id) values (new.id);
  return new;
end;
$$;

create trigger create_loyalty_account after insert on public.customers
  for each row execute function private.create_loyalty_account();

-- Applies a ledger row to the cached balance, under a lock on the account so
-- concurrent writers queue up. Rejects any row that would overdraw.
create function private.apply_loyalty_transaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance bigint;
begin
  select a.balance into v_balance
  from public.loyalty_accounts a
  where a.customer_id = new.customer_id
  for update;

  if not found then
    raise exception 'no loyalty account for customer %', new.customer_id
      using errcode = 'foreign_key_violation';
  end if;

  if v_balance + new.points < 0 then
    raise exception 'insufficient points: balance is %, change is %', v_balance, new.points
      using errcode = 'BB001';
  end if;

  new.balance_after := v_balance + new.points;

  perform set_config('brobatch.ledger_write', 'on', true);
  update public.loyalty_accounts a
    set balance = new.balance_after,
        lifetime_earned = a.lifetime_earned
          + case when new.kind = 'earn' then new.points else 0 end
    where a.customer_id = new.customer_id;
  perform set_config('brobatch.ledger_write', 'off', true);

  return new;
end;
$$;

create trigger apply_loyalty_transaction before insert on public.loyalty_transactions
  for each row execute function private.apply_loyalty_transaction();

-- The balance may only change through the ledger trigger above.
create function private.guard_loyalty_account()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'loyalty accounts cannot be deleted'
      using errcode = 'restrict_violation';
  end if;

  if tg_op = 'INSERT' then
    if new.balance <> 0 or new.lifetime_earned <> 0 then
      raise exception 'loyalty accounts must start at zero; credit points through the ledger'
        using errcode = 'restrict_violation';
    end if;
    return new;
  end if;

  if (new.balance is distinct from old.balance
      or new.lifetime_earned is distinct from old.lifetime_earned
      or new.customer_id is distinct from old.customer_id)
     and coalesce(current_setting('brobatch.ledger_write', true), 'off') <> 'on' then
    raise exception 'loyalty balances change only through loyalty_transactions'
      using errcode = 'restrict_violation';
  end if;

  return new;
end;
$$;

create trigger guard_loyalty_account before insert or update or delete on public.loyalty_accounts
  for each row execute function private.guard_loyalty_account();

-- ---------------------------------------------------------------------------
-- Inventory: every product has a level row; movements own on_hand.
-- ---------------------------------------------------------------------------

create function private.create_inventory_level()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.inventory_levels (product_id) values (new.id);
  return new;
end;
$$;

create trigger create_inventory_level after insert on public.products
  for each row execute function private.create_inventory_level();

create function private.apply_inventory_movement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rows integer;
begin
  perform set_config('brobatch.inventory_write', 'on', true);
  update public.inventory_levels l
    set on_hand = l.on_hand + new.delta
    where l.product_id = new.product_id;
  get diagnostics v_rows = row_count;
  perform set_config('brobatch.inventory_write', 'off', true);

  if v_rows = 0 then
    raise exception 'no inventory level for product %', new.product_id
      using errcode = 'foreign_key_violation';
  end if;

  return new;
end;
$$;

create trigger apply_inventory_movement after insert on public.inventory_movements
  for each row execute function private.apply_inventory_movement();

create function private.guard_inventory_level()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'inventory levels cannot be deleted'
      using errcode = 'restrict_violation';
  end if;

  if tg_op = 'INSERT' then
    if new.on_hand <> 0 then
      raise exception 'inventory levels must start at zero; add stock through inventory_movements'
        using errcode = 'restrict_violation';
    end if;
    return new;
  end if;

  if (new.on_hand is distinct from old.on_hand
      or new.product_id is distinct from old.product_id)
     and coalesce(current_setting('brobatch.inventory_write', true), 'off') <> 'on' then
    raise exception 'on_hand changes only through inventory_movements'
      using errcode = 'restrict_violation';
  end if;

  return new;
end;
$$;

create trigger guard_inventory_level before insert or update or delete on public.inventory_levels
  for each row execute function private.guard_inventory_level();

-- ---------------------------------------------------------------------------
-- Audit trail for staff-managed configuration.
-- ---------------------------------------------------------------------------

-- Generic row audit. tg_argv[0] is the name of the primary key column.
create function private.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
begin
  if tg_op = 'UPDATE'
     and (v_old - 'updated_at' - 'updated_by') = (v_new - 'updated_at' - 'updated_by') then
    return null;
  end if;

  insert into public.audit_log (actor_id, actor_role, action, entity, entity_id, before, after)
  values (
    auth.uid(),
    coalesce(private.staff_role(), auth.jwt() ->> 'role', 'system'),
    tg_table_name || '.' || lower(tg_op),
    tg_table_name,
    coalesce(v_new, v_old) ->> tg_argv[0],
    v_old,
    v_new
  );
  return null;
end;
$$;

create trigger audit_row after insert or update or delete on public.employees
  for each row execute function private.audit_row('id');
create trigger audit_row after insert or update or delete on public.products
  for each row execute function private.audit_row('id');
create trigger audit_row after insert or update or delete on public.rewards
  for each row execute function private.audit_row('id');
create trigger audit_row after insert or update or delete on public.app_settings
  for each row execute function private.audit_row('id');

-- Manual stock changes are audited through inventory_movements itself (who,
-- what, why); reorder points are configuration and go to the audit log.
create trigger audit_row after update of reorder_at on public.inventory_levels
  for each row execute function private.audit_row('product_id');

create function private.stamp_updated_by()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  -- Only an active employee is recorded; service-role writes leave it null.
  new.updated_by := (
    select e.id from public.employees e where e.id = auth.uid() and e.is_active
  );
  return new;
end;
$$;

create trigger stamp_updated_by before update on public.app_settings
  for each row execute function private.stamp_updated_by();

-- The settings row is created once by migration and must stay a single row.
create function private.forbid_settings_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'app_settings cannot be deleted'
    using errcode = 'restrict_violation';
end;
$$;

create trigger forbid_settings_delete before delete on public.app_settings
  for each row execute function private.forbid_settings_delete();

-- Trigger functions are never called directly.
revoke all on function private.set_updated_at()            from public, anon, authenticated;
revoke all on function private.forbid_mutation()           from public, anon, authenticated;
revoke all on function private.enforce_single_identity()   from public, anon, authenticated;
revoke all on function private.protect_last_owner()        from public, anon, authenticated;
revoke all on function private.sync_customer_email()       from public, anon, authenticated;
revoke all on function private.create_loyalty_account()    from public, anon, authenticated;
revoke all on function private.apply_loyalty_transaction() from public, anon, authenticated;
revoke all on function private.guard_loyalty_account()     from public, anon, authenticated;
revoke all on function private.create_inventory_level()    from public, anon, authenticated;
revoke all on function private.apply_inventory_movement()  from public, anon, authenticated;
revoke all on function private.guard_inventory_level()     from public, anon, authenticated;
revoke all on function private.audit_row()                 from public, anon, authenticated;
revoke all on function private.stamp_updated_by()          from public, anon, authenticated;
revoke all on function private.forbid_settings_delete()    from public, anon, authenticated;
