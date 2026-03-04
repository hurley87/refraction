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

### Services

This is a single-process Next.js 14 app. The only local service is the Next.js dev server (`yarn dev` on port 3000). All other dependencies (Supabase, Privy, Mapbox, Mixpanel, blockchain RPCs) are external SaaS — no Docker or local databases required.

### Running the app

- `yarn dev` — starts the dev server at http://localhost:3000
- The app requires a `.env.local` file. Copy `.env.local.example` to `.env.local` for placeholder values. The dev server starts and renders pages even without valid API keys, though features depending on Supabase/Privy will not function without real credentials.

### Testing

- The test runner is **Vitest** (not Jest, despite some docs referencing Jest). Run with `yarn test` (single run) or `yarn test:watch`.
- Tests use `happy-dom` environment and are configured in `vitest.config.ts`.
- The `@` path alias resolves to the project root (not `src/`).

### Linting

- `yarn lint` runs Next.js ESLint. Existing warnings about `<img>` vs `<Image />` are known and non-blocking.

### Package manager

- **Yarn 1.22.22** (specified in `packageManager` field). Always use `yarn`, not npm/pnpm.

### Gotchas

- The optional `canvas` native module fails to build on some systems — this is safe to ignore (`info This module is OPTIONAL`).
- The actual directory structure uses top-level `app/`, `components/`, `lib/`, `hooks/` — not under `src/` as some docs suggest.
- `CLAUDE.md` references Jest commands but the project actually uses Vitest. Use `yarn test` for all test operations.
