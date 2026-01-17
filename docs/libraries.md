# Libraries / stack overview

## Core stack

- **Next.js (App Router) + React + TypeScript**
  - App routes live under `src/app/`
  - API routes live under `src/app/api/`

- **Convex** (database + server functions)
  - Schema: `convex/schema.ts`
  - Functions: `convex/*.ts`
  - Generated API/types (do not edit): `convex/_generated/*`

- **Convex Auth** (`@convex-dev/auth`)
  - Next.js integration: `@convex-dev/auth/nextjs`
  - Providers configured in `convex/auth.ts` (Password + optional Google/Facebook)
  - Route protection: `middleware.ts`
  - OAuth provider implementations come from `@auth/core` (used server-side in Convex)

## AI / OpenAI

- **OpenAI Node SDK** (`openai`)
  - Used via `src/lib/openai.ts`
  - `/api/ai` and `/api/chat` use the Responses API
  - `/api/tts` uses `openai.audio.speech.create` (TTS)

## UI

- **Tailwind CSS v4** + **PostCSS**
  - Tailwind config: `tailwind.config.mjs`
  - Important: `src/app/globals.css` uses `@config "../../tailwind.config.mjs";`

- **shadcn/ui** primitives + **Radix UI**
  - Config: `components.json`
  - Primitives live under `src/components/ui/*`

- **assistant-ui** (`@assistant-ui/react`)
  - Powers the “thread” runtime used by `src/components/chat/GrokThread.tsx`

## Utility libraries

- `zod` + `@t3-oss/env-nextjs`: runtime-validated env vars (`src/env.ts`)
- `clsx` + `tailwind-merge`: className composition (`src/lib/utils.ts`)
- `lucide-react`: icons

## State, caching, i18n

- **TanStack React Query** (`@tanstack/react-query`)
  - Query cache for REST-like fetches / non-Convex data
  - Provider: `src/components/convex-client-provider.tsx`

- **Zustand** (`zustand`)
  - Lightweight client state (with optional persistence)
  - Stores: `src/lib/stores/*`

- **i18next** + **react-i18next**
  - Translation runtime + React bindings
  - Config: `src/i18n/i18n.ts`
  - Provider: `src/components/convex-client-provider.tsx`
