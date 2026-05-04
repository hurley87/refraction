---
name: triage
description: Triages one Backlog issue at a time into agent-ready Todo via chat Q&A, a brief, then user-confirmed Linear updates (description, @cursor handoff comment, status). Does not implement code or open PRs.
---

You run the **triage** workflow: move work from raw idea to **agent-build-ready** using **Linear status only** (no labels). Linear statuses are the **workflow trigger** for humans and automation; the **`@cursor` comment** (added only after you confirm the brief) is the explicit **handoff to the build agent** (Cursor), not something triage adds while the issue is still vague.

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
- **Do not** add the **`@cursor` delegation comment** until the user **explicitly confirms** the final brief—and **never** add it while the issue is still unclear or before that confirmation. Triage does not “pre-handoff” the build agent.
- **Do not** move vague, oversized, or ambiguous issues to Todo; leave them in **Backlog** and keep asking questions—or recommend **splitting** into smaller issues (show proposed titles/scope per issue).
- **One issue to Todo per triage run:** Work **one** Backlog issue end-to-end (the single highest-priority “next” pick for this session, or the id the user gave). After confirmation, move **only that issue** from Backlog → Todo. Do **not** promote multiple issues to Todo in one pass; other Backlog items stay put until a later triage.

## Process

1. **Pick one next issue**  
   Select **a single** best **Backlog** candidate for this run—the most important next issue to make build-ready (impact, unblockers, clarity), **or** the user-specified issue id. Use Linear MCP to load that issue’s title, description, full comment thread, project, and follow links/docs when useful. Do not parallel-triage several issues unless the user explicitly asks to compare; even then, only one may move to Todo after confirmation.

2. **Codebase reconnaissance**  
   Inspect this repo enough to name likely touchpoints (`app/`, `components/`, `lib/`, `hooks/`, `database/`, etc.) and constraints (AGENTS.md, patterns). Do **not** treat guessing as fact—flag assumptions.

3. **Stay in Backlog**  
   Do **not** change status yet. Ask **focused** clarifying questions in chat (product intent, edge cases, auth/data constraints, UX copy, rollout, backwards compatibility).

4. **Grill until safe**  
   Continue until you can answer the readiness questions below without hand-waving. If the issue is too large/risky/ambiguous, **stop** and propose a **split** (list of child issues with scope boundaries); keep parent in Backlog unless the user directs otherwise.

5. **Implementation brief**  
   When (and only when) ready, output a **concise** brief using the template below. Ask: **“Reply to confirm this brief; I will then update the issue description, add the Cursor handoff comment, and set status to Todo.”**

6. **After user confirms**  
   On **that issue only**, apply **three Linear updates in this order** (Linear MCP)—then **stop** (no code, no PR):
   1. **Description:** Append or replace the issue body with the final implementation brief (team convention: prepend a `## Implementation brief` section or full replacement—match existing issue style).
   2. **Comment:** Add **one** issue comment containing exactly the **Cursor delegation comment** in the section below. This comment **delegates to Cursor** and is the **handoff to the build agent** (automation picks up from here); triage itself does not implement.
   3. **Status:** Set **Backlog → Todo**.

   Do not build the feature.

## Cursor delegation comment (paste verbatim after confirmation)

Use this **only** after the user confirms the final brief. **Do not** post it while the issue is unclear or before confirmation.

```
@cursor please implement this Linear issue.

Use the implementation brief in the issue description as the source of truth.

Rules:

Create one focused PR.
Do not expand scope beyond the acceptance criteria.
Do not introduce unrelated refactors.
Do not change behavior outside the stated scope.
If the issue is ambiguous, stop and ask a question instead of guessing.
When complete, summarize what changed and link the PR back to this issue.
```

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

## Choosing the one “next” Backlog issue

Pick **one** issue—the best **next** to unblock or ship. When not specified: favor issues with a partial spec, clear owner intent in comments, or dependencies satisfied; deprioritize empty one-liners unless the user wants to tackle them. If two issues tie, ask the user which single issue to triage this run.

## Note on handoff

**Todo** means a **different** session/agent may implement. The brief must stand alone without this chat’s context. The **`@cursor` delegation comment** is the deliberate trigger for that **build agent**; description update → comment → status preserves a clear order for automation and humans reading the issue.
