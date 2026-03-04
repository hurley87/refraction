# Contributor Guide

This file guides contributors and AI agents (e.g. Cursor) working in this repo. For full architecture and patterns, see **CLAUDE.md**. For persistent coding rules, see **.cursorrules**.

## Project in one line

**IRL** is a Next.js 14 rewards app for cultural events and locations (Privy auth, Supabase, multi-chain wallets). Users check in, earn points, advance tiers, and redeem perks.

## Agent instructions

- Follow the user's requirements carefully and to the letter.
- Plan step-by-step: describe the approach in pseudocode, then implement.
- Prefer correct, readable, secure code; no TODOs or placeholders.
- Reference concrete filenames and paths. Be concise.
- If something is uncertain or unknown, say so instead of guessing.

Tech focus: **Next.js 14**, **TypeScript**, **Tailwind CSS**, **Supabase**, **Privy**. Use Zod for validation, Tailwind for styling (including light/dark), and current Next.js and Supabase practices.

## Directory structure

Paths are from the **project root** (no `src/`). The `@/*` path alias maps to the root.

| Path          | Purpose                                                                             |
| ------------- | ----------------------------------------------------------------------------------- |
| `app/`        | Next.js App Router: pages, layouts, API routes (`app/api/`, `app/dashboard/`, etc.) |
| `components/` | React components (`components/ui/` = shadcn)                                        |
| `lib/`        | Business logic: `db/`, `schemas/`, `api/`, `analytics/`, `contracts/`, `types.ts`   |
| `hooks/`      | Custom React hooks (e.g. `usePlayer`, `useCheckins`)                                |
| `database/`   | SQL migrations and schema                                                           |

Keep code modular; when in doubt, ask or open a discussion.

## Commands

**Package manager:** Yarn 1.22.22 only (see `packageManager` in `package.json`). Do not use npm/pnpm for install or scripts.

```bash
yarn install     # Install dependencies
yarn dev         # Dev server at http://localhost:3000
yarn build       # Production build
yarn lint        # Next.js ESLint
yarn test        # Run tests (single run)
yarn test:watch  # Tests in watch mode
yarn test:coverage  # Coverage report
```

Copy `.env.local.example` to `.env.local` for local config. The app runs without valid keys, but Supabase/Privy features need real credentials.

## Testing

- **Runner:** **Vitest** (not Jest). Config: `vitest.config.ts`; environment: `happy-dom`.
- Use **React Testing Library** for component tests.
- The `@` path alias resolves to the project root.

## Coding standards

- TypeScript everywhere; Zod for input validation.
- Functional, declarative style; descriptive names (e.g. `isLoading`, `handleSubmit`).
- Files and directories: **lowercase-with-dashes**.
- Tailwind CSS, mobile-first; JSDoc for non-obvious or exported logic.
- Use `apiSuccess()`, `apiError()`, `apiValidationError()` from `lib/api/response.ts` for API responses.

## Workflow

1. **Branch:** From `main` (e.g. `feature/add-auth-wizard`).
2. **Commit:** Clear messages (e.g. `fix: handle edge case in login form`).
3. **PR:** Target `main`, link issues, ensure CI/tests/lint pass.
4. **Review:** Address feedback; ask when unsure.

## Best practices

- Unit tests for logic and components (Vitest + React Testing Library).
- Early returns and guard clauses for errors.
- Optimize images (WebP, lazy loading, dimensions).
- Dynamic imports where code-splitting helps.
- Small, focused components; document non-obvious decisions in code or PR.

## Cursor Cloud / single-process setup

- Only local process: Next.js dev server (`yarn dev`). Supabase, Privy, Mapbox, Mixpanel, RPCs are external; no Docker or local DB.
- **Gotchas:** Optional `canvas` build warnings are safe to ignore. Use `yarn test` (Vitest); ignore docs that mention Jest. Lint may show known `<img>` vs `<Image />` warnings; they are non-blocking.

## References

- [Next.js](https://nextjs.org/docs) · [TypeScript](https://www.typescriptlang.org/docs/) · [Tailwind](https://tailwindcss.com/docs) · [shadcn/ui](https://ui.shadcn.com/) · [Radix UI](https://www.radix-ui.com/docs/primitives/overview/introduction)
