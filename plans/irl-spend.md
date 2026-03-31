# IRL Spend

## Summary

IRL needs a simple way for people to make purchases at events and immediately receive points tied to that purchase.

The first version should prove that IRL can support a real in-person transaction loop from checkout through rewards. The goal is not to build a full payments platform yet. The goal is to make one event work cleanly end-to-end.

## Objective

Make paying with IRL feel simple and real at a live event.

A user should be able to identify themselves, complete a purchase in person, and instantly receive points, with the transaction tied to the correct event.

## What We’re Building

A lightweight in-person spend flow inside IRL that includes:

- a clear Pay with IRL experience
- a staff-friendly checkout flow
- instant payment confirmation
- instant points issuance
- event-linked transaction tracking
- a simple dashboard to review transactions

## Core Idea

In v1, Pay with IRL does not need to mean stablecoin-only checkout.

It should mean:

- the user is recognized through IRL
- the payment is tied to their IRL account
- the purchase is tied to the event
- points are issued immediately after payment
- staff can process transactions without confusion

## Goals

- Process one full event end-to-end using IRL spend
- Make checkout easy enough that most payments do not require staff help
- Attach every purchase to an event
- Issue points automatically after successful payment
- Give operators a basic way to track transactions during and after the event

## Success Metrics

- 1 full event processed end-to-end
- 75%+ of payments complete without staff help
- 100+ transactions processed cleanly
- Every successful payment tied to an event
- Every successful payment either issues points or logs a clear reason why it did not

## Partner Roles

### Stripe

V1 uses **Stripe Terminal** for card-present payments at the event. Stripe handles authorization and settlement; IRL handles identity, checkout sessions, rewards, and event-scoped records. The handoff between products is defined in **How payment works (v1)**.

### Privy

Privy is the identity and wallet layer.

Privy should help make the experience feel seamless for users by handling login, account identity, and wallet readiness. Even if v1 is not stablecoin-first, Privy sets IRL up for a future where wallet-based spend, balances, and onchain rewards are a natural extension of the product.

### Bridge

Bridge is the future balance and stablecoin infrastructure layer.

Bridge does not need to sit in the critical path for the first event flow, but it is important as IRL expands toward stablecoin-based spending, stored balances, treasury movement, and payment infrastructure behind the scenes.

### Tempo

Tempo is the future event payments and programmable rewards layer.

Tempo is an interesting opportunity because it can help IRL explore a more crypto-native version of event payments over time. It should not block the first spend launch, but it can become part of how IRL handles things like onchain receipts, payment-linked rewards, and more programmable event transaction mechanics later on.

## How payment works (v1)

Stripe Terminal is designed to sit inside an existing POS workflow. Responsibilities split like this:

- **IRL** — User identification, checkout session state, post-payment confirmation, points issuance, and logging the transaction against the event.
- **Stripe Terminal** — Collecting the in-person card payment (the physical reader flow your staff already uses alongside the register).

End-to-end: IRL identifies the attendee and creates the checkout session; Terminal runs the card payment; when Terminal succeeds, IRL confirms the purchase, issues points, and records the event-linked transaction.

Venues do not need to replace their full POS to use IRL spend. In v1, IRL can run as a focused event checkout for specific lines—door sales, drink tickets, merch, VIP purchases, and similar—with **Stripe Terminal** covering the in-person card step alongside whatever register system they already use.

## v1 Scope

### In Scope

- one live event spend flow
- one simple purchase flow, starting with something like a Drink Ticket
- a user identification step before payment
- a payment confirmation screen
- instant points issuance after successful payment
- event ID attached to every transaction
- a basic transaction dashboard inside IRL
- Stripe Terminal for card-present payment in the first version

### Out of Scope

- full stablecoin-native checkout
- a broad merchant platform
- advanced inventory management
- complex refund tooling
- multi-event operational tooling beyond what is needed for launch
- deep Bridge or Tempo integration in the first live flow

## User Experience

### For the attendee

The attendee opens IRL and uses Pay with IRL to identify themselves at checkout.

They should be able to:

- show a QR or member code
- complete a purchase quickly
- see confirmation that payment worked
- receive points immediately

### For staff

Staff should be able to:

- attach the correct user in IRL before charging
- run Terminal payment with confidence and read clear success or failure in IRL
- retry or recover easily if something goes wrong

### For operators

Operators should be able to:

- view all event transactions in one place
- see who paid, what they bought, and whether points were issued
- confirm the event processed cleanly

## Recommended v1 Flow

1. The user presents their IRL member QR at checkout
2. Staff uses the IRL admin / POS screen on a phone or tablet to scan the QR or enter a short member code manually
3. IRL looks up the user, attaches them to the active event, and creates the checkout session
4. Staff selects the item and starts payment in IRL
5. IRL creates the Stripe payment session and connects to **Stripe Terminal**
6. The customer pays on the Stripe Terminal reader
7. On success, IRL shows confirmation, issues points, and logs the sale to the event

**Rule:** Finish member lookup, event attachment, and checkout session (steps 1–3) before staff starts payment (step 4 onward) so attribution and rewards stay correct.

## Product Requirements

### 1. Pay with IRL

IRL needs a simple user-facing payment identity screen.

This should let the user present:

- a QR code or member code
- their IRL identity for checkout
- optionally their points balance or rewards context

### 2. Checkout Flow

IRL needs a staff-facing checkout flow for live events.

This should support:

- attaching a user to a transaction
- selecting the item or offer
- handing off to **Stripe Terminal** for the card read, then reflecting the result in IRL
- showing success or failure clearly

### 3. Confirmation

After payment succeeds, IRL should show a clear confirmation state.

This should include:

- that payment was successful
- what was purchased
- the event context
- points earned

### 4. Instant Points

Successful payments should trigger points automatically.

This should feel immediate and reliable.

### 5. Event Attribution

Every transaction should be tied to an event.

This is a core requirement for reporting, analytics, and partner value.

### 6. Transaction Dashboard

IRL should have a simple dashboard for event transactions.

This should show:

- transaction list
- payment status
- user
- event
- points issued

## Rollout Plan

### Phase 1

Ship one real event flow:

- one event
- one checkout experience
- one or a few simple products
- instant points
- transaction dashboard
- Stripe Terminal at the venue

### Phase 2

Improve the operating experience:

- more products
- better retry flows
- cleaner staff tooling
- better reporting

### Phase 3

Expand payment depth:

- stored balance
- stablecoin spend
- deeper wallet experiences through Privy
- balance and settlement infrastructure through Bridge
- more programmable event payment and rewards mechanics through Tempo

## Open Questions

- Is the first live use case just Drink Ticket, or do we need multiple products?
- Should confirmation appear on the attendee device, the staff device, or both?
- How should spend-based points be calculated?
- Do we need refunds for v1?
- How much transaction detail is needed in the first dashboard?

## Decision

Launch v1 as a tight loop: identify the user in IRL → item and session in IRL → pay on **Stripe Terminal** → IRL confirms, issues points, and logs the transaction to the event.

**Privy** supports identity and wallet readiness. **Bridge** and **Tempo** guide later phases (balances, stablecoin spend, programmable event payments), not the first live Terminal loop.

That is the smallest version of IRL spend that proves the concept in the real world.
