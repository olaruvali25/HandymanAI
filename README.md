# HandymanAI (Fixly)

Next.js (App Router) + TypeScript + Tailwind + shadcn/ui + Convex + Convex Auth.

## Docs

Start here: `docs/README.md`

## Local setup (Bun-first)

1. Install deps: `bun install`
2. Set up Convex (interactive): `bun run dev:convex` (follow prompts; it prints `NEXT_PUBLIC_CONVEX_URL`)
3. Create `.env.local` (from `.env.example`) and fill:
   - `NEXT_PUBLIC_CONVEX_URL` (required for auth/tasks)
   - `OPENAI_API_KEY` (required for `/api/ai` + `/api/tts`)
   - `OPENAI_MODEL` (optional)
4. Generate Convex Auth keys: `bun run convex:auth:keys`
5. Set required Convex env vars (PowerShell):
   - `npx convex env set SITE_URL http://localhost:3000`
   - `npx convex env set CONVEX_SITE_URL http://127.0.0.1:3211` (use the “site” URL/port from `convex dev` if different)
   - `npx convex env set JWT_PRIVATE_KEY (Get-Content -Raw .secrets/convex-auth/jwt_private_key.pem)`
   - `npx convex env set JWKS (Get-Content -Raw .secrets/convex-auth/jwks.json)`
6. Run the app: `bun run dev` (or `bun run dev:next` in a second terminal)

## npm alternative

All commands also work with npm if you prefer it.

## Demo

- Sign up: `http://localhost:3000/signup`
- Tasks (protected): `http://localhost:3000/tasks`

## Notes

- `src/` contains the Next.js app and UI; `convex/` contains the backend.
- If you ever committed an OpenAI key, rotate it immediately.
