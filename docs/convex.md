# Convex backend

## What lives in `convex/`

- `convex/schema.ts` — database schema (tables + indexes)
- `convex/*.ts` — queries/mutations/actions
- `convex/_generated/*` — generated types + API bindings (do not edit)

## Schema overview

From `convex/schema.ts`:

- `users` — app users + plan/credits + future billing fields (Stripe IDs, etc.)
- `guestCredits` — guest credit balances (cookie-backed guest id)
- `anonymousUsers` — legacy guest identities (pre-cookie migration)
- `tasks` — demo CRUD feature (protected route)
- `chatThreads` / `chatMessages` — chat history persistence for users and guests
- `creditCharges` / `creditGrants` — legacy usage + grant tables (still retained)
- `creditLedger` — canonical credit ledger for all credit mutations

Auth tables are included via `authTables` from `@convex-dev/auth/server`.

For an authoritative list of tables + field types + indexes, see:

- `docs/data-model.schema.md` (generated from `convex/schema.ts`)

## Key modules

- `convex/auth.ts`
  - Configures auth providers: Password + optional Google/Facebook

- `convex/auth.config.ts`
  - Requires `CONVEX_SITE_URL` in Convex env (used as auth provider domain)

- `convex/entitlements.ts`
  - Credits system (reserve + charge), out-of-credits logging, guest → user merge logic

- `convex/chatHistory.ts`
  - Thread + message persistence and guest → user merge logic

- `convex/tasks.ts`
  - Demo task list mutations/queries for authenticated users

- `convex/credits.ts` + `convex/billingConfig.ts` (+ `convex/plans.ts` re-export)
  - Canonical plan + credit config, Stripe-driven credit mutations, free-credit cron

- `convex/stripe.ts`
  - Stripe checkout + webhook handling (plan lifecycle + top-ups)

- `convex/attachments.ts`
  - Storage upload URLs + attachment URL resolution

- `convex/crons.ts`
  - Scheduled free-credit grants for logged-in users with no plan

- `convex/users.ts`
  - `users.me` plus admin/dev plan normalization helpers

## “Guest” vs “User” identity (important)

The frontend uses a cookie-based guest id (`fixly_guest_id`) to track guest usage.

- Guest credits live in `guestCredits`
- On signup/login, the app merges guest threads + credits into the user

This is implemented across:

- `convex/entitlements.ts` (`syncAnonymousToUser`)
- `convex/chatHistory.ts` (`mergeGuestThreads`)
