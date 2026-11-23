-- Rewards a member is holding right now.
--
-- A cashier applies a reward, closes the rewards screen to take payment, and
-- the customer changes their mind. When the screen is opened again it starts
-- from nothing, so it asks the backend: is this member holding a reward?
-- This function answers, so the screen can offer to remove it and return the
-- points instead of leaving them locked until the hold runs out.
--
-- Only holds the till can still act on are listed: reserved, carrying a
-- discount code that exists in Shopify, and not yet past their time limit.

create function public.pos_held_rewards(p_customer_id uuid)
returns table (
  id uuid,
  discount_code text,
  expires_at timestamptz,
  points_cost bigint,
  discount_cents bigint,
  reward_name text
)
language sql
stable
set search_path = ''
as $$
  select r.id, r.discount_code, r.expires_at, r.points_cost, r.discount_cents, w.name
  from public.redemptions r
  join public.rewards w on w.id = r.reward_id
  where r.customer_id = p_customer_id
    and r.status = 'reserved'
    and r.discount_code is not null
    and r.shopify_discount_id is not null
    and r.expires_at > now()
  order by r.created_at desc, r.id
$$;

revoke all on function public.pos_held_rewards(uuid) from public, anon, authenticated;
grant execute on function public.pos_held_rewards(uuid) to service_role;
