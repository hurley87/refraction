# DICE Implementation Plan

## Goals

- **Discovery**: browse/curate events via DICE **Collections** + broader **event listing API** access
- **IRL check-ins at events/venues**: map DICE events to IRL locations/checkpoints, with clear curation + visibility controls.
- **Ticket proof**: verify ticket ownership during check-in.
- **Promotions**: support discounts/promos with attribution (ideally automated promo-code generation).

## Non-goals (explicitly deferred)

- Building a full in-app ticket checkout if the partnership only supports deep links.

## Technical Details

DICE's **Ticket Holders API (THAPI)** has been confirmed to support these technical requirements:

- **API Endpoint**: `https://partners-endpoint.dice.fm/graphql` (GraphQL)
- **Authentication**: MIO-managed Bearer tokens
- **Confirmed capabilities**: events, orders, ticket holders, tickets

## Operation requirements

- **Ticketing → IRL rewards**: IRL will build against DICE APIs to ingest ticket data and award points.
- **Account linking**: email as the primary key
- **Event discovery**: curated discovery can be supported via DICE Collections and/or the event listing API.
- **Promos**: supported short term via bulk promo code exports, with potential API automation longer term.

## THAPI Integration Details

DICE's Ticket Holders API (THAPI) is a GraphQL API accessible at `https://partners-endpoint.dice.fm/graphql`.

### Authentication

- Bearer token authentication via MIO-managed API tokens (DICE's internal back office)
- Tokens are provisioned per partner account

### Key GraphQL Queries

**Fetch tickets for an event**:

```graphql
query GetEventTickets($eventId: ID!) {
  node(id: $eventId) {
    ... on Event {
      id
      name
      startDatetime
      tickets(first: 50) {
        edges {
          node {
            id
            ticketType {
              id
              name
              description
            }
            holder {
              id
              firstName
              lastName
              email
            }
            claimedAt
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
}
```

**Query tickets by fan email**:

```graphql
query GetTicketsByEmail($email: String!) {
  viewer {
    tickets(first: 50, where: { fanEmail: { eq: $email } }) {
      edges {
        node {
          id
          ticketType {
            name
          }
          holder {
            email
          }
        }
      }
    }
  }
}
```

**Query orders with purchase date filter**:

```graphql
query GetOrders($purchasedAfter: Datetime!) {
  viewer {
    orders(first: 50, where: { purchasedAt: { gte: $purchasedAfter } }) {
      edges {
        node {
          id
          purchasedAt
          tickets {
            holder {
              email
            }
          }
        }
      }
    }
  }
}
```

## Workstreams + phases (incremental)

### Phase 0 — Capability confirmation + operational alignment (parallel, week 0)

Deliverable: answering the open questions below (listing scope, promos, identity model).

- Confirm event listing access scope (refractions-only vs broader) and whether **Collections** are available.
- Confirm promo-code generation API feasibility.
- Identify the correct identity key(s): email, DICE user id, order id, ticket id.

Acceptance criteria:

- A single section (this doc) lists: endpoints, auth, rate limits, schemas, and confirmed identifiers.
- Unknowns are explicitly tracked with an owner (DICE vs IRL) and a target date.

### Phase 1 — Discovery (Collections + listing API) (1 week)

Deliverable: IRL can browse a broader event set (within allowed scope) and/or curated collections.

- Add server-only DICE discovery client + Zod schemas under `lib/dice/` (or `lib/dice.ts` if you prefer a single file).
  - Treat protocol as TBD until confirmed (REST vs GraphQL).
  - Typed upstream error handling: auth failures, 429/rate-limit, schema drift.
- Add `app/api/dice/*` endpoints:
  - `GET /api/dice/events` with filters (city, date range, tags/genres, pagination).
  - `GET /api/dice/collections` and/or `GET /api/dice/collections/[id]` (if supported).
  - `GET /api/dice/events/[id]` (details).
- Add RSC-first UI pages (e.g. `app/events/*`) to browse DICE events/collections.
- Cache discovery responses (revalidate) and provide friendly errors on rate limits.

Acceptance criteria:

- `GET /api/dice/events` returns stable pagination + deterministic ordering.
- Rate limit errors surface as a user-friendly message and are observable in server logs.

### Phase 2 — IRL curation + optional DB sync (1 week)

Deliverable: curated set of DICE events appear as IRL "checkable" locations (with controls).

Two viable approaches (choose per ops needs):

- **Option A (DB sync + curation)**: periodic sync into Supabase `locations` (good for fast UX and operational curation).
  - Keep minimal DICE columns: `dice_event_id`, `dice_event_state`, `dice_start_time`, `dice_end_time`.
  - Use a cron route `/api/dice/sync` to upsert.
- **Option B (no DB sync)**: discovery-only; check-in targets are created manually/curated in IRL.

Recommendation: start with **Option A** if IRL wants operational control and fast map browsing.

Acceptance criteria:

- A DICE event can be selected/curated and becomes an IRL "checkable" entity with visibility controls.
- Sync (if Option A) is idempotent (safe to re-run) and logs the upsert count + failures.

### Phase 3 — Ticket proof at check-in (1 week)

Deliverable: ticket-gated check-in for DICE events.

- Integrate DICE THAPI GraphQL (Ticket Holders API) server-side.
- Add identity linking:
  - Primary key: **email** (IRL uses email-only linking)
  - Store `players.dice_linked_email`
  - Edge cases (e.g., Sign in with Apple email relay) to be handled during implementation
- At check-in time, if `location.dice_event_id` exists:
  - Query THAPI for ticket holder by email
  - Verify ticket holder and valid ticket status
  - Return clear errors for "not linked" and "no ticket"

Acceptance criteria:

- For a DICE-mapped location, check-in is blocked unless ticket proof succeeds.
- Errors are deterministic and actionable (not linked / no ticket / upstream unavailable / rate limited).
- All check-in attempts are auditable with identifiers (event id + player id + timestamp + outcome).

### Phase 4 — Promotions / discounts (1 week)

Deliverable: trackable discount campaigns.

Two-phase approach (confirmed alignment):

- **Short term**: bulk promo code exports (manual operational process)
  - DICE provides promo codes via export
  - IRL tracks redemptions and attribution manually
- **Longer term**: potential API automation (to be explored)
  - Generate codes programmatically per campaign/partner
  - Constraints: expiry, max uses, eligible events
  - Reporting fields to attribute redemptions to IRL

Acceptance criteria:

- A promo campaign can be created and attributed to IRL (manual export is sufficient for initial pilots).
- Redemptions can be reconciled against DICE reporting fields (or a documented workaround if not available).

## Clarifying questions (use in partner follow-ups)

### A) Discovery (Collections + listing API)

- What media fields are available (hero image, thumbnails, lineup/artist images)?
- Rate limits (per minute/hour) and recommended caching strategy.
- Do events include accurate venue coordinates, or must IRL geocode?

### B) Ticket proof (ticket holders / orders)

- Privacy constraints around fan emails (hashing, consent requirements)?
- What constitutes a "valid ticket" (status values; transferred tickets; cancellations)?
- Can IRL retrieve a stable ticket id/order id for audit logs?

### C) Promotions / discounting

- When will automated promo code generation API be available?
- Constraints supported: per-event, per-collection, per-venue, start/end time, max uses, min spend?
- What reporting is available (redemptions, revenue impact, attribution to IRL)?

## Observability + operations (minimum requirements)

- **Audit log**: store a record of ticket-proof checks with:
  - `player_id`, `dice_event_id`, timestamp, outcome (success/failure reason)
  - identifiers used (email), stored minimally and securely
- **Backfill/replay**: a safe-to-re-run job (polling or import) that relies on idempotency rules above.
- **Feature flags**: gate discovery scope, ticket proof, and promos.

## Success criteria (definition of "working")

- IRL can browse events/collections within allowed scope and curate what appears.
- Ticket-gated check-in works reliably for DICE events.
- Promo mechanism exists (API or manual) with clear attribution.
