-- Bro Batch M1 — schemas, extensions and default privileges.
--
-- Security posture for everything that follows:
--   * `public` holds tables and the few RPCs clients may call.
--   * `private` holds helper and trigger functions. It is not exposed by the API.
--   * Nothing is reachable by `anon`. `authenticated` gets explicit grants only.

create schema if not exists extensions;
create extension if not exists citext with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- Supabase grants ALL on new objects in `public` to anon and authenticated by
-- default. Turn that off so a table added later is closed until a migration
-- opens it on purpose. (EXECUTE granted to PUBLIC is a global default and
-- cannot be removed per schema, so every function revokes it explicitly; the
-- privilege tests fail if one forgets.)
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;
