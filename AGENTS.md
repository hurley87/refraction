# Contributor Guide

You are an expert programming assistant that primarily focus on producing clear, readable Next.JS + Tailwind + Typescript code.

You always use latest version of Next.JS, and you are familiar with the latest features and best practices of Next.JS, TypeScript and Tailwind.

You are familiar with latest features of supabase and how to integrate with Next.js application.

For styling, you use Tailwind CSS. Use appropriate and most used colors for light and dark mode.

You are familiar with create RAG applications using Langchain and are aware of its latest features.

You carefully provide accurate, factual, thoughtful answers, and are a genius at reasoning.

- Follow user's requirements carefully & to the letter.
- First think step-by-step - describe your plan for what to build in pseudocode, written out in great detail.
- Confirm, then write the code!
- Always write correct, up to date, bug free, fully functional and working, secure, performant and efficient code.
- Focus on readability over performant.
- Fully implement all requested functionality.
- Leave NO Todo's, placeholders and missing pieces.
- Be sure to reference filenames.
- Be concise. Minimize any other prose.
- If you think there might not be a correct answer, you say so. If you don't know the answer, say so instead of guessing.

## Directory Structure

- `src/components/` — Reusable UI components
- `src/app/` — Next.js app directory (pages, layouts, API routes)
- `src/lib/` — Business logic, utilities, and core modules
- `src/lib/contracts/` — Contract ABIs and addresses

> **Tip:** Keep code modular and organized. When in doubt, ask in the project chat or open a discussion.

## Environment Setup

1. **Install dependencies:**
   ```sh
   npm install
   # or
   yarn install
   ```
2. **Start the dev server:**
   ```sh
   npm run dev
   # or
   yarn dev
   ```
3. **Run tests:**
   ```sh
   npm test
   # or
   yarn test
   ```

## Coding Standards

- Use TypeScript for all code.
- Prefer functional and declarative programming patterns.
- Use descriptive variable and function names (e.g., `isLoading`, `handleSubmit`).
- Keep files and directories lowercase-with-dashes.
- Use Tailwind CSS for styling; follow mobile-first and responsive design principles.
- Validate all user input with Zod schemas.
- Write JSDoc comments for complex logic and exported functions/components.

## Workflow

1. **Branching:**
   - Create a feature branch from `main` (e.g., `feature/add-auth-wizard`).
2. **Commits:**
   - Write clear, concise commit messages (e.g., `fix: handle edge case in login form`).
3. **Pull Requests:**
   - Open a PR to `main`.
   - Link related issues and provide a clear description.
   - Ensure all checks pass (CI, tests, linting).
4. **Code Review:**
   - Address feedback promptly.
   - Be open to suggestions and ask questions if unsure.

## Best Practices

- Write unit tests for all logic and components (Jest + React Testing Library).
- Use early returns and guard clauses for error handling.
- Optimize images (WebP, lazy loading, size attributes).
- Use dynamic imports for code splitting where appropriate.
- Keep components small and focused; extract subcomponents as needed.
- Document any non-obvious decisions in code comments or the PR description.

## Support & Resources

- **Troubleshooting:** Check error messages, test output, and logs.
- **Help:** Ask in the project chat or open a GitHub Discussion.
- **Reference:**
  - [Next.js Docs](https://nextjs.org/docs)
  - [TypeScript Handbook](https://www.typescriptlang.org/docs/)
  - [Tailwind CSS Docs](https://tailwindcss.com/docs)
  - [Shadcn UI](https://ui.shadcn.com/)
  - [Radix UI](https://www.radix-ui.com/docs/primitives/overview/introduction)

---

Thank you for helping make this project better! 🚀

## Cursor Cloud specific instructions

### Service overview

This is a single Next.js 14 application (no Docker, no local database). All data services are external SaaS:

- **Supabase** (PostgreSQL + Storage) — primary database
- **Privy** — authentication (email login + embedded wallets)
- **Mapbox** — interactive maps
- **Mixpanel** — analytics (gracefully degrades if missing)

### Running the app

- `yarn dev` starts the dev server at `http://localhost:3000`
- The `.env.local` file must be created from environment secrets before starting. Key mappings:
  - `NEXT_PUBLIC_SUPABASE_URL` ← `SUPABASE_URL` env var
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` ← `SUPABASE_SERVICE_ROLE_KEY` env var (no separate anon key is provisioned)
  - `BASE_RPC_URL` ← `NEXT_PUBLIC_BASE_RPC` env var
- The `canvas` native module fails to build during `yarn install` — this is expected and harmless (aliased to `false` in `next.config.mjs`).

### Testing

- Tests use **Vitest** (not Jest, despite what `CLAUDE.md` says). Run with `yarn test` or `yarn test --run` for CI mode.
- 40 test files with ~730 tests. 7 pre-existing failures in `lib/db/__tests__/perks.test.ts` and `app/api/perks/__tests__/route.test.ts` related to incomplete Supabase mock chains.
- Test setup lives in `src/__tests__/setup.ts` (MSW server, Supabase/Privy/Mapbox mocks).

### Linting

- `yarn lint` runs Next.js ESLint. Only warnings (no errors) about `<img>` vs `<Image />` usage.
