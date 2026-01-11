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

- `npm install`: install dependencies.
- `npm run dev`: run Next.js + Convex together (recommended for local dev).
- `npm run dev:next`: run only the Next.js dev server.
- `npm run dev:convex`: run only the Convex dev server (sets `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL`).
- `npm run build`: create a production build.
- `npm start`: serve the production build.
- `npm run lint`: run ESLint.
- `npm run typecheck`: run TypeScript checks (`tsc --noEmit`).
- `npm run format` / `npm run format:check`: format with Prettier (or verify formatting).

## Coding Style & Naming Conventions

- Indentation: 2 spaces; line endings: LF (see `.editorconfig`).
- Formatting: Prettier with semicolons, double quotes, trailing commas, and Tailwind class sorting (`.prettierrc.json`).
- Linting: ESLint with `eslint-config-next` (`eslint.config.mjs`).
- Imports: prefer path aliases `@/` (maps to `src/`) and `@convex/` (maps to `convex/`) from `tsconfig.json`.

## Testing Guidelines

- No dedicated test runner is configured yet; treat `npm run lint` and `npm run typecheck` as required checks.
- If you add tests, colocate them (e.g. `src/**/__tests__/*.test.ts`) and add a `test` script to `package.json`.

## Commit & Pull Request Guidelines

- Commit history currently uses short, free-form subjects (e.g. "chatbot updates"). Keep commits small and messages descriptive.
- PRs should include: what changed, how you tested (commands + key flows), screenshots for UI changes, and any updates to `.env.example`.

## Security & Configuration Tips

- Never commit secrets. Use `.env.local` for local values and keep `.env.example` up to date.
- Required: `NEXT_PUBLIC_CONVEX_URL`; optional: `OPENAI_API_KEY` and `OPENAI_MODEL` (see `src/env.ts`).
- Avoid committing build artifacts like `.next/` and dependencies like `node_modules/`.