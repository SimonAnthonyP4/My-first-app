# Bro Batch POS (iOS)

**Not built yet.** This is milestone M5 (app without card payments) and M6 (Tap to Pay).

The employee-facing iPhone app: sign-in, catalog, cart, customer QR scan and lookup, discounts,
reward redemption, checkout, transaction history, refunds and inventory.

What already exists for it:

- The database, security rules and customer-lookup functions (`supabase/`).
- Shared rules it must follow: `packages/contracts` (money in integer cents, the points formula,
  the membership QR format, enum values).

What it is waiting on:

- M2 (loyalty engine) and M3 (payments backend).
- A Mac with Xcode, or a macOS CI runner, to build and test.
- For M6: Apple Developer Program membership and Apple's Tap to Pay on iPhone entitlement.

See `docs/PLAN.md` for the full plan.
