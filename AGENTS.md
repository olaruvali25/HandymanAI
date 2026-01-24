# Global Rules (Must Follow)

You are a world-class software engineer and software architect.

Your motto is:

> **Every mission assigned is delivered with 100% quality and state-of-the-art execution — no hacks, no workarounds, no partial deliverables and no mock-driven confidence. Mocks/stubs may exist in unit tests for I/O boundaries, but final validation must rely on real integration and end-to-end tests.**

You always:

- Deliver end-to-end, production-like solutions with clean, modular, and maintainable architecture.
- Take full ownership of the task: you do not abandon work because it is complex or tedious; you only pause when requirements are truly contradictory or when critical clarification is needed.
- Are proactive and efficient: you avoid repeatedly asking for confirmation like “Can I proceed?” and instead move logically to next steps, asking focused questions only when they unblock progress.
- Follow the full engineering cycle for significant tasks: **understand → design → implement → (conceptually) test → refine → document**, using all relevant tools and environment capabilities appropriately.
- Keep engineering docs current: when changing architecture, data models, backend boundaries, Cloud Functions, or Firebase rules, update the relevant files in `docs/` (see `docs/README.md`) in the same PR.
- Respect both functional and non-functional requirements and, when the user’s technical ideas are unclear or suboptimal, you propose better, modern, state-of-the-art alternatives that still satisfy their business goals.
- Manage context efficiently and avoid abrupt, low-value interruptions; when you must stop due to platform limits, you clearly summarize what was done and what remains.

# Repository Guidelines

## Project Structure & Module Organization

- `src/app/`: Next.js App Router routes (pages and route handlers under `src/app/api/`).
- `src/components/`: shared UI; `src/components/ui/` contains shadcn/ui primitives.
- `src/lib/`: shared utilities.
- `src/env.ts`: runtime-validated environment variables.
- `src/ai/`: AI prompts and helpers.
- `convex/`: Convex backend (schema in `convex/schema.ts`, functions in `convex/*.ts`). Do not edit `convex/_generated/`.
- `public/`: static assets served at `/`.

## Build, Test, and Development Commands

Use Bun locally for all commands:

- `bun install`: install dependencies.
- `bun run dev`: run Next.js + Convex together (recommended for local dev).
- `bun run dev:next`: run only the Next.js dev server.
- `bun run dev:convex`: run only the Convex dev server (sets `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL`).
- `bun run build`: create a production build.
- `bun run start`: serve the production build.
- `bun run lint`: run ESLint.
- `bun run typecheck`: run TypeScript checks (`tsc --noEmit`).
- `bun run format` / `bun run format:check`: format with Prettier (or verify formatting).

## Coding Style & Naming Conventions

- Indentation: 2 spaces; line endings: LF (see `.editorconfig`).
- Formatting: Prettier with semicolons, double quotes, trailing commas, and Tailwind class sorting (`.prettierrc.json`).
- Linting: ESLint with `eslint-config-next` (`eslint.config.mjs`).
- Imports: prefer path aliases `@/` (maps to `src/`) and `@convex/` (maps to `convex/`) from `tsconfig.json`.

## Testing Guidelines

- No dedicated test runner is configured yet; treat `bun run lint`, `bun run typecheck`, `bun run docs:check`, and `bun run build` as required checks.
- If you add tests, colocate them (e.g. `src/**/__tests__/*.test.ts`) and add a `test` script to `package.json`.

## Commit & Pull Request Guidelines

- Commit history currently uses short, free-form subjects (e.g. "chatbot updates"). Keep commits small and messages descriptive.
- PRs should include: what changed, how you tested (commands + key flows), screenshots for UI changes, and any updates to `.env.example`.

## Security & Configuration Tips

- Never commit secrets. Use `.env.local` for local values and keep `.env.example` up to date.
- Required: `NEXT_PUBLIC_CONVEX_URL`; optional: `OPENAI_API_KEY` and `OPENAI_MODEL` (see `src/env.ts`).
- Avoid committing build artifacts like `.next/` and dependencies like `node_modules/`.

# Architecture Overview

## System Design

HandymanAI is a full-stack Next.js + Convex application with:

- **Frontend:** Next.js App Router, React 19, Tailwind CSS 4, shadcn/ui
- **Backend:** Convex (real-time database + serverless functions)
- **AI:** OpenAI API (text + vision models)
- **Auth:** Convex Auth with password + Google/Facebook OAuth
- **State management:** Zustand (user preferences), TanStack Query (server state), @assistant-ui/react (chat runtime)

## Critical Data Flows

### Chat Flow (Core User Experience)

1. User sends message via `src/components/chat/GrokThread.tsx`
2. Message posted to `POST /api/ai` (Next.js route handler)
3. Server validates credits via `convex/entitlements.ts`
4. OpenAI API called with two-stage prompt (scope-control + primary)
5. Response streamed back as Server-Sent Events
6. Chat history persisted to Convex `chatThreads` and `chatMessages` tables

### Guest → User Identity Merge

- Guests store anonymous ID in `fixly_anon` cookie
- On signup/login: `convex/entitlements.ts` (`syncAnonymousToUser`) merges credits and chat threads
- Critical: Check both `anonymousUsers` and `users` tables when querying entitlements

### Credits System

- User credits: `users.credits` (primary table)
- Anonymous credits: `anonymousUsers.credits`
- Charges tracked in `creditCharges` table (indexed by user/anonymous + turnId + stage)
- Two-stage charging: "user" stage (1-16 credits based on attachments) + "assistant" stage (2-7 credits)
- Lookup by turnId prevents double-charging on retries

## Key Implementation Patterns

### OpenAI Integration

- Base model: `env.OPENAI_MODEL` (defaults to "gpt-5.2")
- Vision: Auto-downgrades to "gpt-4o-mini" if attachments present and base model lacks vision
- Prompts: Loaded from `src/ai/prompts/` (scope-control.txt, primary.txt)
- Scope caching: 6-hour TTL cache (BoundedMap) to avoid re-prompting for thread context

### Authentication

- Session state in cookie + Convex Auth
- Routes protected via `middleware.ts` (checks `/tasks/*`)
- Client-side: `ConvexAuthNextjsServerProvider` (server) + `ConvexAuthNextjsProvider` (client)
- Auth routes: `src/app/api/auth/route.ts` (session) + `src/app/api/auth/[...auth]/route.ts` (OAuth proxy)

### Chat History Persistence

- Uses Convex queries directly (not via `/api/ai`)
- Functions in `convex/chatHistory.ts`
- Threads indexed by userId or anonymousId; messages indexed by threadId + createdAt
- Supports both authenticated users and guests (via guestChatId)

## Common Debugging Entry Points

- **Auth issues:** Check `middleware.ts` → `convex/auth.ts` → `src/app/api/auth/route.ts`
- **Credits mismatch:** Verify `reserveCredits` → `chargeAssistantCredits` flow; check `creditCharges` table for duplicate entries
- **Chat not showing:** Verify `listThreadsForUser` / `listThreadsForActor` queries; check `chatMessages` indexed query
- **Streaming vs. non-streaming:** Control via `FIXLY_DISABLE_STREAMING` env var; both paths in `src/app/api/ai/route.ts` must be kept in sync

## Entitlements & Capabilities

User capabilities determined by plan and returned as `ClientEntitlements` object:

- `userHasAccount`: boolean
- `userPlan`: "none" | "premium" | (other tiers)
- `credits`: number (optional)
- `capabilities`: object with `voice`, `photos`, `linksVisuals`, `history`, `favorites`, `photoLimit`, `premiumVisuals`
- Gating: flags to prompt signup/payment after certain actions

Update logic lives in `src/lib/schemas/entitlements.ts` and flows through `src/app/api/ai/route.ts` on every request.
