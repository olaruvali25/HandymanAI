# Errors / Fixes

## Tailwind: `Cannot apply unknown utility class border-border`

**Cause:** Tailwind v4 (CSS-first) wasn’t loading `tailwind.config.*`, so theme tokens like `border-border` didn’t exist.

**Fix in this repo**

- `src/app/globals.css` includes `@config "../../tailwind.config.mjs";`
- Tailwind config exists at `tailwind.config.mjs`

## Convex: app hard-crashed when `NEXT_PUBLIC_CONVEX_URL` was missing

**Cause:** env validation + Convex Auth Next.js client storage namespace required `NEXT_PUBLIC_CONVEX_URL` at module-load time.

**Fix in this repo**

- `src/env.ts` allows `NEXT_PUBLIC_CONVEX_URL` to be missing at startup (so the app can boot before you run Convex setup).
- `src/app/layout.tsx` passes `storageNamespace="handymanai"` to `ConvexAuthNextjsServerProvider` (removes Convex Auth’s hard dependency on `NEXT_PUBLIC_CONVEX_URL` for storage keys).
- `src/components/convex-client-provider.tsx` falls back to `http://127.0.0.1:3210` when `NEXT_PUBLIC_CONVEX_URL` is empty (dev convenience).

### What you still must set for password login to work

**Next.js `.env.local`**

- `NEXT_PUBLIC_CONVEX_URL` (Convex “cloud” URL; `convex dev` prints it)

**Convex env vars (set via `npx convex env set`, not Next.js env)**

- `SITE_URL` (your app origin, e.g. `http://localhost:3000`)
- `CONVEX_SITE_URL` (your Convex “site” origin, e.g. local is often `http://127.0.0.1:3211`)
- `JWT_PRIVATE_KEY` (PEM PKCS8 private key used to sign JWTs)
- `JWKS` (JSON string for the public JWKS served at `/.well-known/jwks.json`)

If these are missing, sign-in/sign-up will fail with “Missing environment variable …”.
