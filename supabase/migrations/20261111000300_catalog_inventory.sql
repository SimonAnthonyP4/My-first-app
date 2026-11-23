-- Bro Batch M1 — product catalog and inventory.
--
-- Products are never deleted, only deactivated, so past orders stay readable.
-- Stock is an append-only ledger (inventory_movements); inventory_levels is a
-- cache of its sum, maintained by trigger and not writable directly.

create table public.products (
  id           uuid primary key default gen_random_uuid(),
  sku          text not null unique check (sku ~ '^[A-Z0-9][A-Z0-9-]{1,31}$'),
  name         text not null check (char_length(btrim(name)) between 1 and 120),
  flavor       text not null check (char_length(btrim(flavor)) between 1 and 60),
  category     text not null check (category in ('bar', 'three_pack', 'six_pack', 'other')),
  -- How many individual bars one unit of this product contains (3 for a
  -- three-pack, 0 for merchandise). Drives the "bars sold" metric.
  bar_count    integer not null default 1 check (bar_count between 0 and 100),
  description  text check (char_length(description) <= 2000),
  price_cents  bigint not null check (price_cents between 0 and 100000000),
  image_path   text check (char_length(image_path) <= 500),
  is_active    boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index products_active_sort_idx on public.products (sort_order, name) where is_active;

create table public.inventory_levels (
  product_id  uuid primary key references public.products (id) on delete restrict,
  -- May go negative: a physical bar on the shelf must stay sellable even when
  -- the count has drifted. Negative levels are a signal to recount.
  on_hand     integer not null default 0,
  reorder_at  integer not null default 0 check (reorder_at >= 0),
  updated_at  timestamptz not null default now()
);

create table public.inventory_movements (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products (id) on delete restrict,
  delta        integer not null check (delta <> 0),
  reason       text not null
                 check (reason in ('restock', 'sale', 'refund_restock', 'adjustment', 'waste', 'count')),
  -- Set for 'sale' and 'refund_restock'. Foreign key added with the orders table.
  order_id     uuid,
  employee_id  uuid references public.employees (id),
  note         text check (char_length(note) <= 500),
  created_at   timestamptz not null default now(),
  constraint inventory_movements_order_link
    check ((reason in ('sale', 'refund_restock')) = (order_id is not null)),
  constraint inventory_movements_direction
    check (
      (reason in ('restock', 'refund_restock') and delta > 0)
      or (reason in ('sale', 'waste') and delta < 0)
      or reason in ('adjustment', 'count')
    )
);

create index inventory_movements_product_idx
  on public.inventory_movements (product_id, created_at desc);
create index inventory_movements_order_idx
  on public.inventory_movements (order_id) where order_id is not null;
