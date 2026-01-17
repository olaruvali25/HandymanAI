# Convex backend

## What lives in `convex/`

- `convex/schema.ts` — database schema (tables + indexes)
- `convex/*.ts` — queries/mutations/actions
- `convex/_generated/*` — generated types + API bindings (do not edit)

## Schema overview

From `convex/schema.ts`:

- `users` — app users + plan/credits + future billing fields (Stripe IDs, etc.)
- `anonymousUsers` — guest identities + credits, later merged into a user
- `tasks` — demo CRUD feature (protected route)
- `chatThreads` / `chatMessages` — chat history persistence for users and guests
- `creditCharges` / `creditGrants` — credit ledger (usage + grants)

Auth tables are included via `authTables` from `@convex-dev/auth/server`.

For an authoritative list of tables + field types + indexes, see:

- `docs/data-model.schema.md` (generated from `convex/schema.ts`)

## Key modules

- `convex/auth.ts`
  - Configures auth providers: Password + optional Google/Facebook

- `convex/auth.config.ts`
  - Requires `CONVEX_SITE_URL` in Convex env (used as auth provider domain)

- `convex/entitlements.ts`
  - Credits system (reserve + charge) and guest → user merge logic

- `convex/chatHistory.ts`
  - Thread + message persistence and guest → user merge logic

- `convex/tasks.ts`
  - Demo task list mutations/queries for authenticated users

- `convex/credits.ts` + `convex/plans.ts`
  - Plan enums + credit grant helpers (includes dev/admin helpers)

- `convex/users.ts`
  - `users.me` plus admin/dev plan normalization helpers

## “Guest” vs “User” identity (important)

The frontend uses a cookie-based anonymous id (`fixly_anon`) to track guest usage.

- Guest credits live in `anonymousUsers`
- On signup/login, the app merges guest threads + credits into the user

This is implemented across:

- `convex/entitlements.ts` (`syncAnonymousToUser`)
- `convex/chatHistory.ts` (`mergeGuestThreads`)
