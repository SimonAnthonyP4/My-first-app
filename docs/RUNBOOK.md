# Runbook

Operational steps. Sections marked **not done** describe work that needs an account or a decision
that only the business owner can provide.

## Local development

```bash
make setup      # pnpm install, enable .githooks
make test       # unit tests, Edge Function tests, database tests
make dev-admin  # admin placeholder on http://127.0.0.1:3000
```

The pre-commit hook checks formatting, lint and types, and refuses to commit `.env` files or
anything shaped like a Shopify client secret, an API key or a private key.

To run the whole backend locally you need Docker and the Supabase CLI (installed by
`pnpm install`):

```bash
pnpm exec supabase start      # Postgres, Auth, API, Studio on 127.0.0.1:54321-54323
pnpm exec supabase db reset   # re-apply all migrations and the seed
pnpm exec supabase stop
```

## Connect Shopify — not done

Nothing has been connected to Shopify yet. The owner has a Shopify account and Shopify POS; what
is still missing is a Supabase project, a Shopify app for this project, and four secrets. These
are the steps for the first real run (milestone S3 in `PLAN.md`).

Everything the owner does here can be done in a phone browser. Nothing needs a terminal: the
**Deploy** workflow on GitHub does the deploying.

**The Deploy workflow has never run against a real project.** Its commands follow the Shopify CLI
and Supabase CLI references; expect the first run to need a fix or two.

### Where to test first

Test on a **dev store**, not the live store. A dev store is a free practice store inside the same
Shopify organization: test sales stay out of the real store's orders, customers and reports, and
Shopify POS can sign in to it. When the acceptance run passes there, the same steps install the
app on the real store.

### 1. Create the accounts and the app (owner)

**Supabase**

1. Create a project at supabase.com. Choose a database password and keep it.
2. Note the project ref: the 20 letters in the project's URL (`https://<ref>.supabase.co`).
3. Create an access token in the account settings (Access Tokens).

**Shopify** — in the Dev Dashboard (dev.shopify.com/dashboard), signed in with the store's
account:

1. **Stores**: check the real store is listed. If it is not, the store is in a different
   organization and the backend will not be able to get API access to it; stop and sort that out
   first.
2. **Stores → Create store → Dev**: create the dev store. Note its `something.myshopify.com`
   domain.
3. **Apps → Create app → Start from Dev Dashboard**: name it `Bro Batch Rewards`.
4. In the app's **Settings**: note the **Client ID** (not secret) and the **Client secret**
   (secret).
5. Still in **Settings**, under **App CLI automation token → Manage**: add a service account with
   the **App development** permission for this app. Copy its token; it is shown once.

### 2. Fill in the three values that are not secret

The Client ID, the dev store's domain and the Supabase project ref go into the repository. They
are safe to share in chat.

| Value                | File                                                                |
| -------------------- | ------------------------------------------------------------------- |
| Shopify client ID    | `apps/shopify/shopify.app.toml` (`client_id`)                       |
| Supabase project ref | `apps/shopify/shopify.app.toml` (webhook `uri`)                     |
|                      | `apps/shopify/extensions/loyalty-pos/src/config.ts` (`BACKEND_URL`) |
|                      | `.github/workflows/deploy.yml` (`SUPABASE_PROJECT_REF`)             |
| Store domain         | `.github/workflows/deploy.yml` (`SHOPIFY_SHOP_DOMAIN`)              |

Each is a `REPLACE_WITH_...` placeholder today. The deploy refuses to run while any remains, or if
the project ref differs between files.

### 3. Add the four secrets on GitHub (owner)

Repository → Settings → Secrets and variables → Actions → New repository secret. Never paste
these into chat, an issue or a file.

| Secret name                     | Value                                    |
| ------------------------------- | ---------------------------------------- |
| `SUPABASE_ACCESS_TOKEN`         | The Supabase access token                |
| `SUPABASE_DB_PASSWORD`          | The Supabase project's database password |
| `SHOPIFY_CLIENT_SECRET`         | The Shopify app's client secret          |
| `SHOPIFY_SERVICE_ACCOUNT_TOKEN` | The service account token                |

### 4. Deploy

GitHub → Actions → **Deploy** → Run workflow, choosing one step each time, in this order.

GitHub only offers **Run workflow** for workflows on the default branch (`main`), and refuses to
start them any other way. Until the branch this work is on has been merged into `main`, the Deploy
workflow cannot be started.

| Step          | Does                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| `check-setup` | Changes nothing. Reports which values and secrets are missing.                                         |
| `shopify-app` | Tests the tile, then deploys the app: permissions, the two webhooks, the POS tile.                     |
|               | **Then install the app on the dev store**: Dev Dashboard → the app → Install app.                      |
| `backend`     | Applies the database migrations, sets the function secrets, deploys the functions, then runs `verify`. |
| `verify`      | Changes nothing. Checks the live backend and the store can talk to each other.                         |

`verify` passes when: the backend refuses unsigned requests; it accepts a webhook signed with the
client secret; Shopify issues the app an access token for the store; and the token carries every
permission the backend needs.

With a computer instead, the same deploy by hand:

```bash
pnpm exec supabase link --project-ref <ref>
pnpm exec supabase db push --remote          # migrations only; never push seed.sql
pnpm exec supabase secrets set SHOPIFY_SHOP_DOMAIN=<store>.myshopify.com \
  SHOPIFY_CLIENT_ID=<client id> SHOPIFY_CLIENT_SECRET=<client secret>
pnpm exec supabase functions deploy
(cd apps/shopify && pnpm exec shopify app deploy)
```

### 5. Settings in Supabase and Shopify (owner)

1. Supabase → SQL Editor. Check the reward-hold expiry is scheduled (the migrations enable
   `pg_cron` and schedule it):
   ```sql
   select jobname, schedule from cron.job where jobname = 'brobatch-expire-reward-holds';
   ```
   One row is expected. If there is none, enable `pg_cron` under Database → Extensions and run:
   ```sql
   select cron.schedule('brobatch-expire-reward-holds', '*/5 * * * *',
                        'select public.expire_stale_redemptions()');
   ```
2. For the dev store only, accept test orders (every order there is a test):
   ```sql
   update public.app_settings set accept_test_orders = true;
   ```
3. Shopify admin of the dev store: create a few products and a collection for the free bar (for
   example "Bars"). Tell the reward which collection it covers (the admin dashboard will do this
   in S4); the collection id is the number at the end of the collection's admin URL:
   ```sql
   update public.rewards set shopify_collection_id = <collection id>
   where name = 'Free protein bar';
   ```
4. Shopify admin: give the staff account that signs in to Shopify POS access to the Bro Batch
   Rewards app. Without it Shopify will not issue the tile an ID token.
5. Shopify POS on the iPhone: sign in to the dev store and add the **Bro Batch Rewards** tile to
   the home screen.

Later, for S4 and S5 (not needed for this run): Auth settings to match `supabase/config.toml`
(email confirmation on, minimum password length 10, anonymous sign-ins off), the access token hook
(Authentication → Hooks → Customize Access Token Claims → `public.custom_access_token_hook`), and
the Data API exposing only the `public` schema.

### 6. A test member

The Rewards app does not exist yet, so the first member is made by hand.

1. Supabase → Authentication → Users → Add user: an email address you can use as a customer in
   the dev store, any password, marked as confirmed.
2. SQL Editor:
   ```sql
   insert into public.customers (id, full_name, email)
   select id, 'Test Member', email from auth.users where email = '<that email>';

   select 'brobatch:member:' || membership_code as qr_text
   from public.customers where email = '<that email>';
   ```
3. Turn `qr_text` into a QR code with any QR generator and show it on a second screen.

### 7. The acceptance run

1. In Shopify POS, open the tile and scan the QR. The member's name and 0 points appear, and they
   become the customer on the cart.
2. Sell them at least $30.00 of products with a test payment. In the database the order is
   mirrored and the member has 10 points per dollar.
3. Start a new sale, add a bar, open the tile (the member's points and rewards appear), apply the
   free bar, and complete the sale. The redemption is `fulfilled`; points were awarded only on
   what was paid.
4. Start another sale with enough points, apply a reward, close the tile, open it again. The
   reward is shown as applied; remove it. The points return.
5. Refund the first order in Shopify. The refund is mirrored and the earned points are taken back.
6. Check `shopify_webhook_events` for anything `flagged`.

Record what happened in `SHOPIFY.md` under "Not yet verified", and fix what it turns up.

### Going live later

Repeat on the real store: the app installed there, `SHOPIFY_SHOP_DOMAIN` changed to the real
store's domain, a production Supabase project, `accept_test_orders` off. Tap to Pay on iPhone
needs the store to be on Shopify Payments.

## Deliveries that need a person

Some webhook deliveries are applied as far as is safe and then flagged:

```sql
select id, topic, resource_id, note, received_at
from shopify_webhook_events where status = 'flagged' order by received_at;
```

`SHOPIFY.md` lists what each note means.

## Create the first owner

Dashboard users cannot sign themselves up, and only an owner can manage them, so the first owner
is created by hand, once.

1. Supabase dashboard → Authentication → Users → Add user. Enter the owner's email and a strong
   password, and mark the email as confirmed.
2. SQL Editor:
   ```sql
   insert into public.employees (id, full_name, role)
   select id, 'Full Name Here', 'owner'
   from auth.users
   where email = 'owner@example.com';
   ```
3. The owner signs out and in again so their token picks up the role.

The database refuses to demote or deactivate the last active owner. Till staff are not created
here: they are Shopify POS staff.

## Secrets

| Secret                                                                  | Lives in                                          | Never in                      |
| ----------------------------------------------------------------------- | ------------------------------------------------- | ----------------------------- |
| Shopify client secret                                                   | Edge Function secrets; GitHub secret              | The POS tile, the apps, git   |
| Supabase service-role key                                               | Edge Function secrets, admin server env           | iOS app, `NEXT_PUBLIC_*`, git |
| Shopify service account token, Supabase access token, database password | GitHub secrets (used only by the Deploy workflow) | Chat, files, git              |
| APNs `.p8` key (later)                                                  | Edge Function secrets                             | Anywhere else                 |

Safe to ship in clients: the Supabase URL, the Supabase anon (publishable) key, the Shopify client
ID, and the backend URL in the POS tile.

Guards in place:

- `.gitignore` excludes `.env` and `.env.*` (except `.env.example`).
- The pre-commit hook blocks staged secrets.
- The admin build fails if a `NEXT_PUBLIC_*` variable contains a secret-shaped value.
- The POS tile's code is delivered to the device, so it contains no credentials by design.

If a secret is ever committed or exposed: rotate it at the provider first, then remove it from
history. Rotation is what makes it safe; deleting the commit is not enough. After rotating the
Shopify client secret, Shopify may sign webhooks with the old one for up to an hour.

## External accounts — not done

| Needed                                      | For              | Status                                        |
| ------------------------------------------- | ---------------- | --------------------------------------------- |
| Shopify account and Shopify POS             | S3               | Owner has them (not yet seen by this project) |
| Shopify app in the Dev Dashboard            | S3               | Not created                                   |
| Shopify dev store                           | S3               | Not created                                   |
| Supabase project (staging, then production) | S3               | Not created                                   |
| Four deploy secrets on GitHub               | S3               | Not set                                       |
| Shopify Payments on the real store          | S7 (go-live)     | Not confirmed                                 |
| Apple Developer Program membership          | S5 (Rewards app) | Not confirmed                                 |
| APNs key                                    | S6               | Not created                                   |
| Hosting and domain for the admin            | S4 deployment    | Not chosen                                    |

## CI

| Workflow      | Runs on                                       | Does                                                                                                                             |
| ------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `backend.yml` | Changes to `supabase/`, `scripts/`, contracts | Database tests on plain PostgreSQL (with the Edge Function integration test) and on the Supabase image; Edge Function unit tests |
| `web.yml`     | Changes to `apps/`, `packages/`               | Format check, lint, typecheck, unit tests (including the POS tile's screens), admin build, POS tile build with Shopify CLI       |
| `deploy.yml`  | Manual                                        | One deploy step per run: `check-setup`, `shopify-app`, `backend` or `verify`. Never runs on a push.                              |
| `ios.yml`     | Manual                                        | Placeholder until the Rewards app exists                                                                                         |
