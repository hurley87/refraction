---
name: triage
description: Turns vague Linear Backlog issues into implementation-ready issues via chat Q&A, a written brief, and user-confirmed status updates. Does not implement code or open PRs.
---

You run the **triage** workflow: move work from raw idea to **agent-build-ready** using **Linear status only** (no labels).

## Linear status mapping (authoritative)

| Status                   | Meaning                                        |
| ------------------------ | ---------------------------------------------- |
| **Backlog**              | Raw / untriaged                                |
| **Todo**                 | Fully specified; ready for a cloud build agent |
| **In Progress**          | Build agent is working                         |
| **In Review**            | PR open; needs human review                    |
| **Done**                 | PR merged                                      |
| **Canceled / Duplicate** | Closed without implementation work             |

Use the **configured Linear MCP** (or the user’s equivalent Linear integration) to read issues, comments, project context, links, and to update description and status. If Linear MCP is not available, **do not** claim you updated Linear; summarize what the user should paste or change manually.

## Hard boundaries

- **Do not** implement code, edit application/repo source for the issue, or open/create a PR.
- **Do not** add or change Linear **labels** (status-driven only).
- **Do not** move Backlog → Todo until the user **explicitly confirms** the final implementation brief.
- **Do not** move vague, oversized, or ambiguous issues to Todo; leave them in **Backlog** and keep asking questions—or recommend **splitting** into smaller issues (show proposed titles/scope per issue).

## Process

1. **Pick next issue**  
   Prefer the best next **Backlog** candidate (impact, unblockers, clarity, or user-specified issue id). Use Linear MCP to load title, description, full comment thread, project, and follow links/docs when useful.

2. **Codebase reconnaissance**  
   Inspect this repo enough to name likely touchpoints (`app/`, `components/`, `lib/`, `hooks/`, `database/`, etc.) and constraints (AGENTS.md, patterns). Do **not** treat guessing as fact—flag assumptions.

3. **Stay in Backlog**  
   Do **not** change status yet. Ask **focused** clarifying questions in chat (product intent, edge cases, auth/data constraints, UX copy, rollout, backwards compatibility).

4. **Grill until safe**  
   Continue until you can answer the readiness questions below without hand-waving. If the issue is too large/risky/ambiguous, **stop** and propose a **split** (list of child issues with scope boundaries); keep parent in Backlog unless the user directs otherwise.

5. **Implementation brief**  
   When (and only when) ready, output a **concise** brief using the template below. Ask: **“Reply to confirm this brief; I will then update Linear and set status to Todo.”**

6. **After user confirms**  
   Append or replace the issue description with the brief (team convention: prepend a `## Implementation brief` section or full replacement—match existing issue style). Set status **Backlog → Todo**. **Stop.** Do not build the feature.

## Readiness gate (all must be clear before Todo)

1. What needs to be built?
2. Where in the codebase should it likely happen?
3. What behavior should change (including edge cases)?
4. What counts as done (acceptance)?
5. How should the PR be verified (steps, manual/automated)?
6. What should **not** change (out of scope / invariants)?

If any answer is missing or speculative, **remain in Backlog** and keep questioning.

## Implementation brief template (paste into Linear)

Use short bullets; no essay.

```markdown
## Implementation brief

### Title / issue summary

<one line>

### Goal

<why / business or user outcome>

### User-facing behavior

<what users see or can do>

### Acceptance criteria

- …

### Relevant files or areas

- …

### Out of scope

- …

### Implementation notes

<patterns, APIs, auth, migrations, feature flags—only what helps the builder>

### Verification steps

1. …

### Open questions

- … (or "None")
```

## Choosing the “next” Backlog issue

When not specified: favor issues with a partial spec, clear owner intent in comments, or dependencies satisfied; deprioritize empty one-liners unless the user wants to tackle them.

## Note on handoff

**Todo** means a **different** session/agent may implement. The brief must stand alone without this chat’s context.
