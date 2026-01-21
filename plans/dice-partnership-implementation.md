# feat: DICE/Fever Partnership Implementation (Operational + Technical Plan)

## Context (Jan 2026 operational call)

This plan reflects the operational partnership discussion between IRL and DICE/Fever, focused on **implementation details** beyond legal documentation:

- **API access** for: ticket + scan data, venue check-ins, event discovery (Collections + event listing), and discount promotions.
- **In-venue purchases (POS)** + potential **Fever cashless** integration was identified as the **hardest / highest-risk** track and should be scoped after core foundations ship.
- The team outlined **experiments** (Standard Time, Public Records, Space) and **next steps** for both parties.

## Goals

- **Discovery**: browse/curate events via DICE **Collections** + broader **event listing API** access (not only “refractions events”).
- **IRL check-ins at events/venues**: map DICE events to IRL locations/checkpoints, with clear curation + visibility controls.
- **Ticket proof**: verify ticket ownership during check-in (and/or integrate scanning).
- **Scanning**: enable IRL-controlled scanning workflow if barcode data is available; otherwise ingest scan outcomes.
- **Promotions**: support discounts/promos with attribution (ideally automated promo-code generation).
- **POS/cashless (deferred)**: design a path to award points for in-venue purchases via Fever cashless or partner POS.

## Non-goals (explicitly deferred)

- Building a full in-app ticket checkout if the partnership only supports deep links.
- Shipping POS/cashless before discovery + ticket proof/scanning foundations are stable.

## Blockers (known)

1. **POS/cashless complexity**: time-intensive; requires separate Fever cashless team + possible changes to existing POS systems.
2. **Event listing scope**: currently limited to **“refractions events only”**, which blocks broad curation.
3. **Barcode availability**: whether ticket barcodes can be accessed via API is an open question and gates IRL-native scanning.

## Next steps (from the call)

### IRL

- Caitlin will examine the **volume of DICE events** across cities to inform curation strategy.
- Malcolm will identify **3 test cases** for POS experiments: **Standard Time**, **Public Records**, **Space**.
- IRL should prioritize running event tickets on **IRL’s own system** to maintain control and benefit from kickbacks.
- Continue partnerships with **Bridge**, **Privy**, **Stripe** for crypto-to-fiat rails.

### DICE/Fever

- Simon will investigate whether **ticket barcodes** can be made available via API so IRL can integrate scanning in-app.
- Simon + Dave will discuss expanding IRL’s access to the **event listing API** beyond only “refractions events”.
- Provide an **account manager** to Caitlin to guide best practices for onboarding promoters/venues to DICE.
- Maya will involve the **Fever cashless** team to scope POS integration once foundations are in place.
- Continue exploring an API for **automated promo code generation**.

## Architecture (server-first, credential-safe)

- **All DICE/Fever requests are server-side only** (Next.js Route Handlers / server actions). Never ship partner keys to clients.
- Use **Zod** at boundaries (query/body validation and upstream response validation).
- Prefer **feature flags** for capability-dependent areas (orders, checkout, scanning, promos).

```mermaid
flowchart TD
  apiAccess[APIAccessAndScopes] --> discovery[DiscoveryCollectionsAndListing]
  apiAccess --> ticketProof[TicketProofVerification]
  ticketProof --> scanningDecision[BarcodeOrScanDataDecision]
  scanningDecision --> scanning[ScanningIntegration]
  apiAccess --> promo[PromoCodePromotions]
  scanning --> posCashless[POSCashlessTrackDeferred]
```

## Workstreams + phases (incremental)

### Phase 0 — Capability confirmation + operational alignment (parallel, week 0)

Deliverable: a written “capabilities matrix” answering the open questions below (barcode/scans, listing scope, promos, identity model).

- Confirm event listing access scope (refractions-only vs broader) and whether **Collections** are available.
- Confirm whether IRL can access:
  - **Ticket barcodes** (format/spec/rotation) OR
  - **Scan results** (API/webhook/export), and required fields.
- Confirm promo-code generation API feasibility.
- Identify the correct identity key(s): email, phone, DICE user id, order id, ticket id.

### Phase 1 — Discovery (Collections + listing API) (week 1)

Deliverable: IRL can browse a broader event set (within allowed scope) and/or curated collections.

- Add server-only DICE clients + schemas under `lib/dice/` (or `lib/dice.ts` if you prefer a single file).\n - REST: events listing, collections, event details.\n - Typed upstream error handling: auth, 429/rate-limit, schema drift.\n- Add `app/api/dice/*` endpoints:\n - `GET /api/dice/events` with filters (city, date range, tags/genres, pagination).\n - `GET /api/dice/collections` and/or `GET /api/dice/collections/[id]` (if supported).\n - `GET /api/dice/events/[id]` (details).\n- Add RSC-first UI pages (e.g. `app/events/*`) to browse DICE events/collections.\n- Cache discovery responses (revalidate) and provide friendly errors on rate limits.

### Phase 2 — IRL curation + optional DB sync (week 1–2)

Deliverable: curated set of DICE events appear as IRL “checkable” locations (with controls).

Two viable approaches (choose per ops needs):

- **Option A (DB sync + curation)**: periodic sync into Supabase `locations` (good for fast UX and operational curation).\n - Keep minimal DICE columns: `dice_event_id`, `dice_event_state`, `dice_start_time`, `dice_end_time`.\n - Use a cron route `/api/dice/sync` to upsert.\n- **Option B (no DB sync)**: discovery-only, check-in targets are created manually/curated in IRL.\n
  Recommendation: start with **Option A** if IRL wants operational control and fast map browsing.

### Phase 3 — Ticket proof at check-in (week 2)

Deliverable: ticket-gated check-in for DICE events.

- Integrate DICE Partners GraphQL (ticket holders) server-side.\n- Add a minimal identity link:\n - Store `players.dice_linked_email` (or other agreed identifier).\n- At check-in time, if `location.dice_event_id` exists:\n - Verify ticket holder.\n - Return clear errors for “not linked” and “no ticket”.

### Phase 4 — Scanning integration (week 2–3, gated on barcode/scan capability)

Deliverable: robust in-venue validation + anti-fraud.

Two modes:

- **Mode A (preferred)**: IRL app performs scanning.\n - Requires: **barcode availability** + format/spec + rotation/expiry behavior.\n - IRL validates scan server-side and awards points.\n- **Mode B (fallback)**: scanning stays in DICE/Fever tools.\n - IRL consumes **scan events** (API/webhook/export), dedupes, and awards points.\n
  Key product choices:
- How to handle re-entry scans, partial scans, offline mode, and refunds/chargebacks.\n- How scan proof maps to “one check-in per user per event”.

### Phase 5 — Promotions / discounts (week 3, gated on promo API)

Deliverable: trackable discount campaigns.

- If DICE ships automated promo API:\n - Generate codes programmatically per campaign/partner, with constraints (expiry, max uses, eligible events).\n - Require reporting fields to attribute redemptions to IRL.\n- Fallback:\n - Manual promo codes with operational tracking.

### Phase 6 — POS / Fever cashless integration (deferred; highest risk)

Deliverable: points awarded for in-venue purchases.

Principle: **do not start build** until (a) foundations ship and (b) Fever cashless team confirms integration shape.

Pilot experiments (from call):

- **Standard Time**\n- **Public Records**\n- **Space**\n
  Minimum data contract (what IRL needs, regardless of vendor):
- purchase id, venue id, timestamp\n- user identifier mapping (cashless user id ↔ IRL user)\n- line items or totals (including tax/tip) and currency\n- refunds/voids/chargebacks and how they should affect points\n- idempotency guarantees + replay window\n
  Operational decisions required:
- whether points are awarded per purchase, per category, or per spend tier\n- how “guest checkout” is handled (no user identity)\n- privacy constraints and data retention

## Clarifying questions (use in partner follow-ups)

### A) Discovery (Collections + listing API)

- What is the **full scope** of events IRL can access (refractions-only vs broader)? What’s the timeline to expand?\n- Do you support **Collections** APIs? What are the collection types and how are they curated?\n- What filters are available: city/geo radius, date range, genre/tags, venue, promoter?\n- Pagination model: cursor vs page/limit. Stable ordering guarantees?\n- What media fields are available (hero image, thumbnails, lineup/artist images)?\n- Rate limits (per minute/hour) and recommended caching strategy.\n- Do events include accurate venue coordinates, or must IRL geocode?\n

### B) Ticket proof (ticket holders / orders)

- What identifiers can we query by: **email**, phone, DICE user id, order id?\n- Are there privacy constraints around fan emails (hashing, consent requirements)?\n- Can ticket holder APIs filter without pagination (or do we need to page)?\n- What constitutes a “valid ticket” (status values; transferred tickets; cancellations)?\n- Can IRL retrieve a stable ticket id/order id for audit logs?\n

### C) Scanning / barcodes / scan data

- Can IRL access **ticket barcodes via API**?\n - If yes: what is the barcode type (QR/PDF417/etc), payload format, rotation/expiry behavior, and anti-forgery requirements?\n- If barcodes are not available: can IRL receive **scan outcomes**?\n - Via webhook? Polling API? Daily export?\n - Required fields: event id, ticket id/order id, scan timestamp, scan status, venue/door.\n- How are re-entry scans represented?\n- How do refunds/chargebacks affect scan validity?\n- What is the recommended dedupe/idempotency key?\n

### D) Promotions / discounting

- Will there be an API for **automated promo code generation**?\n- Constraints supported: per-event, per-collection, per-venue, start/end time, max uses, min spend.\n- What reporting is available (redemptions, revenue impact, attribution to IRL)?\n

### E) POS / Fever cashless (the hard track)

- What integrations are feasible today: Fever cashless only, or external POS too?\n- What is the purchase event schema and how do we map it to IRL identities?\n- Is there a “cashless user id” we can link to an IRL user at onboarding?\n- Latency expectations: real-time vs batch.\n- How are refunds/voids communicated and when should points be reversed?\n- What is the minimum viable pilot we can run at Standard Time / Public Records / Space?\n

### F) Security, compliance, and operations

- Key management: how are API keys provisioned/rotated? Separate keys per environment?\n- Audit logging expectations (what we must store for disputes).\n- SLAs and support process (account manager escalation path).\n

## Success criteria (definition of “working”)

- IRL can browse events/collections within allowed scope and curate what appears.\n- Ticket-gated check-in works reliably for DICE events.\n- Scanning path is decided (barcode vs scan events) and implemented for at least one pilot.\n- Promo mechanism exists (API or manual) with clear attribution.\n- POS/cashless is scoped with a written data contract and a concrete pilot plan.
