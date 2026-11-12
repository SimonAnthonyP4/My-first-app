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

Nothing has been connected to Shopify. These are the steps for the first real run (milestone S3
in `PLAN.md`), on a development store. Do them in this order.

### 1. Supabase project

1. Create a Supabase project (staging). Record the project ref.
2. Push the schema and deploy the functions:
   ```bash
   pnpm exec supabase link --project-ref <ref>
   pnpm exec supabase db push          # migrations only; never push seed.sql to production
   pnpm exec supabase functions deploy
   ```
3. Auth settings to match `supabase/config.toml`: email confirmation on, minimum password length
   10, anonymous sign-ins off. Enable the access token hook (Authentication → Hooks → Customize
   Access Token Claims → `public.custom_access_token_hook`).
4. Data API: expose only the `public` schema.
5. Check the reward-hold expiry is scheduled. The migration schedules it when `pg_cron` is
   enabled (Database → Extensions → pg_cron, before pushing):
   ```sql
   select jobname, schedule from cron.job where jobname = 'brobatch-expire-reward-holds';
   ```
   If the row is missing, enable `pg_cron` and run:
   ```sql
   select cron.schedule('brobatch-expire-reward-holds', '*/5 * * * *',
                        'select public.expire_stale_redemptions()');
   ```
6. For a development store only, accept test orders (every order there is a test):
   ```sql
   update public.app_settings set accept_test_orders = true;
   ```

### 2. Shopify app and development store

1. In the Shopify Dev Dashboard, create a development store and an app **in the same
   organization**. The backend gets its API access with the client credentials grant, which only
   works when the app and the store belong to the same organization.
2. In `apps/shopify/shopify.app.toml`, replace `REPLACE_WITH_SHOPIFY_CLIENT_ID` with the app's
   client ID, and both `REPLACE_WITH_PROJECT_REF` with the Supabase project ref. In
   `apps/shopify/extensions/loyalty-pos/src/config.ts`, replace the same placeholder. None of
   these values is secret.
3. With Shopify CLI installed, from `apps/shopify`:
   ```bash
   shopify app deploy     # registers the scopes, the two webhook subscriptions and the POS tile
   ```
   Then install the app on the development store.
4. Set the backend's secrets. They are entered once and never committed:
   ```bash
   pnpm exec supabase secrets set SHOPIFY_SHOP_DOMAIN=<store>.myshopify.com \
     SHOPIFY_CLIENT_ID=<client id> SHOPIFY_CLIENT_SECRET=<client secret>
   ```
5. In Shopify admin, give the staff account that signs in to Shopify POS access to the Bro Batch
   Rewards app. Without it Shopify will not issue the tile an ID token.
6. Install Shopify POS on an iPhone, sign in to the development store, and add the **Bro Batch
   Rewards** tile to the home screen.

### 3. Set up the catalog and a reward

1. In Shopify, create the products and a collection for each kind of reward item (for example
   "Bars").
2. Tell the free-bar reward which collection it covers (the admin dashboard will do this in S4):
   ```sql
   update public.rewards set shopify_collection_id = <collection id>
   where name = 'Free protein bar';
   ```

### 4. The acceptance run

With a member account registered (through the Rewards app once it exists, or `register_customer`
for now) and given some points:

1. Scan the member's QR in the tile. Their name and points appear; they are attached to the cart.
2. Add a bar, apply the free-bar reward, and complete the sale with a test payment.
3. In the database: the order is mirrored, the redemption is `fulfilled`, and points were awarded
   on what was paid.
4. Refund the order in Shopify. The refund is mirrored and the earned points are taken back.
5. Check `shopify_webhook_events` for anything `flagged`.

Record what happened in `SHOPIFY.md` under "Not yet verified", and fix what it turns up.

### Going live later

Repeat with the real store: a Shopify plan with Shopify Payments activated (needed for Tap to Pay
on iPhone), a production Supabase project, `accept_test_orders` off, and the app installed on the
real store.

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

| Secret                    | Lives in                                | Never in                      |
| ------------------------- | --------------------------------------- | ----------------------------- |
| Shopify client secret     | Edge Function secrets                   | The POS tile, the apps, git   |
| Supabase service-role key | Edge Function secrets, admin server env | iOS app, `NEXT_PUBLIC_*`, git |
| APNs `.p8` key (later)    | Edge Function secrets                   | Anywhere else                 |

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

| Needed                                      | For              | Status        |
| ------------------------------------------- | ---------------- | ------------- |
| Shopify account, Dev Dashboard organization | S3               | Not created   |
| Shopify development store                   | S3               | Not created   |
| Supabase project (staging, then production) | S3               | Not created   |
| Shopify plan with Shopify Payments          | S7 (go-live)     | Not chosen    |
| Apple Developer Program membership          | S5 (Rewards app) | Not confirmed |
| APNs key                                    | S6               | Not created   |
| Hosting and domain for the admin            | S4 deployment    | Not chosen    |

## CI

| Workflow      | Runs on                                       | Does                                                                                                                             |
| ------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `backend.yml` | Changes to `supabase/`, `scripts/`, contracts | Database tests on plain PostgreSQL (with the Edge Function integration test) and on the Supabase image; Edge Function unit tests |
| `web.yml`     | Changes to `apps/`, `packages/`               | Format check, lint, typecheck, unit tests, admin build                                                                           |
| `ios.yml`     | Manual                                        | Placeholder until the Rewards app exists                                                                                         |
