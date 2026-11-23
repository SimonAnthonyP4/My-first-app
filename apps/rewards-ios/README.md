# Bro Batch Rewards (iOS)

**Not built yet.** This is milestone S5, with push notifications in S6.

The customer-facing iPhone app: registration and sign-in, digital membership card with QR code,
live points balance, rewards catalog, purchase history and profile.

What already exists for it:

- The database and security rules, including `register_customer()` (`supabase/`).
- Shared rules it must follow: `packages/contracts` (the membership QR format, the points
  formula, validation rules).
- The till side: Shopify POS scans the QR this app shows (`apps/shopify`).

How it fits with Shopify: the app talks only to the Bro Batch backend, never to Shopify. A member
is matched to their Shopify customer by email the first time their QR is scanned at the till.

What it is waiting on:

- A connected Shopify development store (S3), so there are real sales to show.
- A Mac with Xcode, or a macOS CI runner, to build and test.
- Apple Developer Program membership (TestFlight, push notifications).

See `docs/PLAN.md`.
