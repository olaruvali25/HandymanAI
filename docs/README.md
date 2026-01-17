# HandymanAI (Fixly) docs

These docs are meant to prevent “silly errors” by centralizing the setup details
that are easy to forget (env vars, auth setup, dev workflow, and how the code is
stitched together).

## Table of contents

- **Getting started / local dev:** `docs/development.md`
- **Environment variables:** `docs/environment.md`
- **Auth (Convex Auth + Google/Facebook):** `docs/auth.md`
- **AI + TTS endpoints (OpenAI):** `docs/ai.md`
- **Convex backend (schema + functions):** `docs/convex.md`
- **Data model (tables + field types):** `docs/data-model.schema.md`
- **Type system & contracts:** `docs/type-system.md`
- **Architecture / data flow:** `docs/architecture.md`
- **Libraries / stack overview:** `docs/libraries.md`
- **Known issues / fixes:** `docs/errors.md`
- **Troubleshooting checklist:** `docs/troubleshooting.md`

## Source of truth

- Next.js env validation: `src/env.ts`
- Convex auth providers: `convex/auth.ts`
- Convex auth domain config: `convex/auth.config.ts`
- Chat API route: `src/app/api/ai/route.ts`
- TTS route: `src/app/api/tts/route.ts`
- Convex schema: `convex/schema.ts`
- Data model (generated): `docs/data-model.schema.md`
