-- Sandbox catalog for local development and tests. NOT production data.
-- Flavors, prices and stock here are placeholders until the real catalog is
-- entered through the admin dashboard.
--
-- The three launch rewards and the settings row are created by migrations,
-- because production needs them too.
--
-- Staff accounts are not seeded: creating a login needs the Auth service.
-- See docs/RUNBOOK.md, "Create the first owner".

insert into public.products (sku, name, flavor, category, bar_count, price_cents, sort_order)
values
  ('BAR-CHOC-PB',  'Chocolate Peanut Butter Bar',        'Chocolate Peanut Butter', 'bar',        1,  300, 10),
  ('BAR-COOKIES',  'Cookies & Cream Bar',                'Cookies & Cream',         'bar',        1,  300, 20),
  ('BAR-CARAMEL',  'Salted Caramel Bar',                 'Salted Caramel',          'bar',        1,  300, 30),
  ('BAR-BDAY',     'Birthday Cake Bar',                  'Birthday Cake',           'bar',        1,  300, 40),
  ('3PK-CHOC-PB',  'Chocolate Peanut Butter Three-Pack', 'Chocolate Peanut Butter', 'three_pack', 3,  850, 50),
  ('3PK-COOKIES',  'Cookies & Cream Three-Pack',         'Cookies & Cream',         'three_pack', 3,  850, 60),
  ('6PK-VARIETY',  'Variety Six-Pack',                   'Variety',                 'six_pack',   6, 1600, 70)
on conflict (sku) do nothing;

insert into public.inventory_movements (product_id, delta, reason, note)
select p.id, 48, 'restock', 'Sandbox opening stock'
from public.products p
where not exists (
  select 1 from public.inventory_movements m where m.product_id = p.id
);

update public.inventory_levels set reorder_at = 12 where reorder_at = 0;
