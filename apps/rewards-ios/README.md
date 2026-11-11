# Bro Batch Rewards (iOS)

**Not built yet.** This is milestone M7, with push notifications in M8.

The customer-facing iPhone app: registration and sign-in, digital membership card with QR code,
live points balance, rewards catalog, redemption, purchase history and profile.

What already exists for it:

- The database and security rules, including `register_customer()` (`supabase/`).
- Shared rules it must follow: `packages/contracts` (the membership QR format, the points
  formula, validation rules).

What it is waiting on:

- M2 (loyalty engine) and M3 (payments backend).
- A Mac with Xcode, or a macOS CI runner, to build and test.
- Apple Developer Program membership (TestFlight, push notifications).

See `docs/PLAN.md` for the full plan.
