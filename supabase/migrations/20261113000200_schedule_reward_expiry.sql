-- Make sure unused reward holds are returned on a schedule.
--
-- The Shopify migration schedules public.expire_stale_redemptions() only if
-- pg_cron was already enabled, which on a new Supabase project it is not: the
-- job would silently never exist and points on abandoned rewards would stay
-- debited. This enables pg_cron where the server offers it and (re)creates
-- the job, so a plain `supabase db push` is enough.
--
-- Where pg_cron cannot be enabled (plain PostgreSQL in the fast test job),
-- nothing is scheduled and a notice says so.

do $$
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_cron is not available here (%). Reward holds will not expire on their own: schedule public.expire_stale_redemptions() another way.', sqlerrm;
  end;

  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- Same name as before, so this replaces the job rather than adding one.
    perform cron.schedule(
      'brobatch-expire-reward-holds', '*/5 * * * *',
      'select public.expire_stale_redemptions()'
    );
  end if;
end
$$;
