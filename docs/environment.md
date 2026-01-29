# Environment variables

This repo has two separate “env” systems:

1. **Next.js env** (your app server + browser bundle)
2. **Convex env** (your Convex deployment runtime)

They are set in different places and solving the “wrong env in the wrong place”
is the most common setup failure.

## Next.js env (`.env.local`)

Use `.env.local` for this repo. Next.js will also read `.env`, but we standardize on
`.env.local` to avoid accidental commits and to keep local-only values separate.

Copy the tracked template and fill values:

- `cp .env.example .env.local`

### Variables (exactly what to do)

#### `NEXT_PUBLIC_CONVEX_URL` (required)

- **What it is:** The URL of your Convex deployment (the client + auth API host).
- **Where to get it:** Run `npm run dev:convex` and copy the line that prints `NEXT_PUBLIC_CONVEX_URL`.
- **Where to put it:** `.env.local`
  - If you created `@env`, rename it to `.env.local`.
- **Used by:**
  - `src/components/convex-client-provider.tsx`
  - `src/app/api/auth/[...auth]/route.ts`
  - `src/app/login/page.tsx`, `src/app/signup/page.tsx`

#### `OPENAI_API_KEY` (required for AI endpoints)

- **What it is:** Your OpenAI API key.
- **Where to get it:** OpenAI dashboard (create a key).
- **Where to put it:** `.env.local`
- **Used by:** `src/lib/openai.ts` → `/api/ai`, `/api/chat`, `/api/tts`

#### `OPENAI_MODEL` (optional)

- **What it is:** Default model name for the OpenAI Responses API.
- **Where to get it:** Choose a model available to your account.
- **Where to put it:** `.env.local`
- **Used by:** `/api/ai` and `/api/chat`
- **Notes:** When attachments exist, `/api/ai` may override to a vision-capable model.

#### `FIXLY_DISABLE_STREAMING` (optional feature flag)

- **What it is:** Disables streaming SSE from `/api/ai` when set to `1`.
- **Where to set it:** `.env.local`
- **Used by:** `src/app/api/ai/route.ts`

#### `NEXT_PUBLIC_SHOW_ENTITLEMENTS_DEBUG` (optional debug flag)

- **What it is:** Shows the Entitlements debug overlay when set to `true`.
- **Where to set it:** `.env.local`
- **Used by:** `src/components/chat/GrokThread.tsx`
- **Notes:** This is client-side (`NEXT_PUBLIC_*`) and should be `true` or `false`.

### Important behavior notes

- Changing `.env.local` usually requires restarting `next dev`.
- Anything `NEXT_PUBLIC_*` is public and will end up in the browser bundle.
- `next.config.ts` also injects `FIXLY_DISABLE_*` into the browser bundle; treat
  those as non-secret feature flags.

### Adding a new Next.js env var (pattern used in this repo)

This repo uses runtime validation via `@t3-oss/env-nextjs` in `src/env.ts`.

When you add a new env var:

1. Add it to `server` or `client` in `src/env.ts`
2. Add it to `runtimeEnv` in `src/env.ts`
3. Add it to `.env.example`
4. Update `docs/environment.md`

## Convex env (set via `npx convex env set`)

Convex env vars are **not** read from `.env.local`. They live inside the Convex
deployment. For local dev, you still set them via the Convex CLI.

### Required for Convex Auth to work (exactly what to do)

These are referenced by Convex Auth’s server runtime (and some are enforced by
this repo’s config):

#### `SITE_URL` (required)

- **What it is:** Your Next.js site origin.
- **Where to get it:** Your local dev origin (usually `http://localhost:3000`).
- **Where to set it:** Convex env (NOT `.env.local`)
  - `npx convex env set SITE_URL http://localhost:3000`
- **Used by:** Convex Auth runtime.

#### `CONVEX_SITE_URL` (required)

- **What it is:** Your Convex “site” origin (Convex dev UI host).
- **Where to get it:** Run `npm run dev:convex` and copy the “site” URL it prints
  (often `http://127.0.0.1:3211`).
- **Where to set it:** Convex env
  - `npx convex env set CONVEX_SITE_URL http://127.0.0.1:3211`
- **Used by:** `convex/auth.config.ts`

#### `JWT_PRIVATE_KEY` (required)

- **What it is:** PKCS8 PEM private key for signing auth JWTs.
- **Where to get it:** Generate via `npm run convex:auth:keys`
  - Output file: `.secrets/convex-auth/jwt_private_key.pem`
- **Where to set it:** Convex env
  - PowerShell:
    - `$jwt = Get-Content -Raw .secrets/convex-auth/jwt_private_key.pem`
    - `npx convex env set JWT_PRIVATE_KEY $jwt`
- **Used by:** Convex Auth server signing.

#### `JWKS` (required)

- **What it is:** JSON Web Key Set (public key) for verifying JWTs.
- **Where to get it:** Generated via `npm run convex:auth:keys`
  - Output file: `.secrets/convex-auth/jwks.json`
- **Where to set it:** Convex env
  - PowerShell:
    - `$jwks = Get-Content -Raw .secrets/convex-auth/jwks.json`
    - `npx convex env set JWKS $jwks`
- **Used by:** Convex Auth server verification.

Generate `JWT_PRIVATE_KEY` and `JWKS` locally:

- `npm run convex:auth:keys`
  - Writes `.secrets/convex-auth/jwt_private_key.pem`
  - Writes `.secrets/convex-auth/jwks.json`

Then set them in Convex env (PowerShell examples are in the root `README.md`).

### Optional (enables OAuth providers)

These are used by `convex/auth.ts`:

#### `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (optional)

- **What it is:** Google OAuth credentials.
- **Where to get it:** Google Cloud Console → OAuth 2.0 Client.
- **Where to set it:** Convex env
  - `npx convex env set GOOGLE_CLIENT_ID ...`
  - `npx convex env set GOOGLE_CLIENT_SECRET ...`
- **Used by:** `convex/auth.ts` (Google provider)

#### `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET` (optional)

- **What it is:** Facebook OAuth credentials.
- **Where to get it:** Meta Developers → App → Facebook Login.
- **Where to set it:** Convex env
  - `npx convex env set FACEBOOK_CLIENT_ID ...`
  - `npx convex env set FACEBOOK_CLIENT_SECRET ...`
- **Used by:** `convex/auth.ts` (Facebook provider)

If they are missing, the corresponding OAuth provider is disabled (with a dev
console warning), but password login still works.

### Adding a new Convex env var

Convex functions read environment variables from `process.env.*` inside the Convex
deployment runtime (not from `.env.local`).

- Add your checks/usages inside `convex/*.ts`
- Document it in `docs/environment.md`
- Set it with `npx convex env set YOUR_VAR value`

## Stripe payments (Convex + Next.js)

Stripe webhooks and checkout sessions run in Convex Actions, so Stripe secrets
must be set in Convex env (not only `.env.local`).

### Required Convex env vars

- `STRIPE_KEY` — Stripe secret key (`sk_...`)
- `STRIPE_WEBHOOK_SECRET` — Webhook secret from `stripe listen`
- `HOST_URL` — Your site origin (e.g. `http://localhost:3000`)
- `STRIPE_PLAN_PRICE_IDS` — JSON mapping of plan -> price ID
  - Example: `{"starter":"price_...","plus":"price_...","pro":"price_..."}`
- `STRIPE_TOPUP_PRICE_ID` — Price ID for $5 / 100 credits (one-time)

### Next.js env vars

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (optional for Stripe client UI)
