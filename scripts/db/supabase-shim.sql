-- Minimal stand-in for the parts of Supabase our migrations depend on, so the
-- migrations and pgTAP tests can run on a plain PostgreSQL server (local
-- development without Docker, and the fast CI job).
--
-- This file is NEVER applied to a real Supabase project: Supabase already
-- provides all of this. It mirrors Supabase's defaults on purpose, including
-- the permissive default grants, so the tests prove our migrations lock
-- things down from the same starting point as production.

do $$
begin
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
  if not exists (select from pg_roles where rolname = 'supabase_auth_admin') then
    create role supabase_auth_admin nologin noinherit;
  end if;
end
$$;

create schema if not exists extensions;
grant usage on schema extensions to anon, authenticated, service_role;

create schema auth;
grant usage on schema auth to anon, authenticated, service_role, supabase_auth_admin;

create table auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              varchar(255) unique,
  raw_app_meta_data  jsonb,
  raw_user_meta_data jsonb,
  email_confirmed_at timestamptz,
  is_anonymous       boolean not null default false,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);
alter table auth.users owner to supabase_auth_admin;
grant all on auth.users to postgres;

create function auth.jwt() returns jsonb
language sql stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')
  )::jsonb
$$;

create function auth.uid() returns uuid
language sql stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

create function auth.role() returns text
language sql stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;

grant execute on function auth.jwt(), auth.uid(), auth.role()
  to anon, authenticated, service_role, supabase_auth_admin;

-- Supabase's defaults for the public schema.
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
