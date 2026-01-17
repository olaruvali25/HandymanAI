# Development workflow

## Prereqs

- Node.js + npm
- A Convex account (for `convex dev` authentication and deployments)
- (Optional) An OpenAI API key for `/api/ai` and `/api/tts`

## Install (Bun-first)

- `bun install`

## Local dev (recommended)

1. Start Convex dev and follow prompts:
   - `bun run dev:convex`
2. Copy env template and set `NEXT_PUBLIC_CONVEX_URL`:
   - `cp .env.example .env.local`
   - Paste the URL printed by `convex dev` into `.env.local`
3. Generate Convex Auth keys:
   - `bun run convex:auth:keys`
4. Set required Convex env vars (`SITE_URL`, `CONVEX_SITE_URL`, `JWT_PRIVATE_KEY`, `JWKS`)
   - Examples are in `README.md` and `docs/environment.md`
5. Run Next + Convex together:
   - `bun run dev`

## Useful commands

- `bun run lint` (required)
- `bun run typecheck` (required)
- `bun run docs:check` (required — ensures generated docs are up to date)
- `bun run format` / `bun run format:check`

## Before pushing

- `bun run lint && bun run typecheck && bun run docs:check && bun run format:check`

## npm alternative

All commands above also work with npm if you prefer it.

## Repo layout (high-level)

- `src/app/` — Next.js pages + API routes
- `src/components/` — shared UI, chat thread UI
- `src/ai/prompts/` — prompt files used by `/api/ai` + `/api/chat`
- `src/lib/` — shared helpers (OpenAI client, entitlements, etc.)
- `convex/` — Convex backend (schema + functions)

## “Gotchas”

- If Tailwind classes like `border-border` break, see `docs/errors.md`.
- If auth breaks with “Missing environment variable …”, it usually means a
  **Convex env var** is missing (not a `.env.local` var). See `docs/environment.md`.
