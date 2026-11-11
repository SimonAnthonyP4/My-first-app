# Runbook

Operational steps. Sections marked **not done** describe work that needs an account or a decision
that only the business owner can provide.

## Local development

```bash
make setup      # pnpm install, enable .githooks
make test       # unit tests + database tests
make dev-admin  # admin placeholder on http://127.0.0.1:3000
```

The pre-commit hook checks formatting, lint and types, and refuses to commit `.env` files or
anything shaped like a Stripe key, webhook secret or private key.

To run the whole backend locally you need Docker and the Supabase CLI (installed by
`pnpm install`):

```bash
pnpm exec supabase start      # Postgres, Auth, API, Studio on 127.0.0.1:54321-54323
pnpm exec supabase db reset   # re-apply all migrations and the seed
pnpm exec supabase stop
```

`supabase start` prints the local URL and keys. Copy `.env.example` to `.env` and paste the URL
and anon key there. The local keys are development-only values.

## Hosted Supabase project — not done

No hosted project exists yet. When one is created (a staging project first, then production):

1. Create the project in the Supabase dashboard. Record the project ref.
2. Link and push the schema:
   ```bash
   pnpm exec supabase link --project-ref <ref>
   pnpm exec supabase db push          # migrations only; never push seed.sql to production
   ```
3. **Enable the access token hook.** Dashboard → Authentication → Hooks → Customize Access Token
   (JWT) Claims → select `public.custom_access_token_hook`. Without this, tokens carry no
   `user_role` claim. Security is unaffected (policies read the database), but the apps will not
   know which screens to show.
4. **Auth settings to match `supabase/config.toml`:** email confirmation on, minimum password
   length 10, anonymous sign-ins off, secure password change on.
5. **Data API:** expose only the `public` schema. Do not expose `private`.
6. Create the first owner (next section).
7. Run the pgTAP suite against a staging project before trusting it:
   `pnpm exec supabase test db --remote`.

The migrations have been verified on PostgreSQL 16 with a shim, and applied with the Supabase CLI
(`supabase db push`) to that same database. They have **not yet been verified on a real Supabase
Postgres image**: the CI job that does this (`Database tests (Supabase local stack)`) is set up
but had not completed a run when this was written. Check that job is green before the first push,
and do the first push on staging.

## Create the first owner

Employees cannot sign themselves up, and only an owner can manage employees, so the first owner
is created by hand, once.

1. Dashboard → Authentication → Users → Add user. Enter the owner's email and a strong password,
   and mark the email as confirmed.
2. Dashboard → SQL Editor:
   ```sql
   insert into public.employees (id, full_name, role)
   select id, 'Full Name Here', 'owner'
   from auth.users
   where email = 'owner@example.com';
   ```
3. The owner signs out and in again so their token picks up the role.

After M4, further employees are added from the admin dashboard. The database refuses to demote or
deactivate the last active owner.

## Secrets

| Secret                        | Lives in                                | Never in                       |
| ----------------------------- | --------------------------------------- | ------------------------------ |
| Supabase service-role key     | Edge Function secrets, admin server env | iOS apps, `NEXT_PUBLIC_*`, git |
| Stripe secret key             | Edge Function secrets                   | iOS apps, browser, git         |
| Stripe webhook signing secret | Edge Function secrets                   | Anywhere else                  |
| APNs `.p8` key                | Edge Function secrets                   | Anywhere else                  |

Safe to ship in clients: the Supabase URL, the Supabase anon (publishable) key, and the Stripe
publishable key.

Guards in place:

- `.gitignore` excludes `.env` and `.env.*` (except `.env.example`).
- The pre-commit hook blocks staged secrets.
- The admin build fails if a `NEXT_PUBLIC_*` variable contains a secret-shaped value
  (`apps/admin/lib/env.ts`).

If a secret is ever committed or exposed: rotate it at the provider first, then remove it from
history. Rotation is what makes it safe; deleting the commit is not enough.

## External accounts — not done

| Needed                                 | For           | Status        |
| -------------------------------------- | ------------- | ------------- |
| Supabase project (staging, production) | Everything    | Not created   |
| Stripe account with Terminal enabled   | M3, M6        | Not created   |
| Apple Developer Program membership     | M5 onward     | Not confirmed |
| Tap to Pay on iPhone entitlement       | M6            | Not requested |
| APNs key                               | M8            | Not created   |
| Hosting and domain for the admin       | M4 deployment | Not chosen    |

## CI

| Workflow      | Runs on                                       | Does                                                         |
| ------------- | --------------------------------------------- | ------------------------------------------------------------ |
| `backend.yml` | Changes to `supabase/`, `scripts/`, contracts | Database tests on plain PostgreSQL and on the Supabase image |
| `web.yml`     | Changes to `apps/admin`, `packages/`          | Format check, lint, typecheck, unit tests, admin build       |
| `ios.yml`     | Manual                                        | Placeholder until the iOS apps exist                         |
