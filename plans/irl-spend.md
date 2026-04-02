# IRL Spend

## Summary

IRL should simplify the spend plan around a member card, not a staff-run checkout flow.

The cleanest version of IRL spend is:

- IRL knows who the member is
- IRL gets that member a special spend card
- IRL or the member funds the card
- the member spends at the event like a normal cardholder
- IRL receives the transaction signal and issues points automatically

This removes the need to attach a user at the register for every transaction. It also makes spend feel like a member benefit instead of a venue operations tool.

## Recommendation

Build v1 around an **IRL Member Card powered by Bridge**.

Use a small pilot group, one event, and one simple funding model. Keep venue-side checkout integrations as a fallback or later add-on, not the center of the plan.

The recommended first version is:

- pre-enroll a small group of IRL members before the event
- complete Bridge customer onboarding and card eligibility before event day
- issue each member an IRL card
- fund the card with a controlled event balance
- let members spend anywhere the event accepts Visa
- use Bridge transaction webhooks to attribute spend and issue points

## Why this is simpler

The old plan depended on staff identifying a user before every purchase. That is workable, but operationally heavy.

A member card is simpler because:

- identity is already attached to the card account
- the member can spend without staff lookup
- rewards can trigger from the card transaction itself
- the product feels more special and branded
- event partners do not need to change their checkout flow as much

The hardest part moves from venue operations to onboarding and funding, which is a better trade for IRL.

## What Bridge adds

Bridge is not just future infrastructure here. It can be the spend product.

Bridge cards give IRL:

- card issuance for customers
- virtual or physical cards
- funding through multiple models
- pending and settled transaction webhooks
- card freeze and unfreeze controls
- secure card-detail reveal flows
- optional mobile wallet provisioning

That is enough to define a real IRL spend-card plan now.

## Product Concept

### IRL Member Card

An IRL Member Card is a special card linked to an IRL account.

Members use it to spend at events. IRL then uses the card transaction data to:

- tie spend back to the member
- tie spend to an active event
- issue points
- measure member value and partner activity

This can start as a tightly-scoped event card and grow into a broader member spend product later.

## The 4 ways to include a Bridge card

### Option 1: IRL-funded event card

IRL issues a card to a member and pre-funds it for the event.

Example:

- member receives a special IRL card before an event
- IRL loads $25 or $100 onto the card
- member spends that balance at the venue
- IRL rewards every eligible transaction

Why this is strong:

- best pilot experience
- easiest budget control
- cleanest attribution
- strongest "member perk" story

Tradeoffs:

- IRL or the event partner must fund balances
- requires pre-event enrollment and card operations

Best fit:

- sponsored activations
- VIP programs
- artist, creator, or loyalty pilots

### Option 2: Reloadable member card

IRL issues a card, but the member funds it.

Example:

- member gets an IRL card in the app
- member tops it up before or during the event
- member spends from that balance
- IRL issues rewards on spend

Why this is strong:

- better long-term recurring product
- less treasury burden on IRL
- can become a true member wallet + spend loop

Tradeoffs:

- more user education
- more money movement UX
- more support needs around funding and withdrawals

Best fit:

- repeat members
- multi-event usage
- long-term stored-balance strategy

### Option 3: Wallet-linked just-in-time card

IRL issues a card that pulls from a linked wallet when the member spends.

Example:

- member links a wallet
- Bridge pulls funds at authorization time
- no persistent prefunded balance is required on the card

Why this is strong:

- most crypto-native model
- lower prefunding burden
- strong long-term wallet story

Tradeoffs:

- highest user complexity
- wallet approval flows add friction
- less suitable for a first event pilot

Best fit:

- later-stage crypto-native members
- advanced wallet users

### Option 4: Hybrid card + venue checkout fallback

IRL leads with the member card, but also keeps a staff-facing checkout fallback for members who do not yet have the card.

Example:

- cardholders spend directly with the IRL Member Card
- non-cardholders still use a QR or member lookup flow at select event lines

Why this is strong:

- smooth migration path
- less pressure to onboard everyone before launch

Tradeoffs:

- two operating models at once
- more product complexity

Best fit:

- phased rollout
- mixed member readiness

## Bridge funding models that map to the product

Bridge supports three useful card funding strategies. IRL can map each one to a product shape.

### A. Bridge Wallet funding

IRL or the member funds a Bridge wallet, and the card spends from that wallet.

Why it matters:

- best fit if IRL wants a managed balance system
- fits well with broader Bridge wallet and treasury tooling

Good for:

- IRL-funded balances
- managed member balances

### B. Card Wallet funding

Each card gets its own wallet and deposit instructions. Funds are reserved for the card until withdrawn.

Why it matters:

- simplest top-up mental model
- useful if IRL wants a clear per-card balance with webhook-driven updates

Good for:

- event stipends
- simple reloadable cards

### C. Non-custodial funding

The card pulls from an external wallet when the card is used.

Why it matters:

- clean crypto-native architecture
- avoids locking up prefunded balances

Good for:

- advanced members
- later-stage wallet-driven product

## Recommended v1

### Recommendation

Ship **Option 1: IRL-funded event card** first, with either **Bridge Wallet** funding or **Card Wallet** funding.

Do not start with wallet-linked just-in-time spend.

Do not make native mobile-wallet provisioning a requirement for the first launch.

### Why

This is the smallest version that still feels like a real IRL member-spend product:

- the member gets a real card benefit
- event spend does not depend on staff lookup
- balances can be tightly controlled
- rewards can run directly off card transactions
- the event team gets cleaner reporting

## Recommended v1 member experience

1. Member joins or is invited into the IRL spend-card pilot
2. Member completes the required Bridge customer onboarding flow
3. IRL issues the member an IRL card
4. IRL funds the card with an event balance
5. Member uses the card at the event
6. Bridge sends transaction events to IRL
7. IRL matches the spend to the active event and issues points
8. Member sees spend, rewards, and remaining balance in IRL

## Card form factor recommendation

### Best first form factor: physical card

For a first in-person event pilot, a physical card is the safest recommendation.

Why:

- works for tap, chip, and normal venue card flows
- does not require a native mobile app integration
- gives the member a real collectible or VIP-feeling object

### Good second form factor: virtual card with mobile wallet

This becomes attractive once IRL is ready for deeper mobile integration.

Why:

- faster delivery
- no mailing logistics
- strong day-of-event usability

Caution:

- in-app Apple Pay and Google Pay provisioning is heavier operationally
- Bridge supports it, but it is not the best dependency for the first pilot unless IRL already has the right app surface and approvals

## Event attribution model

The card solves identity, but IRL still needs event attribution logic.

IRL should attribute a card transaction to an event based on:

- member card account
- active event time window
- approved venue or merchant list
- optional geography or merchant category rules

This means the spend flow becomes:

- card transaction happens first
- IRL decides whether it counts for the event
- points are issued only when the event rules match

That is simpler than forcing event context into the payment step itself.

## Product requirements

### 1. Member onboarding

IRL needs a clean spend-card onboarding flow inside the app.

This should support:

- member eligibility checks
- Bridge terms and KYC handoff
- clear status states such as invited, pending review, eligible, issued, active

### 2. Card issuance

IRL needs card issuance operations tied to each member.

This should support:

- creating or tracking the Bridge customer
- confirming cards eligibility
- provisioning the member card
- storing non-sensitive card metadata in IRL

### 3. Funding

IRL needs a clear funding model per pilot.

This should support:

- sponsor-funded or IRL-funded balances
- optional member top-ups later
- available balance visibility
- reconciliation between IRL and Bridge balances

### 4. Spend tracking

IRL needs to ingest card transaction events and reflect them on the member account.

This should support:

- pending transaction visibility
- settled transaction updates
- event attribution
- reward issuance
- clear failure logging when rewards are skipped

### 5. Member controls

Members should have basic control over their card.

This should support:

- card status visibility
- freeze and unfreeze
- support flows for lost or stolen cards

### 6. Operator dashboard

IRL should have a simple event and card dashboard.

This should show:

- members with issued cards
- funding status
- spend by event
- reward issuance status
- exceptions that need review

## Bridge constraints to design around

These are important enough to shape the plan:

- the member must complete Bridge card eligibility and KYC before issuance
- a cards approval window is time-sensitive, so event-day mass issuance is risky
- Bridge currently supports one card account per customer
- each card is tied to a single chain and currency at creation
- secure card-detail reveal should be used instead of exposing sensitive details through IRL servers
- freeze and unfreeze are available and should be exposed in the member support flow
- real-time authorization is optional but should stay out of v1 because it introduces tight latency constraints

## What IRL should not build first

- a full POS replacement
- broad merchant settlement tooling
- custom real-time authorization logic
- same-day mass card issuance at the venue
- complex dispute, refund, or chargeback tooling
- a wallet-native version as the first pilot

## Partner roles

### Bridge

Bridge should power:

- customer onboarding for cards
- card issuance
- card funding architecture
- card transaction webhooks
- card controls

### Privy

Privy should continue to power:

- IRL account identity
- wallet readiness for later versions
- account connection between the member and the spend-card experience

### Stripe or venue POS partners

These move out of the critical path for the main concept.

They remain useful only if IRL wants:

- fallback spend flows for non-cardholders
- special staffed checkout lines
- partner-specific integrations later

### Tempo

Tempo remains optional and future-facing.

It may matter later for:

- programmable rewards
- onchain settlement or receipts
- more crypto-native event payment mechanics

## Rollout plan

### Phase 1: prove the card works at one event

- select one event
- enroll a small pilot group
- issue IRL Member Cards before the event
- pre-fund balances
- process real spend
- issue points from Bridge transaction events
- review reporting and support load

### Phase 2: make the card product repeatable

- improve onboarding and eligibility status UX
- add better balance views
- add card controls and support tooling
- expand reporting
- support more events per member

### Phase 3: expand the funding model

- add member top-ups
- add reloadable balances
- explore wallet-linked funding
- add deeper wallet experiences through Privy

### Phase 4: expand the card experience

- mobile wallet provisioning
- more tailored spend policies
- physical and virtual card variations
- richer partner and sponsor programs

## Open questions

- Should the first pilot be sponsor-funded, IRL-funded, or member-funded?
- Does IRL want the first pilot to use physical cards, virtual cards, or both?
- How tightly should event attribution be restricted to specific merchants?
- Should points trigger on authorization, settlement, or a two-step pending-then-final flow?
- Does the first pilot need members to see live balance in the app?
- Does IRL want a fallback non-card spend path in the same launch?

## Decision

The plan should shift from **"staffed event checkout with rewards"** to **"IRL member card with event-linked rewards."**

The recommended first version is:

- Bridge-powered IRL Member Card
- small pre-enrolled member cohort
- controlled event balance
- one event pilot
- rewards issued from card transaction events

That is the simplest plan that feels differentiated, branded, and scalable.
