# Contributor Guide

Welcome, and thank you for contributing to this project! This guide outlines the standards, workflows, and best practices for all contributors ("agents") working on the codebase.

## Project Overview

This is a modern Next.js project using TypeScript, Tailwind CSS, and best-in-class UI/UX frameworks (e.g., Shadcn UI, Radix UI). We value clean code, robust architecture, and a great developer experience.

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
