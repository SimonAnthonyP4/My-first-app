# Bro Batch Rewards — Shopify app

The piece of Bro Batch that lives inside Shopify: the app configuration and a POS UI extension
that adds a **Bro Batch Rewards** tile to Shopify POS.

**Status: written, not yet run.** No Shopify store or app exists for this project yet, so the
extension has never been built by Shopify CLI or opened on a device. The backend it talks to is
tested (see `docs/SHOPIFY.md`); the screens in `src/*.jsx` are not.

## What the tile does

1. The cashier taps **Bro Batch Rewards** and scans the customer's membership QR code.
2. The member is attached to the cart, so the sale earns them points.
3. The cashier taps a reward the member can afford and the item it pays for.
4. The backend debits the points and returns a single-use Shopify discount code, which the
   extension applies to the cart. Shopify enforces the code: one use, that customer, that product.
5. If the reward is removed before payment, the code is deleted and the points go back.

## Layout

```
shopify.app.toml                       app name, access scopes, webhook subscriptions
extensions/loyalty-pos/
  shopify.extension.toml               where the extension appears in POS
  src/Tile.jsx                         the home-screen tile
  src/Modal.jsx                        the rewards screen
  src/api.ts                           calls to the Bro Batch backend (tested)
  src/logic.ts                         display logic (tested)
  src/config.ts                        the backend URL (public, not a secret)
```

Nothing in an extension is private: its code is delivered to the device. It holds no secrets and
makes no decisions about points or prices.

## Before it can run

Three placeholders must be replaced (`REPLACE_WITH_...` in `shopify.app.toml` and
`src/config.ts`). The steps are in `docs/RUNBOOK.md`, "Connect Shopify".

```bash
pnpm --filter @brobatch/shopify test        # logic and API client tests
```
