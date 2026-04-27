# IRL Spend Pilot Technical PRD

## 1. Overview

The IRL Spend Pilot lets eligible event attendees convert IRL points into USDC on Base and spend that USDC through an IRL-controlled event payment flow. Users scan an event QR code, see a clear conversion preview, confirm that points are converted to USDC, receive USDC in their Privy embedded wallet, and pay a configured IRL/event receiving wallet.

This should be implemented as a future-extensible `SpendExperience` system, not a one-off hardcoded $5 pilot. V1 only needs one spend experience, but admins should be able to configure the conversion rate, max USDC per user, active window, treasury wallet, and receiving wallet.

Users are redeeming directly from IRL, not a third-party vendor. The conversion is an off-chain points deduction plus a backend-funded USDC transfer from an IRL-controlled Privy server wallet to the user's Privy embedded wallet.

For v1, "only spendable inside IRL" is enforced through the app flow and UX, not through token-level transfer restrictions. Once USDC is sent to the user's Privy embedded wallet, it is technically user-owned USDC. The app can guide the user to spend it inside IRL, but the funds are not token-level restricted unless the architecture changes to escrow, smart wallets, or another constrained custody model.

## 2. Goals

- Let event attendees convert a configured amount of IRL points into USDC on Base.
- Make the UX explicitly feel like: "I converted points to USDC."
- Support one initial spend experience while keeping the data model extensible.
- Enforce one completed conversion per user per spend experience.
- Deduct points immediately when conversion is confirmed.
- Fund users from a Privy server wallet and pay gas through the IRL backend/app flow.
- Send user payments to an IRL treasury or configurable event wallet.
- Record backend state transitions and transaction hashes for auditability.
- Emit Mixpanel events for the major conversion and payment steps.

## 3. Non-Goals

- Third-party vendor payouts or multi-vendor settlement.
- Geofencing. Physical presence is established by being at the event and scanning the event QR code.
- Token-level spending restrictions, escrow contracts, or smart contract custody.
- Rotating the QR code after every scan.
- Manual reversals, manual comps, pause/resume controls, or advanced operator tooling unless already trivial to support.
- A multi-event marketplace.

## 4. Product Flow

1. Admin creates a spend experience.
2. Admin opens `/admin/spend-experiences/{experienceId}/qr`.
3. Admin displays the QR code at the event.
4. User scans the QR code.
5. App opens the dedicated spend experience at `/spend/{experienceId}`.
6. Backend validates the spend experience and creates a user-specific `SpendSession`.
7. App checks wallet readiness, point balance, one-time conversion status, active window, and treasury USDC balance.
8. User sees points required, USDC amount, receiving wallet, and event/spend experience details.
9. User confirms conversion.
10. Backend atomically deducts points and creates conversion records.
11. Backend sends USDC from the Privy server wallet to the user's embedded wallet.
12. User confirms payment to the configured IRL/event receiving wallet.
13. User wallet sends USDC on Base.
14. App shows a success receipt.
15. Backend records all state transitions and transaction hashes.
16. Mixpanel events are emitted.

## 5. Admin QR Display Flow

Admins should have a stable QR display URL:

- Admin display URL: `/admin/spend-experiences/{experienceId}/qr`
- User scan URL: `/spend/{experienceId}`

The admin URL should not change after each activation. The backend controls whether the spend experience is draft, active, ended, expired, or out of funds. The QR should open a URL/deep link into the app, not a raw payment QR. Each scan creates or returns a backend `SpendSession` for that authenticated user.

Do not rotate the QR after each scan. Rotate/regenerate it only if the admin manually resets the experience, the QR leaks, or the event needs a fresh activation window.

## 6. Technical Architecture

- **Frontend:** Next.js App Router pages for admin configuration, QR display, user scan/conversion, payment confirmation, and receipt.
- **Backend:** Next.js route handlers or server actions using existing `apiSuccess()`, `apiError()`, and `apiValidationError()` response helpers.
- **Database:** Supabase tables for spend experiences, sessions, conversions, payments, and optional treasury ledger entries.
- **Auth/wallet identity:** Privy auth token verification and wallet ownership checks.
- **Wallets:** Privy embedded wallets for users; Privy server wallet for treasury-funded USDC transfers.
- **Chain:** Base USDC, using viem/Wagmi/Privy patterns already present in the app.
- **Analytics:** Existing Mixpanel server/client analytics helpers, expanded with spend pilot event names.

Recommended high-level pseudocode:

1. On scan, validate experience status and active window.
2. Resolve authenticated user and embedded wallet.
3. Upsert or return a user-specific session keyed by user and spend experience.
4. Check points, prior conversion, and treasury balance.
5. On conversion confirm, atomically deduct points and create a pending conversion.
6. Send USDC from the server wallet and store the funding transaction hash.
7. On payment confirm, request the user's embedded wallet to transfer USDC to the receiving wallet.
8. Store payment hash and update receipt state.

## 7. Data Model

Define exact SQL in migrations following the existing Supabase migration style. Add unique indexes for one conversion per user per spend experience and idempotent payment submission.

### SpendExperience

Admin-created event spend configuration:

- `id`
- `title`
- `description`
- `event_id`, if events exist
- `status`: `draft`, `active`, `ended`
- `points_to_usdc_rate`
- `max_usdc_per_user`
- `treasury_wallet_address`
- `receiving_wallet_address`
- `start_time`
- `end_time`
- `created_by`
- `created_at`
- `updated_at`

Initial pilot defaults: `1000` points = `$1` USDC and max conversion `$5` USDC, both configurable.

### SpendSession

Created when a user scans the QR code:

- `id`
- `spend_experience_id`
- `user_id`
- `wallet_address`
- `status`
- `qr_token_hash` or signed payload reference if needed
- `created_at`
- `expires_at`
- `completed_at`

### PointConversion

Points-to-USDC conversion record:

- `id`
- `spend_experience_id`
- `spend_session_id`
- `user_id`
- `points_deducted`
- `usdc_amount`
- `status`
- `treasury_wallet_address`
- `user_wallet_address`
- `funding_tx_hash`
- `created_at`
- `completed_at`
- `failed_reason`

### SpendTransaction

User's USDC spend back to IRL/event wallet:

- `id`
- `spend_experience_id`
- `spend_session_id`
- `user_id`
- `usdc_amount`
- `from_wallet_address`
- `to_wallet_address`
- `status`
- `payment_tx_hash`
- `created_at`
- `completed_at`
- `failed_reason`

### TreasuryTransaction

Optional but recommended audit ledger:

- `id`
- `spend_experience_id`
- `transaction_type`: `fund_user`, `receive_payment`, `admin_recovery`
- `amount`
- `from_wallet_address`
- `to_wallet_address`
- `tx_hash`
- `status`
- `created_at`

## 8. API / Server Actions

### Admin

- Create/update spend experience.
- View stable QR display page.
- Generate/render QR code for the stable user scan URL.
- View spend experience activity, conversions, and spend transactions.
- View treasury address and USDC balance.

Suggested routes:

- `GET /admin/spend-experiences`
- `GET /admin/spend-experiences/{experienceId}/qr`
- `GET /api/admin/spend-experiences`
- `POST /api/admin/spend-experiences`
- `PATCH /api/admin/spend-experiences/{experienceId}`
- `GET /api/admin/spend-experiences/{experienceId}/activity`
- `GET /api/admin/spend-experiences/{experienceId}/treasury`

### User

- Validate scanned spend experience.
- Create or return spend session.
- Check eligibility.
- Preview conversion.
- Confirm conversion.
- Confirm payment.
- Fetch receipt/status.

Suggested routes:

- `GET /spend/{experienceId}`
- `POST /api/spend-experiences/{experienceId}/sessions`
- `GET /api/spend-sessions/{sessionId}`
- `POST /api/spend-sessions/{sessionId}/conversion/preview`
- `POST /api/spend-sessions/{sessionId}/conversion/confirm`
- `POST /api/spend-sessions/{sessionId}/payment/confirm`
- `GET /api/spend-sessions/{sessionId}/receipt`

### Blockchain/Wallet

- Check treasury USDC balance before conversion.
- Send USDC from Privy server wallet to user wallet.
- Request/send USDC from user embedded wallet to receiving wallet.
- Track funding and payment transaction hashes.
- Handle pending, success, and failure states.
- Ensure retries return existing state instead of creating duplicate transfers.

## 9. Wallet and Payment Flow

- Use Base USDC for all payments.
- Use the official Base USDC token already referenced in the walletconnect poster code.
- Treasury funding is handled by a Privy server wallet.
- Assume eligible users have a Privy embedded wallet; still validate wallet availability before conversion.
- The backend checks the treasury balance before showing a confirmable conversion.
- If the treasury has insufficient funds, show a clear "treasury has no funds" state before points are deducted.
- On conversion, the backend deducts points and sends USDC to the user's Privy embedded wallet.
- On payment, the user's embedded wallet sends USDC to `receiving_wallet_address`.
- The IRL backend/app pays gas where supported by the chosen Privy embedded wallet/server wallet setup.
- Payments should settle immediately on-chain; pending states should be visible if RPC confirmation lags.
- Admins can recover unused funds from the treasury/event wallet after the pilot. USDC already sent to users remains in user wallets.

## 10. QR / Spend Session Flow

The QR should open a spend experience link, not a raw payment QR.

Session requirements:

- Include or resolve `spend_experience_id`.
- Include `event_id` if available.
- Use a signed payload or opaque server-validatable token if the current app pattern supports it.
- Store a token hash/reference if token validation is needed.
- Create a user-specific `SpendSession` after scan.
- Support expiry and replay protection at the backend layer.
- Use session state for idempotency and receipt recovery.

Stable QR URLs are acceptable because access control, eligibility, active windows, treasury balance, and one-time conversion rules are enforced server-side.

## 11. Idempotency and State Management

### SpendSession States

- `created`
- `conversion_pending`
- `conversion_complete`
- `payment_pending`
- `payment_complete`
- `failed`
- `expired`

### PointConversion States

- `pending`
- `points_deducted`
- `funding_pending`
- `funded`
- `failed`

### SpendTransaction States

- `pending`
- `submitted`
- `confirmed`
- `failed`

Idempotency requirements:

- A user can only have one completed conversion per spend experience.
- Refreshing, rescanning, or double-clicking must not double-convert.
- Retrying payment submission must not double-pay.
- Backend mutations should use idempotency keys based on `user_id`, `spend_experience_id`, and `spend_session_id`.
- On retry, return the existing session, conversion, or payment state.
- Use unique database indexes and atomic RPC/database transactions where possible.

## 12. Admin Dashboard

Keep v1 lightweight:

- Create/configure the spend experience.
- Set max USDC amount per user.
- Set points-to-USDC conversion rate.
- Set receiving wallet.
- View treasury wallet/address and balance.
- View total users converted.
- View total USDC distributed.
- View total USDC spent.
- View failed transactions.
- Open the stable QR display URL.
- Generate/display the QR code.
- Link to Mixpanel-tracked events if already supported.

## 13. Analytics

Emit Mixpanel events with `spend_experience_id`, `event_id` if available, `user_id`, `wallet_address`, `points_amount`, `usdc_amount`, `status`, and `error_reason` where relevant.

Required events:

- `spend_experience_qr_viewed_by_admin`
- `spend_experience_qr_scanned`
- `spend_session_created`
- `spend_conversion_previewed`
- `spend_conversion_confirmed`
- `spend_conversion_completed`
- `spend_conversion_failed`
- `spend_payment_confirmed`
- `spend_payment_completed`
- `spend_payment_failed`
- `spend_receipt_viewed`
- `spend_user_already_converted`
- `spend_treasury_insufficient_funds`

## 14. Error Handling

Show simple product messages, not raw technical errors:

- User already converted for this spend experience.
- User does not have enough points.
- Spend experience is inactive or expired.
- Treasury has insufficient USDC.
- USDC funding transaction fails.
- User payment transaction fails.
- QR/session is invalid or expired.
- Blockchain transaction is pending longer than expected.
- Duplicate request detected.
- Wallet unavailable.
- Network/RPC error.

Backend logs should include enough detail to debug failed conversion/payment states without exposing secrets.

## 15. Security Considerations

- Validate all conversion and payment actions server-side.
- Never trust QR params directly from the client.
- Use server-generated spend experience IDs and backend-created user sessions.
- Use signed QR payloads or opaque server-validatable tokens if the existing app pattern supports it.
- Store hashes/references to QR tokens if needed.
- Use idempotent backend mutations.
- Check treasury balance before conversion.
- Check user point balance before deduction.
- Ensure point deduction and conversion record creation happen atomically where possible.
- Do not expose private keys.
- Use Privy server wallet for backend-funded USDC transfers.
- Store transaction hashes for all USDC transfers.
- Use environment variables for wallet/provider configuration.
- Stable QR URLs are acceptable because backend rules enforce access and limits.

## 16. Existing Code to Reuse

- `app/spend/[id]/page.tsx` already provides a user-facing points spend page and should inform the dedicated spend experience UI, though this pilot needs conversion and USDC payment states rather than only points redemptions.
- `app/api/spend/route.ts`, `app/api/spend/[id]/route.ts`, `hooks/useSpend.ts`, `lib/db/spend.ts`, and `lib/schemas/spend.ts` show the current spend API, hook, Supabase, and Zod patterns.
- `database/spend-items-schema.sql` and `database/atomic-spend-redemption.sql` provide the current spend item/redemption schema and atomic point deduction pattern. The pilot should add new tables rather than overload `spend_items` if conversion/payment auditability would become unclear.
- `app/walletconnect/page.tsx`, `app/walletconnect/walletconnect-page-client.tsx`, and `lib/walletconnect-poster-direct-usdc.ts` show an existing Base USDC payment flow, Base USDC token constant, balance checks, and embedded-wallet transaction signing patterns.
- `components/shared/providers.tsx` already configures Privy embedded wallets and Base as the default supported chain.
- `lib/api/privy.ts` already verifies Privy auth tokens and wallet ownership for API routes.
- `lib/db/players.ts` exposes player lookup and point balance updates; new conversion logic should prefer an atomic database function for point deduction plus conversion record creation.
- `lib/analytics/events.ts` and `lib/analytics/server.ts` provide centralized Mixpanel event constants and server-side tracking helpers.
- `app/admin/checkpoints/page.tsx`, `app/api/admin/checkpoints/route.ts`, and `lib/auth.ts` show the existing admin UI/API authorization pattern.

## 17. Implementation Phases

### Phase 1: Data Model and Admin Configuration

- Add spend experience data model.
- Add spend session, conversion, payment, and optional treasury transaction tracking.
- Add basic admin configuration.
- Add stable admin QR display URL.

### Phase 2: QR Scan and Eligibility Flow

- Add user-facing spend experience route.
- Create spend session on scan.
- Validate active experience.
- Validate user wallet, points, one-time conversion, and treasury balance.
- Show conversion preview.

### Phase 3: Conversion and Funding

- Deduct points.
- Create conversion record.
- Send USDC from Privy server wallet to user embedded wallet.
- Track funding transaction status.
- Handle failure states.

### Phase 4: Payment and Receipt

- Let user confirm spend/payment.
- Send USDC from user embedded wallet to configured IRL/event wallet.
- Track payment transaction status.
- Show success receipt.
- Emit Mixpanel events.

### Phase 5: Admin Monitoring and Cleanup

- Show basic activity in admin.
- Show totals and failed transactions.
- Support admin recovery of unused treasury funds if needed.
- Keep advanced controls out of v1 unless simple.

## 18. Acceptance Criteria

- Admin can configure a spend experience.
- Admin can open a stable QR display URL for the spend experience.
- Admin can display the QR code at the event.
- User can scan the QR code at the event.
- User can see how many points will be deducted and how much USDC they will receive.
- User can confirm conversion.
- Points are deducted exactly once.
- USDC is sent from the Privy server wallet to the user's embedded wallet.
- User can confirm payment to the configured IRL/event wallet.
- Payment settles on Base.
- App shows a success receipt.
- Duplicate scans/retries do not create duplicate conversions or payments.
- Treasury insufficient funds state is handled cleanly.
- Stable QR URLs do not allow bypassing eligibility, conversion limits, or treasury checks.
- Mixpanel events are emitted for major steps.
- Backend database records can reconstruct the full flow.

## 19. Open Questions

- Should QR payloads be signed in v1, or is a stable experience ID with server-side validation enough for the pilot?
- Does the existing points system ledger need to be expanded for points deductions, or is the existing player balance plus conversion audit record sufficient?
- Should the receiving wallet be the main IRL treasury wallet or a separate event wallet for the pilot?
