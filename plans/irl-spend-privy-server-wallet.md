# IRL Spend — Privy Server Wallet Pilot

## Summary

A controlled test of IRL Spend powered by **Privy server wallets** and **gas-sponsored stablecoin transactions**. Users fund their IRL server wallet with stablecoins, then tap to confirm on-chain purchases at events by scanning a QR code generated from a **Spend Experience** configured in the IRL CMS. Every confirmed transaction posts back to the admin dashboard and automatically issues configurable points (default **100**) to the user.

This plan targets a **controlled test on May 6th** and a build window of the week prior.

## Objective

Prove that IRL can run real, on-chain, in-person spend at a live event without the user paying gas, without staff running a card terminal, and without the user leaving the IRL app.

The user journey is intentionally tight:

1. User funds their IRL server wallet with stablecoins.
2. Staff shows a QR for a pre-configured **Spend Experience** (e.g. "Drink Ticket").
3. User scans, confirms the transaction in IRL, and it settles on-chain with IRL sponsoring gas.
4. Admin sees the confirmed transaction in real time.
5. User receives the configured points (default 100).

## Why this plan (vs. `irl-spend.md`)

The existing `irl-spend.md` plan uses **Stripe Terminal** for card-present payments in v1, with Privy only as the identity layer. This plan replaces that critical path with a **Privy server wallet + stablecoin** flow and keeps Stripe Terminal out of v1 entirely.

- `irl-spend.md`: IRL identity → Stripe Terminal card read → points.
- This plan: IRL-held Privy server wallet → QR-scan confirm → gas-sponsored USDC transfer → points.

The `/walletconnect` experience in this repo is the closest existing surface and is the reference pattern for the scan-and-confirm UX.

### Important: Stripe Terminal does not support stablecoin payments

Stripe Terminal is a card-present product (EMV chip, contactless, swiped) plus NFC mobile wallets (Apple Pay, Google Pay, Samsung Pay). **Stablecoin / USDC acceptance is not available on Stripe Terminal.** Stripe's stablecoin acceptance is an online-only product, exposed through Checkout, Payment Links, Elements, and the Payment Intents API — not through the in-person Terminal stack.

This is the core reason this plan does not sit on top of Stripe Terminal: there is no supported Stripe path to take USDC at the reader. To do stablecoin spend in person, we own the rails (Privy server wallet + paymaster + direct ERC-20 transfer) rather than waiting on a Stripe product that does not exist.

References:

- [Stripe Terminal global availability / supported card brands](https://docs.stripe.com/terminal/payments/collect-card-payment/supported-card-brands) — Terminal supports card brands and NFC mobile wallets; no mention of stablecoins.
- [Stripe Terminal overview](https://docs.stripe.com/terminal/overview) — describes EMV / contactless / swiped and Tap to Pay; does not include stablecoins.
- [Stablecoin payments — Stripe Docs](https://docs.stripe.com/payments/stablecoin-payments) — lists the integration surfaces (Checkout, Payment Links, Elements, Payment Intents); **Terminal is not listed**.
- [Accept stablecoin payments](https://docs.stripe.com/payments/accept-stablecoin-payments) — same online-only integration surfaces, US-businesses-only, USD settlement.
- [Stablecoin and Crypto Payments (Support)](https://support.stripe.com/user/topics/stablecoin-and-crypto-payments) — Stripe's consolidated help topic; confirms stablecoin acceptance is a Stripe payment method for online flows.

Implication for `irl-spend.md`: if a future phase of that plan says "Stripe Terminal for stablecoin," that is not possible today. Stablecoin at the point of sale must come from a non-Terminal path, which is what this plan provides.

## Scope of the Controlled Test (May 6th)

### In scope

- One event, one merchant line (e.g. "Drink Ticket").
- One chain, one stablecoin. **Recommendation: USDC on Base**, matching `lib/walletconnect-poster-direct-usdc.ts` and `/walletconnect`.
- Privy **server wallets** provisioned per IRL user.
- User-initiated funding of their own server wallet with USDC.
- IRL-sponsored gas via a paymaster (Privy smart wallets / ERC-4337).
- CMS in admin to create and manage **Spend Experiences**.
- QR generation per Spend Experience (or per session).
- In-app QR scan + confirm flow (modeled on `/walletconnect`).
- Admin transaction ledger with real-time updates.
- Configurable points per Spend Experience (default 100).
- A single known recipient treasury wallet per Spend Experience.

### Out of scope for the controlled test

- Fiat on-ramps to fund the server wallet (manual USDC transfer only).
- Off-ramps, settlements, or payouts to merchants on-chain.
- Refunds and disputes tooling.
- Multi-chain routing or multi-token support.
- Bridge card, Bridge balances, Tempo integration.
- Stripe Terminal.
- Full KYC/AML flows beyond what Privy provides by default.

## System Architecture

### Actors & Components

- **IRL App (Next.js 14)** — user-facing flows, QR scan, confirmation UI, transaction status.
- **Privy** — user auth + **server wallets** provisioned on the user's behalf.
- **Paymaster** — sponsors gas for the server wallet transaction. Use Privy smart-wallet / bundler support on Base.
- **Supabase** — persistence for spend experiences, QR sessions, transactions, and points ledger entries.
- **Admin CMS (`app/admin/spend/`)** — configure experiences, view live transactions, view aggregate stats.
- **On-chain** — USDC ERC-20 transfer on Base from user server wallet → treasury wallet.

### High-level flow

```
[Admin CMS] -- creates Spend Experience + treasury recipient + price + points --> [Supabase]
         |
         +--> generates stable QR (payload: spend_experience_id or spend_session_id)

[Staff] -- displays QR at checkout

[User] opens IRL -> scans QR (camera) -> /spend/[session] client page
                 -> server reads experience/session
                 -> shows price, item, points, confirm button
                 -> user taps Confirm
                 -> POST /api/spend/confirm
                     -> server validates (experience active, balance sufficient, idempotency key)
                     -> Privy server wallet sends USDC transfer (gas sponsored)
                     -> persist spend_transaction row (status=pending -> confirmed)
                     -> on confirmation: award points to player (configurable, default 100)
                     -> emit realtime update for admin dashboard
```

### Why server wallet (not user EOA)

- Removes wallet-UX friction; user never signs a raw EVM transaction.
- IRL fully controls the transaction construction and gas sponsorship.
- Matches the pattern needed for future deeper reward programmability.
- Keeps the user in IRL; no external wallet app required.

## Data Model (Supabase)

New tables under `database/` (follow existing patterns in `lib/db/spend.ts`):

### `spend_experiences`

CMS-managed content.

- `id` (uuid, pk)
- `event_id` (uuid, fk → events, nullable for test)
- `name` (text) — e.g. "Drink Ticket"
- `description` (text, nullable)
- `image_url` (text, nullable)
- `price_usdc` (numeric) — e.g. `1.00`
- `token_address` (text) — USDC on Base
- `chain_id` (int) — 8453 (Base)
- `recipient_wallet` (text) — treasury address receiving USDC
- `points_reward` (int, default 100) — **configurable in CMS**
- `is_active` (bool, default true)
- `created_at`, `updated_at`, `created_by`

### `spend_sessions` (optional for v1; can key on experience directly)

Per-QR session if we want one-time QR codes or attribution windows.

- `id` (uuid, pk)
- `spend_experience_id` (fk)
- `expires_at` (timestamptz, nullable)
- `created_at`

### `spend_transactions`

- `id` (uuid, pk)
- `spend_experience_id` (fk)
- `spend_session_id` (fk, nullable)
- `user_id` / `player_id` (fk → players)
- `user_wallet_address` (text) — the Privy server wallet
- `recipient_wallet` (text)
- `amount_usdc` (numeric)
- `chain_id` (int)
- `tx_hash` (text, nullable until confirmed)
- `status` (enum: `pending`, `submitted`, `confirmed`, `failed`)
- `points_awarded` (int)
- `idempotency_key` (text, unique)
- `error_reason` (text, nullable)
- `created_at`, `confirmed_at`

### `points_ledger` (reuse existing if present)

Append an entry of type `spend` tied to `spend_transactions.id`.

Indexes: `(spend_experience_id, created_at desc)`, `(player_id, created_at desc)`, unique `(idempotency_key)`.

## API Surface

All responses via `apiSuccess()` / `apiError()` / `apiValidationError()` from `lib/api/response.ts`. All inputs validated with Zod.

### Public / user-facing

- `POST /api/spend/session/[id]/preview` — return experience details for the scan page (price, item, points, active/expired).
- `POST /api/spend/confirm` — body: `{ spend_experience_id, spend_session_id?, idempotency_key }`.
  - Resolves user's Privy server wallet.
  - Checks USDC balance on Base.
  - Builds ERC-20 `transfer` call; submits via Privy server-wallet SDK with paymaster.
  - Writes `spend_transactions` row; returns status + tx hash when submitted.
- `GET /api/spend/transaction/[id]` — status polling.
- `POST /api/spend/wallet/fund-instructions` — returns the user's Privy server wallet address + chain + token contract to display funding QR / copy address.

### Admin

- `POST /api/admin/spend/experiences` — create.
- `PATCH /api/admin/spend/experiences/[id]` — edit (including `points_reward` and `is_active`).
- `GET /api/admin/spend/experiences` — list.
- `GET /api/admin/spend/experiences/[id]/qr` — render a stable QR payload (e.g. `irl://spend/experience/<id>` or `https://<host>/spend/<id>`).
- `GET /api/admin/spend/transactions` — live feed with filters (experience, status, date).
- Realtime: Supabase channel `spend_transactions` for live admin view.

## Frontend Surfaces

### User

- `app/spend/[experienceId]/page.tsx` — scan landing page. Mirrors `/walletconnect` structure: shows experience card, price, expected points, and a prominent **Confirm** button. Reuses UX primitives from `components/walletconnect/*` and `components/ui/*`.
- `app/wallet/funding/page.tsx` (or a drawer in existing wallet UI) — shows the user's Privy server wallet address + QR + copy button, with explicit "Send USDC on Base only" warning. Reuse `fetchUsdcBalanceOnBase` from `lib/walletconnect-poster-direct-usdc.ts`.
- In-app camera QR reader — reuse `components/walletconnect/payment-link-qr-reader-dialog.tsx` as the pattern; extend it to accept our IRL-spend QR payloads.

### Admin CMS

- `app/admin/spend/page.tsx` — list of Spend Experiences, create/edit modal (name, price, recipient, image, `points_reward`, active toggle). Show/download QR.
- `app/admin/spend/transactions/page.tsx` — live transaction feed with status, user, experience, tx hash link to Basescan.

### Hooks

- `hooks/useServerWallet.ts` — fetches/creates the Privy server wallet for the signed-in user, exposes address + balance.
- `hooks/useSpendExperience.ts` — loads experience by id.
- `hooks/useSpendConfirm.ts` — submits confirmation with idempotency key.

## Key Implementation Notes

### Privy server wallets + gas sponsorship

- Use Privy's server wallet SDK (server-side in Next.js route handlers / server actions). Do **not** expose any server wallet signing key client-side.
- Provision the server wallet lazily on first spend flow entry (or on login) and persist the mapping `privy_user_id → wallet_address`.
- Submit USDC transfer as a smart-wallet user operation with a sponsored paymaster. Target chain: **Base**. Record `userOpHash` and the settled `tx_hash` once confirmed.
- If Privy smart-wallet gas sponsorship is not enabled for the current tenant, block the pilot early; do not try to route through the user's EOA.

### QR pattern (modeled on `/walletconnect`)

- Admin QR encodes a URL like `https://<host>/spend/<experienceId>` (or a session id).
- The IRL app's in-app scanner recognizes the pattern, routes to the confirm screen, and short-circuits the browser round-trip.
- External scanners (iOS camera) also land on the confirm screen via universal link.

### Idempotency & concurrency

- Client generates a UUID idempotency key per confirm tap.
- Server rejects duplicates via unique index on `spend_transactions.idempotency_key`.
- Points are awarded **only** on `status=confirmed` transition, in the same DB transaction that flips status.

### Balance check & UX

- Before submitting the user op, check on-chain USDC balance. If insufficient, show a funding drawer (wallet address + QR + copy) and block confirmation.
- Use the existing `USDC_WARNING_THRESHOLD` and helpers in `lib/walletconnect-poster-direct-usdc.ts` where applicable.

### Points

- `points_reward` read from the experience row at confirmation time (so CMS edits before confirm apply; edits after confirm do not).
- Default **100**. Editable in CMS via `PATCH /api/admin/spend/experiences/[id]`.
- Hook into existing `updatePlayerPoints` + `checkAndTrackTierProgression` pipeline (see `lib/db/spend.ts`) so tier progression continues to work.

### Analytics

- Extend `lib/analytics/server.ts` with events: `spend_qr_scanned`, `spend_confirm_started`, `spend_confirm_submitted`, `spend_confirm_succeeded`, `spend_confirm_failed`, `spend_points_awarded`.

## Build Plan (week before May 6th)

Ordered by dependency, not calendar.

1. **Infra & schema**
   - Supabase migrations for `spend_experiences`, `spend_sessions`, `spend_transactions` (+ points ledger hook).
   - Env vars for Privy server wallet credentials, paymaster, and Base RPC.
2. **Server wallet plumbing**
   - `lib/privy/server-wallet.ts`: create/get wallet for a Privy user.
   - Paymaster-sponsored USDC transfer helper.
   - Unit tests (Vitest, happy-dom) for wallet resolution + transfer call construction.
3. **Admin CMS**
   - `app/admin/spend/page.tsx` create/edit/list + QR display.
   - Admin API routes with Zod schemas.
4. **User confirm flow**
   - `app/spend/[experienceId]/page.tsx` + confirm API.
   - Reuse QR reader component from `components/walletconnect/`.
   - Funding drawer (wallet address + copy/QR + balance check).
5. **Admin live transactions**
   - `app/admin/spend/transactions/page.tsx` with realtime updates.
6. **Points issuance + tier progression wiring**
   - Ensure `points_reward` flows through existing `updatePlayerPoints` / tier checks.
7. **End-to-end dry run**
   - Staging event with 5–10 internal users.
   - Funding, scan, confirm, points, admin feed, tx hash verified on Basescan.
8. **Controlled test — May 6th**
   - One event, one Spend Experience ("Drink Ticket", $1 USDC, 100 points).
   - Live transaction dashboard visible to operators.

## Risks & Mitigations

- **Paymaster outages / limits** — monitor sponsorship balance; add a hard kill switch per experience (`is_active=false`).
- **User funding friction** — funding must happen before the event; we will pre-onboard pilot users with clear instructions and a funding QR. No in-app on-ramp in v1.
- **Server wallet provisioning latency at the moment of scan** — pre-provision on login instead of on first scan.
- **Duplicate confirmations** — enforced via idempotency key + unique index; UI disables the confirm button on submit.
- **Wrong chain / wrong token sends to server wallet** — warning UI pinned to Base + USDC only; any inbound non-USDC assets are ignored for v1.
- **Points over-issuance** — points awarded only inside the same DB transaction that flips status to `confirmed`.

## Success Metrics (controlled test)

- ≥ **25** real attendee transactions processed end-to-end.
- ≥ **95%** of submitted transactions confirm on-chain.
- ≥ **95%** of confirmed transactions issue points within 5 seconds.
- **0** cases of duplicate points for the same transaction.
- **0** cases where the user paid gas.

## Open Questions

- Which paymaster provider (Privy-native smart-wallet sponsor vs. external bundler/paymaster)?
- One-time QR per sale vs. stable QR per experience — default is stable; revisit if attribution gets noisy.
- Do we need an explicit merchant treasury split, or is a single recipient wallet enough for the test?
- Do we expose the user's server wallet address visibly in the profile, or only in a funding drawer for v1?
- Is `points_reward` always a flat number per experience for v1, or do we need tiers/multipliers already?

## Decision

Ship the smallest possible Privy server wallet spend loop for May 6th: CMS-configured Spend Experience → stable QR → in-app scan + confirm → gas-sponsored USDC transfer → real-time admin feed → configurable points (default 100). Everything else — fiat on-ramps, multi-chain, Bridge/Tempo, Stripe Terminal — is explicitly deferred.
