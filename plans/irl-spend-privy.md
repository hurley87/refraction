# irl-spend-privy

This document is the **stakeholder-aligned** Privy server-wallet spend pilot. It **extends** the technical plan in the Refraction repo:

- Source plan: [hurley87/refraction — `plans/irl-spend-privy-server-wallet.md`](https://github.com/hurley87/refraction/blob/main/plans/irl-spend-privy-server-wallet.md)

Stakeholder alignment and **Decisions (resolved)** below capture what differs from or narrows the linked plan. For tables, routes, hooks, build steps, risks, and metrics, use the source document.

---

## Stakeholder alignment (chat — Dave & Malcolm Levy)

These points refine **product intent**, **treasury economics**, and **UX framing** for the same May 6th-style pilot (event format comparable to prior Denver events at ESP or Public Records).

### Event & flow (USDC on Base ↔ IRL)

- **User → treasury (earn):** Attendee scans a QR with their phone and confirms a transfer of **USDC on Base** to a **treasury** wallet. The system **records the on-chain transaction** and **credits points** to the user (same direction as the base plan: server wallet → treasury, then points).
- **Treasury → user (redeem / “cash out” points):** Users can **fund their spend capability** by converting **points back into USDC** drawn from the **same treasury** (or a clearly separated ops wallet that is treated as treasury for accounting). This is a **second leg** not fully specified in the Refraction v1 doc, which focused on inbound spend + points; here the **closed loop** is explicit: **treasury receives USDC on spend, treasury may disburse USDC when points are redeemed.**
- **Example conversion (discussion):** **5,000 points = $5 USDC** (i.e. **1,000 points per $1** for that example rate). Actual rates should be **configurable** and consistent with `points_reward` / ledger rules so ops can match the economics of each experience.
- **IRL owns the “why” on-chain:** **IRL** implements **points ↔ USDC conversion logic** and **executes** the relevant transfers (inbound from user server wallet to treasury on scan-and-confirm; outbound from treasury when redeeming points), so purchasing at the bar still feels like **“paying with IRL”** from the user’s perspective.

### Treasury budget (discussion)

- **Rough sizing:** ~**100 people** at the event, each with **~5,000 points** available to convert back to USDC → order of **$500 USDC** in the **treasury wallet** as a working budget for **experimentation** (not a hard cap; adjust for real attendance and redemption).

### UX principle (discussion)

- **Seamless / “behind the scenes”:** The attendee should **not** have to think about chains, EOAs, or raw crypto UX where avoidable. Stablecoin and server-wallet mechanics run **under the hood**; the surface is **IRL** (scan → confirm → balance / points), aligned with the base plan’s server-wallet + gas-sponsored path.

### Ecosystem: Bridge (discussion)

- **Bridge** was called out as the tool that makes it **easy for users to get stablecoins into wallets** (on-ramp / funding path). The linked Refraction pilot defers deep **in-app** Bridge/Tempo integration for v1; this chat still treats Bridge as the **likely complement** for **getting USDC into** user or server wallets **before or between events**, while the **in-app spend loop** remains IRL + Privy server wallet + treasury.

### Open integration work (discussion)

- **UI/UX and stack fit:** How this **pairs with the existing IRL stack** (Privy, Supabase, admin, wallet surfaces) is a **first-class design problem**—especially for **redemption** (points → USDC) and **operator visibility** (treasury balance, liability vs. float).

---

## Summary (from base plan)

A controlled test of IRL Spend powered by **Privy server wallets** and **gas-sponsored stablecoin transactions**. Users fund their IRL server wallet with stablecoins, then tap to confirm on-chain purchases at events by scanning a QR code generated from a **Spend Experience** configured in the IRL CMS. Every confirmed transaction posts back to the admin dashboard and automatically issues configurable points (default **100**) to the user.

This plan targets a **controlled test on May 6th** and a build window of the week prior.

---

## Objective (from base plan)

Prove that IRL can run real, on-chain, in-person spend at a live event without the user paying gas, without staff running a card terminal, and without the user leaving the IRL app.

The user journey is intentionally tight:

1. User funds their IRL server wallet with stablecoins.
2. Staff shows a QR for a pre-configured **Spend Experience** (e.g. "Drink Ticket").
3. User scans, confirms the transaction in IRL, and it settles on-chain with IRL sponsoring gas.
4. Admin sees the confirmed transaction in real time.
5. User receives the configured points (default 100).

**This plan adds:** Design copy and flows so the user perceives **“pay with IRL / earn IRL”**; optional **points → USDC** redemption uses treasury liquidity with **clear, configurable rates** and **operator controls**.

---

## Why this plan (vs. `irl-spend.md`) (from base plan)

The existing `irl-spend.md` plan uses **Stripe Terminal** for card-present payments in v1, with Privy only as the identity layer. This plan replaces that critical path with a **Privy server wallet + stablecoin** flow and keeps Stripe Terminal out of v1 entirely.

- `irl-spend.md`: IRL identity → Stripe Terminal card read → points.
- This plan: IRL-held Privy server wallet → QR-scan confirm → gas-sponsored USDC transfer → points.

The `/walletconnect` experience in this repo is the closest existing surface and is the reference pattern for the scan-and-confirm UX.

### Important: Stripe Terminal does not support stablecoin payments (from base plan)

Stripe Terminal is a card-present product (EMV chip, contactless, swiped) plus NFC mobile wallets (Apple Pay, Google Pay, Samsung Pay). **Stablecoin / USDC acceptance is not available on Stripe Terminal.** Stripe's stablecoin acceptance is an online-only product, exposed through Checkout, Payment Links, Elements, and the Payment Intents API — not through the in-person Terminal stack.

This is the core reason this plan does not sit on top of Stripe Terminal: there is no supported Stripe path to take USDC at the reader. To do stablecoin spend in person, we own the rails (Privy server wallet + paymaster + direct ERC-20 transfer) rather than waiting on a Stripe product that does not exist.

References:

- [Stripe Terminal global availability / supported card brands](https://docs.stripe.com/terminal/payments/collect-card-payment/supported-card-brands) — Terminal supports card brands and NFC mobile wallets; no mention of stablecoins.
- [Stripe Terminal overview](https://docs.stripe.com/terminal/overview) — describes EMV / contactless / swiped and Tap to Pay; does not include stablecoins.
- [Stablecoin payments — Stripe Docs](https://docs.stripe.com/payments/stablecoin-payments) — lists the integration surfaces (Checkout, Payment Links, Elements, Payment Intents); **Terminal is not listed**.
- [Accept stablecoin payments](https://docs.stripe.com/payments/accept-stablecoin-payments) — same online-only integration surfaces, US-businesses-only, USD settlement.
- [Stablecoin and Crypto Payments (Support)](https://support.stripe.com/user/topics/stablecoin-and-crypto-payments) — Stripe's consolidated help topic; confirms stablecoin acceptance is a Stripe payment method for online flows.

Implication for `irl-spend.md`: if a future phase of that plan says "Stripe Terminal for stablecoin," that is not possible today. Stablecoin at the point of sale must come from a non-Terminal path, which is what this plan provides.

### Additional Stripe Terminal concern: hardware cost and integration burden (from base plan)

Even setting aside the stablecoin gap, Stripe Terminal imposes real cost and engineering drag that a QR-scan-and-confirm flow avoids entirely:

- **Certified reader hardware is required** — Stripe Terminal only works with Stripe-listed devices. Published per-reader prices from Stripe's own pricing docs: BBPOS WisePad 3 and Stripe Reader M2 at **$59**, BBPOS WisePOS E at **$249**, Stripe Reader S700 at **$349**. See [Pricing for Stripe Terminal](https://support.stripe.com/questions/pricing-for-stripe-terminal), the [Stripe Reader S700](https://stripe.com/terminal/s700) and [BBPOS WisePOS E](https://stripe.com/terminal/wisepose) product pages. For any event of meaningful size we'd have to buy or rent multiple readers.
- **Or integrate with an existing POS** — Stripe Terminal is explicitly not a standalone POS; it's designed to sit inside existing POS software via Stripe's iOS / Android / JavaScript / React Native / server-driven SDKs, or through no-code POS partners. See the [Stripe Terminal docs](https://docs.stripe.com/terminal) and [Set up the reader](https://docs.stripe.com/terminal/payments/setup-reader). That means either we adopt and operate a POS ourselves, or we integrate into whatever POS each venue already runs — neither is realistic for a May 6th controlled test.
- **Tap to Pay is not an escape hatch for us** — [Tap to Pay on iPhone / Android](https://stripe.com/terminal/tap-to-pay) still requires Stripe Terminal SDK integration and still doesn't accept stablecoins, so it doesn't remove either the integration work or the product gap.

The Privy server wallet + QR approach in this plan needs **zero Stripe hardware**, **zero POS integration**, and runs on devices users and staff already own (a phone with a camera and the IRL app). That is a significantly cheaper and faster path to a controlled test, and it's the only path that actually lets stablecoins change hands in person.

---

## Scope of the controlled test (May 6th) (from base plan, with notes above)

### In scope

- One event, one merchant line (e.g. "Drink Ticket").
- One chain, one stablecoin. **Recommendation: USDC on Base**, matching `lib/walletconnect-poster-direct-usdc.ts` and `/walletconnect`.
- Privy **server wallets** provisioned per IRL user.
- User-initiated funding of their own server wallet with USDC.
- IRL-sponsored gas via **Privy-native** smart-wallet paymaster / bundler on Base.
- CMS in admin to create and manage **Spend Experiences**.
- **One-time QR per sale** (not a stable long-lived QR per experience); revisit if attribution or ops need a stable code.
- In-app QR scan + confirm flow (modeled on `/walletconnect`).
- Admin transaction ledger with real-time updates.
- Configurable points per Spend Experience (default 100); **`points_reward` is flat per experience for v1** (no tiers or multipliers yet).
- **One event treasury:** a **single server wallet per event**; admin funds it and decides how to distribute proceeds (no separate merchant treasury split in v1).

**Addition (may be same sprint or immediate follow, to be scoped):**

- **Points → USDC redemption** path with **treasury-funded** payouts, **configurable exchange rate**, caps/limits aligned with **~$500 experimental float** (or updated ops number), and **audit trail** (ledger + on-chain tx).

---

## System architecture (from base plan)

### Actors & components

- **IRL App (Next.js 14)** — user-facing flows, QR scan, confirmation UI, transaction status.
- **Privy** — user auth + **server wallets** provisioned on the user's behalf.
- **Paymaster** — sponsors gas for the server wallet transaction via **Privy-native** smart-wallet sponsor / bundler on Base (not a third-party paymaster for v1).
- **Supabase** — persistence for spend experiences, QR sessions, transactions, and points ledger entries.
- **Admin CMS (`app/admin/spend/`)** — configure experiences, view live transactions, view aggregate stats.
- **On-chain** — USDC ERC-20 transfer on Base from user server wallet → treasury wallet.

**Redemption:** For redemption, **treasury (or hot wallet)** → user server wallet (or designated payout path), with **IRL server-side** signing for treasury sends **only** via secured keys / policies (exact custody TBD in implementation).

### High-level flow

```
[Admin CMS] -- creates Spend Experience + treasury recipient + price + points --> [Supabase]
         |
         +--> generates one-time QR per sale (payload encodes sale/session; expires or invalidates after use as designed)

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

**Redemption flow (conceptual):**

```
[User] requests "convert points to USDC"
  -> server validates balance, rate, daily/total caps, treasury liquidity
  -> treasury sends USDC to user's server wallet (or approved destination)
  -> debit points in same atomic DB transaction as ledger + (optional) pending on-chain state
```

### Why server wallet (not user EOA) (from base plan)

- Removes wallet-UX friction; user never signs a raw EVM transaction.
- IRL fully controls the transaction construction and gas sponsorship.
- Matches the pattern needed for future deeper reward programmability.
- Keeps the user in IRL; no external wallet app required.

**Profile:** Show the user’s **Privy server wallet address** on the profile (not only inside a funding drawer).

---

## Decisions (resolved)

| Topic                    | Decision                                                                                                                         |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Paymaster                | **Privy-native** smart-wallet sponsor / bundler (not an external paymaster for v1).                                              |
| QR strategy              | **One-time QR per sale** (default). Stable QR per experience is not the default; revisit if attribution gets noisy.              |
| Treasury                 | **One server wallet per event.** Admin funds it and chooses how to distribute. No separate merchant treasury split for the test. |
| Server wallet visibility | **Yes** — expose the server wallet address on the user profile for v1.                                                           |
| `points_reward`          | **Flat per experience** for v1; no tiers or multipliers yet.                                                                     |

Implementation detail for redemption and extra ledger fields remains in the linked source plan; extend that doc when redemption ships.
