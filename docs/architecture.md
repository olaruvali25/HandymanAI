# Architecture (how things connect)

## High-level diagram (conceptual)

Browser (Next.js UI)
→ Next.js route handlers (`src/app/api/*`)
→ (a) OpenAI (AI/TTS)
→ (b) Convex (auth + DB + credits + chat history)

## Core user flows

### Chat flow (`/`)

- UI: `src/app/_components/home-page-client.tsx` mounts `src/components/chat/GrokThread.tsx`
- Runtime: `@assistant-ui/react` drives a “thread” and calls the server adapter.
- Server: `POST /api/ai` streams assistant output and enforces credits.

### Guest identity (anonymous)

- Cookie: `fixly_anon` (set by `GET /api/ai` and sometimes by `POST /api/ai`)
- Stored in Convex:
  - Credits: `anonymousUsers`
  - Chat history: `chatThreads` + `chatMessages` with `anonymousId` / `guestChatId`

On signup/login, guest state is merged into the user:

- Credits merge: `convex/entitlements.ts` (`syncAnonymousToUser`)
- Thread merge: `convex/chatHistory.ts` (`mergeGuestThreads`)

### Auth flow (Convex Auth)

- Client provider:
  - `src/app/layout.tsx` wraps the app in `ConvexAuthNextjsServerProvider`
  - `src/components/convex-client-provider.tsx` wraps the client with `ConvexAuthNextjsProvider`
- UI:
  - `/login` (`src/app/login/page.tsx`)
  - `/signup` (`src/app/signup/page.tsx`)
- Backend providers: `convex/auth.ts` (Password + optional Google/Facebook)
- Routing glue:
  - `src/app/api/auth/route.ts` manages auth cookies for Next.js
  - `src/app/api/auth/[...auth]/route.ts` proxies `/api/auth/*` to the Convex deployment

### Credits enforcement

`/api/ai`:

1. Reads auth token (if any) from cookies.
2. Determines actor: authenticated user or guest `fixly_anon`.
3. Calls Convex:
   - Reserve credits first (`convex/entitlements.ts` → `reserveCredits`)
4. Calls OpenAI to generate the reply.
5. Calls Convex again:
   - Charge assistant credits (`convex/entitlements.ts` → `chargeAssistantCredits`)

### Chat history persistence

UI uses Convex directly (not via `/api/ai`) for history:

- List threads: `convex/chatHistory.ts` (`listThreadsForUser` / `listThreadsForActor`)
- Read messages: `getThreadMessagesForActor`
- Write messages:
  - Some flows use `appendMessages`, others use `appendUserMessage` / `appendAssistantMessage`

### Protected pages

- `middleware.ts` protects `/tasks/*` using Convex Auth session state.

## Where to look when debugging

- “Auth didn’t stick”: `src/app/api/auth/route.ts`, `middleware.ts`, `convex/auth.ts`
- “Credits wrong”: `src/app/api/ai/route.ts`, `convex/entitlements.ts`, `convex/schema.ts`
- “Threads missing”: `convex/chatHistory.ts`, `src/components/chat/GrokThread.tsx`
