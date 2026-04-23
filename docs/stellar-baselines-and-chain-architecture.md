# Stellar Baselines and Chain Architecture Notes

_Prepared from a combination of live Supabase data, live Mixpanel schema inspection, public Stellar records, and repository review on 2026-04-23._

## Executive readout

IRL is already meaningfully wired for Stellar, but the current production picture is more nuanced than "everything is on Stellar."

- Stellar wallet creation is real and scaling quickly inside IRL.
- Stellar usage is live, but still concentrated in a small number of activated wallets.
- The current product does **not** appear to run a first-party USDC-on-Stellar redemption rail yet.
- IRL is multi-chain today: Base/EVM is the default app wallet rail, while Stellar and Aptos are live for checkpoint flows, and Solana is implemented but not currently active in live checkpoints.

## 1) Current baselines for Stellar metrics

### 1.1 Stellar wallets created

**Baseline:** **180 Stellar wallets created** in production.

### How I derived it

This is the current count of `players` rows with a non-null `stellar_wallet_address`. In other words, this is the strongest live product baseline for "wallets created in IRL," not merely a marketing estimate.

### Important nuance

On Stellar, a wallet can be created in IRL/Privy before it becomes visible on-chain. A wallet only shows up on Stellar Expert after the account has been funded or otherwise activated on the ledger.

So the right way to describe this externally is:

> IRL has created **180 Stellar wallets** for users, with a smaller activated subset already visible on-chain.

### Supporting on-chain records

Representative public records for an activated IRL-linked Stellar wallet:

- Activated account example: <https://stellar.expert/explorer/public/account/GCCNGGPKJDHV2ALITWX6W6N6PIVHJ63JX36XNGYXNZN5YGOQCLDBTFI6>
- Account-creation transaction for that wallet: <https://stellar.expert/explorer/public/tx/3e90835b16bbce81ce44074a8876a14764f21691044c6fdf2c7775e62539baa3>
- Follow-on payment transaction for that wallet: <https://stellar.expert/explorer/public/tx/7d4cdec0bc14406f8e591d4b8ea65eabce4a9fab0967598af403b05f8cc6b3c8>

Those links are best treated as **representative evidence** that IRL-created wallets do make it onto the public Stellar ledger once funded.

---

### 1.2 Monthly active wallets

**Baseline:** **2 monthly active Stellar wallets** by a conservative product-activity definition.

### How I derived it

I counted distinct `stellar_wallet_address` values with a persisted action in the last 30 days across:

- `player_location_checkins`
- `points_activities`
- `user_perk_redemptions`
- `spend_redemptions`

### Why this is conservative

This is a **lower-bound MAW** number, not a polished growth-dashboard number.

Reasons:

- IRL identity is multi-chain and some analytics still resolve around email / primary wallet identity rather than always around `stellar_wallet_address`.
- `account_created` in Mixpanel is currently tagged as `wallet_type = EVM` in the server route, so Mixpanel is not a trustworthy source for Stellar wallet creation or Stellar MAU segmentation right now.
- Some newly created Stellar wallets are not yet funded or used in a way that creates a persisted action tied back to the Stellar address.

The strong version of the claim is:

> IRL has **180 created Stellar wallets** and **at least 2 currently active Stellar wallets** based on persisted wallet-specific activity.

---

### 1.3 USDC transaction volume on Stellar

**Baseline:** **effectively 0 today as a first-party IRL product metric**, or at minimum **not currently measurable from the shipped redemption stack**.

### Why I say that

I do **not** see evidence that the current live IRL reward / redemption product settles USDC on Stellar today:

- All active **Stellar checkpoints** are `checkin` checkpoints, not `spend` checkpoints.
- The current spend/redemption product is points-based and off-chain in Supabase.
- The explicit USDC payment rails in the repo target **Base**, not Stellar.
- The spend pilot plan also describes **USDC on Base**, not USDC on Stellar.

### Nuanced interpretation

There **is** a Stellar-facing bridge experience in the `/stellar` demo that can move assets into **XLM or USDC on Stellar** via NEAR Intents. That is real and strategically important, but it is **not the same thing** as saying IRL currently runs its primary reward redemption or spend settlement in USDC on Stellar.

So the best external phrasing is:

> IRL has a Stellar wallet and bridge surface, but the current production redemption economics are not yet driven by a first-party USDC-on-Stellar settlement rail. As a result, current IRL-attributable USDC volume on Stellar should be treated as **de minimis / effectively zero** until that flow is productized and instrumented.

### Supporting public records

Committed mainnet Stellar contract IDs used by the current Stellar reward stack:

- Simple payment contract: <https://stellar.expert/explorer/public/contract/CD4NL2R7HPIF7YEG3NDBV35EPZFTSAU5INHYJ2N6CFKYZAY4YIHFXQ5B>
- Fungible token contract: <https://stellar.expert/explorer/public/contract/CBBTE46FEJ7OCKNZG4SNUSTMGYXRFST3SCTMAADWR3GSZVENDVBF2UR6>
- NFT contract: <https://stellar.expert/explorer/public/contract/CC3TXXYTH4LOA42ZD5F22DO2EVSYJXEFVS65MYQJPVTLNWCOLSLEZMSW>

These support the claim that IRL has a deployed Stellar contract surface; they do **not** prove current USDC settlement volume.

---

### 1.4 Cost per Stellar wallet acquired

**Baseline:** **not currently instrumented as a trustworthy business KPI**.

### Best inference

If forced to infer, I would frame it this way:

> IRL's **marginal wallet provisioning cost is near-zero**, because wallet creation is software-driven through Privy. The true "cost per Stellar wallet acquired" is therefore not a blockchain infrastructure question; it is a blended acquisition question spanning event ops, partnerships, field marketing, and paid/organic channels.

In other words:

- **Infrastructure cost per created wallet:** negligible
- **True acquisition cost per Stellar wallet:** currently unavailable from the tracked data model

### Why this metric is not trustworthy yet

I did not find a joined source of truth that connects:

- campaign spend
- event activation spend
- partner activation cost
- acquisition source
- resulting `stellar_wallet_address`

Mixpanel exposes a marketing channel property, but that is not enough to compute a reliable wallet CAC.

## 2) What other chains does IRL currently support?

### Confirmed live / productized support

- **EVM / Base**
  - This is the default app wallet rail in the Privy provider configuration.
  - Current USDC payment logic in the repo is explicitly on **Base**.
- **Stellar**
  - Live embedded-wallet support.
  - Live checkpoint support.
  - Live `/stellar` experience with balance, bridge, and reward-claim surfaces.
- **Aptos**
  - Live wallet creation/fetching support.
  - Live checkpoint support.

### Implemented but not currently active in live checkpoints

- **Solana**
  - Present in the data model, checkpoint chain enum, analytics identity logic, and Privy wallet creation flow.
  - I did not find active live Solana checkpoints in production at the moment.

### Strategic but not native "activation chain" support

- The Stellar bridge widget accepts assets from many other chains and explicitly references source flows like **Bitcoin, Ethereum, and Solana** into Stellar via NEAR Intents.
- I would treat that as **bridge support**, not as full native IRL checkpoint/reward support on those chains.

### Clean external answer

> IRL is already a multi-chain product. Today the strongest confirmed rails are **Base/EVM, Stellar, and Aptos**, with **Solana** implemented in the platform and ready to support activations, even if it is not currently represented in active production checkpoints.

## 3) Can the demo be updated to show what is happening on-chain?

**Answer:** **Yes, absolutely — and part of it is already halfway there.**

### What already exists

The current `/stellar` demo already shows transaction status for the Stellar "Claim Points" flow and generates a Stellar Expert transaction link after success.

So the current demo already demonstrates:

- Stellar wallet usage
- Stellar transaction submission
- explorer deep-linking for the claim transaction

### What is missing today

#### A) Wallet creation -> "show me the wallet on Stellar Expert"

This needs one important caveat:

Creating a wallet in IRL/Privy does **not** automatically mean the account exists on the Stellar ledger yet.

So the right demo behavior is:

1. User creates embedded Stellar wallet in IRL
2. UI shows the new address immediately
3. UI explains that the wallet becomes visible on Stellar Expert after activation
4. Demo funds or otherwise activates the wallet
5. UI reveals:
   - account link
   - activation transaction link
   - live ledger status

That would be a very strong demo.

#### B) Reward redemption -> "show the USDC transaction settling on Stellar"

This is the bigger gap.

Today, that is **not** the current live IRL reward path:

- current points spend is off-chain / app-native
- current explicit USDC flow points to **Base**
- current Stellar reward flow sends a Stellar fungible token / reward token, not a documented USDC-on-Stellar redemption rail

### My recommendation

If the goal is to make the demo feel impressive immediately, I would stage it in two phases:

#### Phase 1: ship quickly

- Show new embedded Stellar wallet address
- Add "View on Stellar Expert" CTA once funded
- Keep the existing Stellar claim transaction status card
- Add richer explorer links:
  - wallet account
  - activation tx
  - reward tx

#### Phase 2: make the story truly "USDC on Stellar"

Build a real Stellar redemption rail that:

- pays out USDC on Stellar, or
- bridges into Stellar USDC and then redeems there

Then the demo can honestly show:

- wallet created
- wallet activated
- reward redeemed
- USDC settled on Stellar

### Clean external answer

> Yes. The current demo already has the bones of an on-chain story on Stellar. The wallet-creation side mainly needs activation-aware explorer UX, while the "USDC redemption settling on Stellar" side requires a real Stellar-native settlement path, because that is not the current shipped reward rail.

## 4) Is Stellar hardcoded as the wallet chain for all IRL activations, or configurable per event or venue?

**Answer:** **It is configurable at the activation/checkpoint layer, not globally hardcoded as "everything on Stellar."**

### What is actually hardcoded

The general app-level Privy configuration is opinionated around **Base/EVM** as the default chain.

So if someone asks "what is the default wallet stack for the app?" the answer is:

> Base/EVM is the default.

### What is configurable

IRL's checkpoint model has an explicit `chain_type` field with these supported values:

- `evm`
- `solana`
- `stellar`
- `aptos`

The unified checkpoint flow then resolves the wallet requirement from that setting and prompts the user to use or create the matching wallet.

That means, operationally:

> IRL can configure activations to run on different chains per checkpoint.

### Is it configurable per event or per venue?

The closest confirmed answer is:

- **yes, per activation/checkpoint**
- **not clearly per venue as a top-level venue setting**

I did **not** find evidence that `locations` / venues themselves carry a native chain configuration field. The configurability I can confirm is on the checkpoint object, which is what actually governs the user-facing activation flow.

### Best crisp phrasing

> Stellar is **not** hardcoded as the wallet chain for all IRL activations. In practice, chain selection is configurable per checkpoint activation, while the broader app shell still defaults to Base/EVM. So the right mental model is: **multi-chain activations on top of an EVM-first app core.**

## Recommended positioning language

If this is going into a partner deck, investor memo, or ecosystem conversation, I would say:

> IRL already operates a credible Stellar footprint: embedded wallet creation is live, public on-chain wallet activation can be demonstrated, and the app has a dedicated Stellar experience for balances, bridging, and reward interactions. At the same time, IRL remains intentionally multi-chain, with checkpoint-level chain configurability and an EVM/Base default stack for broader app operations. The next major unlock is not wallet creation, but making Stellar-native settlement more explicit in the user-facing redemption flow.

## Confidence level by answer

- **High confidence**
  - Stellar wallet count
  - other chain support
  - chain configurability at checkpoint level
  - absence of a clearly productized Stellar USDC redemption flow

- **Medium confidence**
  - monthly active Stellar wallets as a production KPI, because current instrumentation undercounts chain-specific activity

- **Low confidence / should not be overclaimed**
  - true cost per Stellar wallet acquired
  - any precise USDC volume on Stellar as an IRL business metric today
