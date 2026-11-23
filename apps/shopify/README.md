# Bro Batch Rewards — Shopify app

The piece of Bro Batch that lives inside Shopify: the app configuration and a POS UI extension
that adds a **Bro Batch Rewards** tile to Shopify POS.

**Status: builds and is tested; never run on a device.** Shopify CLI builds the extension, its
calls to Shopify POS are type-checked against Shopify's definitions, and its two screens are
tested in Shopify's extension tester. It has not been deployed to a Shopify app or opened in
Shopify POS, so how it looks and how a real cart and camera behave are unseen. See
`docs/SHOPIFY.md`, "Not yet verified".

## What the tile does

1. The cashier taps **Bro Batch Rewards** and scans the customer's membership QR code.
2. The member is attached to the cart, so the sale earns them points.
3. The cashier taps a reward the member can afford and the item it pays for.
4. The backend debits the points and returns a single-use Shopify discount code, which the
   extension applies to the cart. Shopify enforces the code: one use, that customer, that product.
5. If the reward is removed before payment, the code is deleted and the points go back. This
   still works after the screen was closed and opened again: the backend reports the reward the
   member is holding.

## Layout

```
shopify.app.toml                       app name, access scopes, webhook subscriptions
extensions/loyalty-pos/
  shopify.extension.toml               where the extension appears in POS
  shopify.d.ts                         which Shopify POS API each screen is given
  src/Tile.tsx                         the home-screen tile
  src/Modal.tsx                        the rewards screen
  src/api.ts                           calls to the Bro Batch backend
  src/logic.ts                         display logic
  src/config.ts                        the backend URL (public, not a secret)
  tests/                               the two screens, run in Shopify's extension tester
```

Nothing in an extension is private: its code is delivered to the device. It holds no secrets and
makes no decisions about points or prices.

## Commands

```bash
pnpm --filter @brobatch/shopify test        # logic, API client and screen tests
pnpm --filter @brobatch/shopify typecheck   # includes the screens' calls to Shopify POS
pnpm --filter @brobatch/shopify build       # Shopify CLI bundles the extension (no login needed)
```

## Before it can run

The placeholders (`REPLACE_WITH_...` in `shopify.app.toml` and `src/config.ts`) must be replaced
and the app deployed. The steps are in `docs/RUNBOOK.md`, "Connect Shopify"; the **Deploy**
workflow on GitHub does the deploying.
