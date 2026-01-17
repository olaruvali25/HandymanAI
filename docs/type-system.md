# Type system & contracts

This project uses **Convex** for database + realtime queries/mutations and **Zod**
for runtime validation at the API/UI boundaries. The goal is a single, clear
source of truth for each boundary.

## Principles

- **Database schema is authoritative**: the Convex schema defines DB types.
- **Validate at boundaries**: anything that crosses `fetch()`/HTTP should be
  runtime-validated (Zod).
- **No “mystery types”**: avoid `any` in persisted models and public function
  args.
- **Prevent drift**: when the same shape exists in Convex + Zod, add a
  compile-time contract check.

## Database (Convex)

- Source of truth: `convex/schema.ts`
- Generated reference: `docs/data-model.schema.md`
- Key TS types:
  - `Id<"table">`, `Doc<"table">` from `convex/_generated/dataModel`

### Keeping schema docs up to date (required)

- Generate: `bun run docs:data-model`
- Verify: `bun run docs:check` (also runs in CI)

## Domain schemas (Zod)

Zod schemas live under `src/lib/schemas/*` and are used for:

- API route request/response validation (`src/app/api/*`)
- UI form/input validation (client-side)

Example: `/api/ai` entitlements are validated with:

- Schema: `src/lib/schemas/entitlements.ts`
- Query hook (React Query): `src/lib/queries/entitlements.ts`

When a shape needs to match both worlds:

- Convex validator: `convex/validators/*`
- Zod schema: `src/lib/schemas/*`
- Compile-time drift check: `src/lib/schemas/contracts/*`

## Realtime + caching

- **Realtime state**: use `convex/react` queries/mutations for data that should
  update live (threads/messages, credits, etc.).
- **Cached fetch state**: use TanStack React Query for REST-like endpoints (e.g.
  `/api/*` that aren’t Convex).

## Client state

- **Global/persisted preferences**: Zustand stores in `src/lib/stores/*`
- **Ephemeral component state**: local React state (`useState`)
