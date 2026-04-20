# IRL Bridge Card

## Summary

IRL should create a dedicated member card product powered by Bridge.

The core idea is simple:

- the card is the member's real-world identity inside the IRL ecosystem
- the card is also the member's event spend instrument
- the member logs into IRL on the web with Privy
- the website becomes the place to see transactions, balance, rewards, and card status

This makes the physical card the in-person surface and Privy the digital account layer.

## Product Thesis

An IRL member should not need to identify themselves in multiple different ways at an event.

The cleanest experience is:

- the member has one IRL card
- that card is tied to exactly one IRL member profile
- when the card is used, IRL knows which member it belongs to
- IRL can attach spend, rewards, and event activity to that member automatically

In person, the card is the identity.

Online, the Privy account is the login.

Together, they form one member account across real life and the web.

## Recommendation

Build a new product line called the **IRL Member Card**.

The recommended first version is:

- one Bridge card account per participating member
- one linked IRL member record
- one linked Privy-authenticated website account
- one simple funding model for the pilot
- one event cohort or one partner cohort to start

The card should be treated as a first-class membership object, not just a payment method.

## What the card is

The IRL Member Card should represent four things at once:

### 1. Identity in real life

When a member presents or pays with the card at an event, IRL can recognize who they are by the linked card account.

### 2. Spend instrument

The card can be used anywhere that the program rules allow and the merchant accepts the network.

### 3. Rewards trigger

Card activity gives IRL a clean signal for points, perks, and event-linked rewards.

### 4. Member status object

The card can visually and operationally signal membership tier, pilot access, VIP status, or sponsor-backed perks.

## What Privy does

Privy remains the digital identity and account access layer.

Members should use Privy to:

- sign into the IRL website
- link or confirm ownership of their member profile
- view card transactions
- see balance and rewards
- freeze or unfreeze the card
- manage support flows

The card should not replace website login.

Instead:

- **Bridge card** = in-person identity and spend
- **Privy login** = digital account access and account recovery

## Canonical account model

IRL should model the system like this:

- one `privy_user_id`
- one `irl_member_id`
- one Bridge `customer_id`
- one Bridge `card_account_id`

The important product rule is:

**A member card belongs to one member, and the website account for that member is accessed through Privy.**

## Member experience

### In real life

The member:

- receives an IRL card
- uses it at the event or approved merchant
- is automatically recognized through the linked card account
- earns rewards without needing staff lookup

### On the website

The member signs in with Privy and sees:

- card status
- available balance
- recent transactions
- pending versus settled transactions
- rewards earned from card activity
- support actions such as freeze or lost-card reporting

## The 3 strongest versions of the product

### Option 1: Sponsored event card

IRL or a sponsor funds the member card for a specific activation.

Example:

- a member is invited to an event
- IRL issues the card before the event
- the card is loaded with a fixed amount
- the member spends with that card during the activation
- the member logs in later with Privy to review transactions and rewards

Why this is strong:

- easiest pilot to control
- strongest VIP or sponsor story
- best way to prove the card can act as identity plus spend

Tradeoffs:

- IRL or the sponsor carries the funding burden
- requires pre-event onboarding

### Option 2: Reloadable member card

The member has a persistent IRL card that can be funded and reused across events.

Example:

- member receives an IRL card once
- member or IRL adds funds
- member uses the same card across multiple events
- member signs in with Privy to see a growing spend history and rewards history

Why this is strong:

- strongest long-term membership product
- creates a durable spend graph tied to one member identity
- makes the website more valuable over time

Tradeoffs:

- more balance-management UX
- more support and reconciliation needs

### Option 3: Hybrid member card

The card is the primary member identity in person, but IRL can still support QR or web fallback for members who do not yet have the card.

Example:

- cardholders pay or identify with the card
- non-cardholders use a QR or member code
- both still log into the website with Privy

Why this is strong:

- smoother rollout
- less pressure to onboard every member at once

Tradeoffs:

- two identity paths at the same time
- more product complexity than a card-only model

## Recommended v1

Start with **Option 1: Sponsored event card**.

This is the smallest version that clearly proves the product idea:

- the card works as in-person identity
- the card works as event spend
- the website works as the account center
- rewards are attached to the right member automatically

## Recommended v1 flow

1. Member is invited into the IRL card pilot
2. Member signs into IRL with Privy
3. IRL creates or links the member profile
4. Member completes the required Bridge onboarding flow for cards
5. IRL provisions the Bridge card for that member
6. IRL funds the card for the pilot
7. Member uses the card in person
8. Bridge sends transaction events to IRL
9. IRL maps those events to the member and applicable event rules
10. Member logs into the website with Privy to see transactions, rewards, and card status

## How Bridge fits

Bridge should power:

- customer onboarding for cards
- card issuance
- funding architecture
- transaction events
- freeze and unfreeze controls
- secure reveal of card details when needed
- optional mobile wallet provisioning later

This is enough to support a real card-centered IRL product.

## Funding choices

Bridge supports multiple funding strategies. IRL should choose one per launch phase.

### A. Card Wallet funding

Each card has its own balance and funding instructions.

Best for:

- sponsored balances
- simple event stipends
- easy member understanding

### B. Bridge Wallet funding

The card spends from a Bridge-managed wallet associated with the member or program.

Best for:

- managed treasury flows
- deeper wallet infrastructure later

### C. Non-custodial funding

The card pulls from an external wallet when used.

Best for:

- later crypto-native versions
- advanced members only

Not recommended for the first pilot.

## Identity and attribution model

The core benefit of the Bridge card is that it removes the need for staff to attach identity at checkout.

IRL should treat the card account as the primary in-person identifier.

When a transaction is received from Bridge, IRL should:

- map the `card_account_id` to the member
- determine whether the spend matches an active event or campaign
- issue points or perks based on the matching rules
- store the transaction in the member ledger shown on the website

## Website requirements

The website should be the member control panel for the card.

### 1. Privy sign-in

Members must be able to access the card account experience using Privy authentication.

### 2. Card overview

Members should see:

- card status
- last 4 digits
- available balance
- funding source label

### 3. Transaction history

Members should see:

- pending transactions
- settled transactions
- merchant details available from Bridge
- event attribution where applicable

### 4. Rewards history

Members should see:

- points earned from card activity
- reward status
- any skipped or ineligible transactions with a simple explanation

### 5. Card controls

Members should be able to:

- freeze the card
- unfreeze the card
- report lost or stolen status

### 6. Support and recovery

Members should have a clear path for:

- support contact
- replacement card flow
- onboarding status issues

## Event experience requirements

In person, the product should feel simple.

The card should support:

- spend at approved venues or merchants
- automatic attribution back to the member
- optional event-specific bonuses
- no mandatory staff lookup for standard spend flows

If IRL wants non-spend identity uses later, the card can also carry:

- printed member ID
- visual tier marker
- QR code for check-in or support

## Data model requirements

IRL should store and maintain:

- `privy_user_id`
- `irl_member_id`
- `bridge_customer_id`
- `bridge_card_account_id`
- card status
- non-sensitive card metadata
- balance snapshots if needed for UI
- transaction ledger
- rewards ledger

IRL should not expose sensitive card details directly from its own backend if Bridge provides a secure reveal flow.

## Operations requirements

IRL needs internal tooling for:

- member-to-card linking
- onboarding status tracking
- funding status tracking
- transaction reconciliation
- reward issuance review
- card support actions

## Constraints to design around

- card issuance requires Bridge customer onboarding and card eligibility
- card approval timing matters, so instant mass issuance on event day is risky
- Bridge currently supports one card account per customer
- each card is tied to a specific currency and chain at creation
- real-time authorization exists but adds latency risk and should stay out of v1
- mobile wallet provisioning is useful later but should not be required for the first launch

## What IRL should not build first

- a full POS product
- custom real-time authorization logic
- broad merchant settlement tooling
- same-day venue card issuance at scale
- complex disputes and chargeback operations
- multiple overlapping funding models in the first pilot

## Rollout plan

### Phase 1: prove the member card

- select a small pilot cohort
- onboard members through Privy plus Bridge card onboarding
- issue cards before the event
- fund the cards
- capture transactions
- show those transactions on the website
- issue points automatically

### Phase 2: make the website account useful

- improve transaction history
- improve rewards visibility
- add card controls
- add support tooling

### Phase 3: make the card reusable

- support repeat events
- support persistent balances or reloads
- expand partner programs

### Phase 4: deepen the card product

- virtual card support
- mobile wallet provisioning
- more advanced funding models
- richer event and sponsor policies

## Open questions

- Should the first card be physical, virtual, or both?
- Should the first pilot be fully sponsor-funded or partly member-funded?
- Should points be issued on authorization or settlement?
- How restrictive should event attribution rules be?
- Does IRL want the card to carry printed QR or visible member metadata for non-payment identity uses?

## Decision

Create a separate product plan around a **Bridge-powered IRL Member Card**.

The product should treat:

- the **card** as the member's real-world identity and spend instrument
- **Privy** as the member's website login and account access layer
- the **website** as the place to review card transactions, rewards, balance, and card controls

That is the clearest way to make the card feel central to IRL membership.
