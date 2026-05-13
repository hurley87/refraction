# Spend rails end-to-end QA matrix (Base USDC vs Stellar USDC)

Repeatable manual checklist for operators validating the **shared** IRL Spend flow (QR → session → conversion preview → conversion/funding → payment → receipt) on **Base** and **Stellar** rails. Product code paths: `app/spend/[id]/page.tsx` (`/spend/{experienceId}`), `components/spend/spend-experience-page.tsx`, admin under `app/admin/spend-experiences/`.

**PII / safety:** Use placeholders for addresses in notes; do not paste private keys or secrets into tickets. Server-only secrets are named only in [`.env.local.example`](../.env.local.example)—never commit real values.

---

## Prerequisites (both rails)

- [ ] Staging or dev app deployed with valid **Privy**, **Supabase**, and **Mixpanel** (`NEXT_PUBLIC_MIXPANEL_TOKEN` / server secret per env).
- [ ] Admin account can access `/admin/spend-experiences` and open an experience’s **QR** page (`/admin/spend-experiences/{experienceId}/qr`).
- [ ] Test player has enough **IRL points** for the experience’s configured conversion (pilot defaults are often 1000 points = $1 USDC, capped per experience).
- [ ] **Mixpanel** project selected; Live view or export usable for the test user’s `distinct_id` (see identity rules in [`docs/APP_OVERVIEW.md`](./APP_OVERVIEW.md) Mixpanel section).

---

## Environment & non-secret configuration (see `.env.local.example`)

Use [`.env.local.example`](../.env.local.example) as the authoritative name list. Below is a **checklist of pointers** for public Stellar / Base spend testing—**not** secret values.

### Kill switches and rail availability (IRL-10 semantics)

- [ ] `SPEND_RAIL_BASE_USDC_ENABLED` — set as needed for Base tests (default in example comments: on).
- [ ] `SPEND_RAIL_STELLAR_USDC_ENABLED` — set `true` only when Stellar path is under test; when `false` or required vars missing/invalid, **new sessions** and **user mutating** spend APIs for that rail should block (see “Disabled / misconfigured rail” rows below).

### Base USDC (non-secret highlights)

- [ ] `SPEND_RAIL_BASE_USDC_TREASURY_WALLET_ADDRESS` — funded treasury for user USDC funding after conversion.
- [ ] `SPEND_RAIL_BASE_USDC_RECEIVING_WALLET_ADDRESS` — settlement / final payment destination (read-only in admin for v1).
- [ ] `SPEND_RAIL_BASE_USDC_PRIVY_SERVER_WALLET_ID` — matches server signing setup for Base operations.
- [ ] `SPEND_RAIL_BASE_USDC_USDC_CONTRACT` — USDC contract on Base (example documents mainnet default).
- [ ] `SPEND_RAIL_BASE_USDC_RPC_URL` / `NEXT_PUBLIC_BASE_RPC` — consistent RPC access for verification.
- [ ] `NEXT_PUBLIC_SPEND_RAIL_BASE_USDC_EXPLORER_TX_URL_TEMPLATE` — e.g. `https://basescan.org/tx/{txHash}`; **Base regression** uses whatever template is configured here (not a hardcoded production URL assumption).

### Stellar USDC (public network testing)

- [ ] `NEXT_PUBLIC_STELLAR_NETWORK` — e.g. `PUBLIC` for main public network (per example).
- [ ] `NEXT_PUBLIC_STELLAR_HORIZON_URL` — optional Horizon override when set (validated when present).
- [ ] `NEXT_PUBLIC_SPEND_RAIL_STELLAR_USDC_EXPLORER_TX_URL_TEMPLATE` — e.g. StellarExpert public tx URL with `{txHash}` placeholder (example in `.env.local.example`).
- [ ] `SPEND_RAIL_STELLAR_USDC_RECEIVING_ADDRESS` — `G…` settlement destination.
- [ ] `SPEND_RAIL_STELLAR_USDC_TREASURY_ADDRESS` — treasury for conversion funding (optional separate from receiving when documented).
- [ ] `SPEND_RAIL_STELLAR_USDC_USDC_ISSUER` / `SPEND_RAIL_STELLAR_USDC_ASSET_CODE` — USDC trustline / payment alignment on the chosen network.
- [ ] **Server-only (existence check only in QA notes):** `SPEND_RAIL_STELLAR_USDC_TREASURY_SECRET_KEY`, `SPEND_RAIL_STELLAR_USDC_SPONSOR_SECRET_KEY` — required for real Stellar funding/sponsor flows; **never** document or paste key material; confirm only that env names are set in the deployment per `.env.local.example`.
- [ ] `SPEND_RAIL_STELLAR_USDC_CREATE_ACCOUNT_XLM` — optional starting XLM for new accounts (default documented in example).

### Fixtures (operators)

- [ ] **Base:** Treasury holds enough **Base USDC**; server wallet / Privy setup can submit or observe funding and user payment verification per environment.
- [ ] **Stellar:** Treasury holds enough **Stellar USDC**; sponsor account can pay fees; test user gets a **Privy-managed Stellar account** with trustline as the product flow requires.
- [ ] **Receiving wallets** (both rails) are correct for the environment so successful payments are economically acceptable for a test.

---

## Matrix: test areas → steps

Legend: **Shared** steps apply to both rails unless the row splits **Base** / **Stellar**.

### 1. Admin creates experiences on both rails

| #   | Shared                                                                                       | Base (`base_usdc`)                                                                        | Stellar (`stellar_usdc`)                                                                                            |
| --- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1.1 | [ ] Open `/admin/spend-experiences` and start **New** experience.                            | [ ] In **Payment network**, choose **Base USDC** (or equivalent label from rail catalog). | [ ] Create a second experience with **Stellar USDC**.                                                               |
| 1.2 | [ ] Set title, window, points/USDC pilot fields per ops needs; save/create via admin API/UI. | [ ] Confirm experience list/detail shows rail **Base USDC**.                              | [ ] Confirm detail shows **Stellar USDC**; rail is **immutable** after create (PATCH must not change `spend_rail`). |

### 2. Rail defaults to Base on create

| #   | Step                                                                                                                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1 | [ ] Start a **new** experience form (`app/admin/spend-experiences/`, `form-state.ts` default): **Payment network** defaults to **Base USDC** without manual change. |
| 2.2 | [ ] Submit create: persisted experience has `spend_rail` = `base_usdc` unless explicitly changed.                                                                   |

### 3. Disabled / misconfigured rails block creation and user operations

| #   | Step                                                                                                                                                                                                                                                        |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1 | [ ] With **Stellar disabled** or invalid Stellar config (`SPEND_RAIL_STELLAR_USDC_ENABLED=false` or missing required vars per server validation), attempt **admin create** for **Stellar USDC**: expect **blocked** with clear error (admin mutating path). |
| 3.2 | [ ] With rail disabled/misconfigured, attempt **POST** `/api/spend-experiences/{experienceId}/sessions` for an experience on that rail: expect **400** and no new session when blocked.                                                                     |
| 3.3 | [ ] For an existing session on a rail that becomes non-operational, attempt **conversion confirm** / **payment prepare** / **payment confirm** as applicable: mutating user paths return **blocked** messaging per IRL-10.                                  |
| 3.4 | [ ] **Mixpanel:** When blocked, expect `spend_pilot_rail_mutation_blocked` (see §7) with `spend_rail` and `unavailable_reason_codes` populated.                                                                                                             |

### 4. QR opens the same `/spend/{experienceId}` flow

| #   | Step                                                                                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 4.1 | [ ] From `/admin/spend-experiences/{experienceId}/qr`, confirm QR payload URL is `{origin}/spend/{experienceId}` (same path for Base and Stellar experiences).                                               |
| 4.2 | [ ] Scan or open URL on a device: resolves to `SpendExperiencePage` via `app/spend/[id]/page.tsx` (same route component tree for both rails).                                                                |
| 4.3 | [ ] **Mixpanel:** Admin QR page load fires `spend_experience_qr_viewed_by_admin`; user entry fires `spend_experience_qr_scanned` (client) with at least `spend_experience_id` (and `event_id` when present). |

### 5. User sees rail-aware conversion preview and copy

| #   | Base                                                                                                                                                        | Stellar                                                                                    |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 5.1 | [ ] After session + preview, conversion UI references **Base** network labeling and **USDC** from `spendRailSummary` / experience rail.                     | [ ] Same flow shows **Stellar**-appropriate network label and **USDC** (not Base wording). |
| 5.2 | [ ] `POST` conversion preview returns `spendRailSummary` consistent with `base_usdc` (explorer template id for Base).                                       | [ ] Preview returns Stellar-appropriate `spendRailSummary` (`stellar_usdc`).               |
| 5.3 | [ ] “Checking your balance on …” and pay lines use the rail’s **wallet network label** and **asset** from client summary (see `spend-experience-page.tsx`). | [ ] Same for Stellar copy.                                                                 |

### 6. Successful conversion, payment, and receipt

| #   | Base                                                                                                                            | Stellar                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6.1 | [ ] **Conversion:** Confirm points → USDC path completes; session advances past conversion pending per UI/API.                  | [ ] **Readiness:** Stellar wallet readiness completes (sponsor path); user funding from **treasury → user** completes; conversion reaches **funded** state. |
| 6.2 | [ ] **Funding evidence:** Treasury USDC transfer to user EVM wallet observed on Base (tx hash surfaced where applicable).       | [ ] **Funding evidence:** Stellar treasury funding tx succeeds on Horizon for public network.                                                               |
| 6.3 | [ ] **Payment:** User completes USDC transfer to **configured receiving** address (wallet-send flow for Base).                  | [ ] **Payment:** In-app **backend-submit** Stellar payment path completes (no user-submitted `paymentTxHash` for Stellar per API contract).                 |
| 6.4 | [ ] **Receipt:** Session reaches **payment complete**; receipt API returns conversion + spend transaction + `spendRailSummary`. | [ ] Same receipt shape; Stellar hash and explorer behavior match rail.                                                                                      |

### 7. Explorer links (BaseScan vs StellarExpert)

| #   | Base                                                                                                                                                                                                                                                                                         | Stellar                                                                                                                                                                                                     |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7.1 | [ ] **View transaction** on receipt opens an **https** URL.                                                                                                                                                                                                                                  | [ ] Same.                                                                                                                                                                                                   |
| 7.2 | [ ] Receipt **View transaction** (`spend-experience-page.tsx`) calls `resolveSpendReceiptPaymentExplorerUrl` with persisted `explorer_tx_url` from the payment spend transaction: when that URL is safe **https**, the link matches it.                                                      | [ ] Same.                                                                                                                                                                                                   |
| 7.3 | [ ] When no safe persisted URL, link uses `spendRailSummary.explorerTxUrlTemplate` + `payment_tx_hash` (`lib/spend-rail-explorer-url-client.ts`). Confirm **Base** template matches `NEXT_PUBLIC_SPEND_RAIL_BASE_USDC_EXPLORER_TX_URL_TEMPLATE` (EVM `0x…` hashes lowercased in the helper). | [ ] **Stellar:** template from `NEXT_PUBLIC_SPEND_RAIL_STELLAR_USDC_EXPLORER_TX_URL_TEMPLATE` or server default from `NEXT_PUBLIC_STELLAR_NETWORK` when unset—cross-check `lib/spend-rail-config/index.ts`. |
| 7.4 | [ ] **Base regression:** Open the URL in a browser: domain and path match **your** configured Base explorer template from `.env.local.example` (e.g. Basescan-style), not an undocumented third-party default.                                                                               | [ ] StellarExpert (or configured template host) shows the **same** hash as the completed Stellar payment.                                                                                                   |

### 8. Receipt content alignment (IRL-27)

| #   | Step                                                                                                                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8.1 | [ ] Receipt shows **USDC amount** consistent with `point_conversion` / preview.                                                                                                                            |
| 8.2 | [ ] Receipt **network** line uses rail-aware label (`receiptSpendTx.network` or `spendRailSummary.networkLabel` fallback chain in `spend-experience-page.tsx`).                                            |
| 8.3 | [ ] **Status** line matches payment row semantics (`spendReceiptPaymentStatusLabel`: Complete / Confirming / Could not verify as applicable).                                                              |
| 8.4 | [ ] **View transaction** uses `resolveSpendReceiptPaymentExplorerUrl`: prefer safe **https** persisted `explorer_tx_url`, else template + `payment_tx_hash` (see `lib/spend-rail-explorer-url-client.ts`). |

---

## Base regression (explicit mini-run)

Execute this **once per release** when Stellar changes land to ensure Base is not regressed.

1. [ ] **Create** a **Base USDC** spend experience (admin); confirm `spend_rail` = `base_usdc`.
2. [ ] Open `/spend/{experienceId}` (or QR) → create session → run **conversion preview** and **confirm** → complete **funding** and **user payment** until **payment complete**.
3. [ ] Open receipt: amount, Base network labeling, status **Complete** (when chain confirmed).
4. [ ] Click **View transaction**: URL must match **`NEXT_PUBLIC_SPEND_RAIL_BASE_USDC_EXPLORER_TX_URL_TEMPLATE`** substitution rules for the stored tx hash (see `.env.local.example`); if the DB persisted `explorer_tx_url`, that **https** value wins.
5. [ ] Optionally compare hash to Base block explorer UI for the configured network.

---

## Stellar path (explicit mini-run)

1. [ ] Enable and validate Stellar env per §“Stellar USDC”; confirm **treasury** and **sponsor** secrets exist only in secure env storage (never in QA notes).
2. [ ] Create **Stellar USDC** experience; confirm receiving address shown read-only in admin matches config.
3. [ ] QR → `/spend/{id}` → session create → preview shows Stellar rail summary.
4. [ ] Complete **readiness** (account / trustline) and **treasury → user** funding; wait until conversion **funded** and session eligible for payment.
5. [ ] Complete **Stellar backend payment** and reach **payment complete** receipt.
6. [ ] **View transaction** uses persisted explorer URL or Stellar template from env; hash matches Horizon / StellarExpert for `NEXT_PUBLIC_STELLAR_NETWORK`.

---

## Mixpanel spend pilot events (canonical names)

Constants live in [`lib/analytics/events.ts`](../lib/analytics/events.ts). Mixpanel **event name strings** are the **values** (right-hand strings) below—search the Mixpanel UI by those strings.

| Constant                              | Emitted event name (Mixpanel)         |
| ------------------------------------- | ------------------------------------- |
| `SPEND_EXPERIENCE_QR_VIEWED_BY_ADMIN` | `spend_experience_qr_viewed_by_admin` |
| `SPEND_EXPERIENCE_QR_SCANNED`         | `spend_experience_qr_scanned`         |
| `SPEND_SESSION_CREATED`               | `spend_session_created`               |
| `SPEND_CONVERSION_PREVIEWED`          | `spend_conversion_previewed`          |
| `SPEND_USER_ALREADY_CONVERTED`        | `spend_user_already_converted`        |
| `SPEND_TREASURY_INSUFFICIENT_FUNDS`   | `spend_treasury_insufficient_funds`   |
| `SPEND_CONVERSION_CONFIRMED`          | `spend_conversion_confirmed`          |
| `SPEND_CONVERSION_COMPLETED`          | `spend_conversion_completed`          |
| `SPEND_CONVERSION_FAILED`             | `spend_conversion_failed`             |
| `SPEND_PAYMENT_CONFIRMED`             | `spend_payment_confirmed`             |
| `SPEND_PAYMENT_COMPLETED`             | `spend_payment_completed`             |
| `SPEND_PAYMENT_FAILED`                | `spend_payment_failed`                |
| `SPEND_RECEIPT_VIEWED`                | `spend_receipt_viewed`                |
| `SPEND_PILOT_RAIL_MUTATION_BLOCKED`   | `spend_pilot_rail_mutation_blocked`   |

### Verifying rail / network / asset context **on current `main`**

- [ ] **Blocked mutations:** On `spend_pilot_rail_mutation_blocked`, confirm properties include **`spend_rail`**, **`rail_operational`:** `false`, **`unavailable_reason_codes`**, and **`mutation`** (e.g. `spend_session_create`, `conversion_confirm`, `payment_prepare`, `admin_spend_experience_create`). Shapes are defined in [`lib/analytics/types.ts`](../lib/analytics/types.ts) (`SpendPilotRailMutationBlockedProperties`).
- [ ] **Session / conversion / payment / receipt events:** Typed payloads (`SpendPilotSessionEventProperties`, `SpendPilotConversionEventProperties`, `SpendPilotPaymentEventProperties`) **do not** currently include explicit `spend_rail`, `network`, or `asset` fields—emitters pass `spend_experience_id`, `spend_session_id`, amounts, hashes, and status. For rail attribution in Mixpanel today, **correlate** `spend_experience_id` (and session) with the experience’s rail in admin/DB, and cross-check in-app **API** responses that include `spendRailSummary` (`getSpendRailClientSummary`) for the same session.
- [ ] **Client QR scan:** `spend_experience_qr_scanned` includes `spend_experience_id`, optional `event_id`, `user_id`, `wallet_address`—not rail; correlate via experience record.
- [ ] **If [IRL-23](https://linear.app/irlenergy/issue/IRL-23/enrich-spend-analytics-with-rail-operation-ids-and-sanitized-errors) merges:** Re-read `lib/analytics/types.ts` and server `trackSpend*` call sites; update this matrix in the same PR if new properties (e.g. `spend_rail`, `network`, `asset`, operation IDs) are added so verification rows reference the **actual** keys shipped.

---

## Related Linear issues

- [IRL-27](https://linear.app/irlenergy/issue/IRL-27/make-receipts-and-user-copy-rail-aware) — rail-aware receipt copy and explorer behavior.
- [IRL-23](https://linear.app/irlenergy/issue/IRL-23/enrich-spend-analytics-with-rail-operation-ids-and-sanitized-errors) — analytics payload enrichment (re-verify Mixpanel section after merge).
- [IRL-10](https://linear.app/irlenergy/issue/IRL-10/update-admin-and-spend-apis-for-rail-availability-rules) — rail availability / blocking semantics.

---

## Verification pass (operators)

1. [ ] Walk **Base** column end-to-end on staging; tighten any ambiguous wording in this doc.
2. [ ] Walk **Stellar** column end-to-end on staging with **public** network settings.
3. [ ] Confirm **Mixpanel** rows for §7 still match code on the branch you tested.
