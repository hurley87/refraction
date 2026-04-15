# App Overview

## What the app is

IRL is a rewards app for cultural events and locations. Users sign in with Privy, create a player profile with a username, discover locations, events, or checkpoint links, complete check-ins to earn points, progress through tiers, browse rewards, and in some flows spend points on checkpoint-linked items. A successful user outcome is: account created, first check-in completed, points accumulated, and at least one downstream value action completed (reward claim, spend redemption, or repeat check-in).

## Current product goal

TODO: the repo does not state a single current team goal. The clearest instrumented product loops are:

- `account_created` -> first `checkin_completed`
- first `checkin_completed` -> repeat `checkin_completed`
- `reward_page_viewed` -> `reward_claimed`
- `spend_redemption_started` -> `spend_redemption_completed`

Use current weekly data to determine which of these is the active bottleneck instead of assuming one.

## Core user flows

### Signup and onboarding

1. **User action:** Sign in with Privy.
2. **App action:** If the user has no linked email, prompt them to link one.
3. **App action:** Check `/api/player` for an existing `players` row for the wallet.
4. **User action:** If no player exists or username is missing, enter a username.
5. **App action:** Create or update the player record, initialize `total_points`, and fire `account_created` only for net-new players.
6. **Success means:** The user has a persisted `players` row with wallet, username, and a usable points balance.

### Discovering a location, checkpoint, or venue

1. **User action:** Open the interactive map, the events page, or a shared checkpoint URL at `/c/[id]`.
2. **App action:** Load visible locations for the map, merge DICE events with manual JSON events for the events page, or load the active checkpoint configuration.
3. **User action:** Pick a place to visit or a checkpoint to use.
4. **Success means:** The user reaches a valid surface where they can check in, redeem a spend item, or browse a venue/event.

### Completing a location check-in

1. **User action:** Select or submit a location and attempt a location check-in.
2. **App action:** Create or fetch the player and location, reject duplicate check-ins, and reject non-creators from checking in to hidden pending locations.
3. **App action:** Write a `player_location_checkins` row and increment `players.total_points`.
4. **App action:** Track `checkin_completed` with `checkin_type=location`, track `points_earned`, and check for tier progression.
5. **Success means:** A new persisted location check-in exists and the player's point balance increases.

### Completing a checkpoint check-in

1. **User action:** Open a checkpoint link at `/c/[id]`.
2. **App action:** Resolve the checkpoint's required chain (`evm`, `solana`, `stellar`, or `aptos`) and require the matching wallet.
3. **App action:** Auto-submit the checkpoint check-in request.
4. **App action:** Enforce the daily checkpoint limit, insert a `points_activities` row with `activity_type=checkpoint_checkin`, increment `players.total_points`, and track `checkin_completed` with `checkin_type=checkpoint`.
5. **Success means:** The checkpoint success screen renders and the player receives checkpoint points.

### Earning points and progressing through tiers

1. **User action:** Complete a points-earning action.
2. **App action:** The current live points-earning actions are location check-ins, checkpoint check-ins, and location creation.
3. **App action:** Update `players.total_points`.
4. **App action:** Resolve the current tier from the `tiers` table and fire `tier_progression` only if the tier changed.
5. **Success means:** The player's balance is updated and tier state is current.

### Browsing rewards

1. **User action:** Open `/rewards`, `/perks`, or a specific perk detail page.
2. **App action:** Load active `perks`, current player balance, `tiers`, redemption state, and available code information.
3. **App action:** Track `$pageview` plus `reward_page_viewed` when a reward detail is opened.
4. **User action:** Compare requirements, expiration, partner, and current eligibility.
5. **Success means:** The user reaches a reward detail with enough information to decide whether to claim.

### Claiming rewards

1. **User action:** Open a perk detail page and click **Redeem** if eligible.
2. **App action:** Check current points, expiration, existing redemption, and code availability.
3. **App action:** Insert a `user_perk_redemptions` row and assign a `perk_discount_codes` record.
4. **App action:** Track `reward_claimed`.
5. **Success means:** The user receives a code or claim link for that perk.

Important: perk claims do **not** deduct points. Points act as a qualification threshold for perks.

### Starting and completing spend redemption

1. **User action:** Reach a spend surface through a spend checkpoint (`/c/[id]` where `checkpoint_mode=spend`) or a spend item page at `/spend/[id]`.
2. **App action:** Load the linked `spend_items`, current balance, and prior `spend_redemptions`.
3. **User action:** Start the redemption.
4. **App action:** Either create a pending redemption first or complete the redemption immediately, depending on the flow.
5. **App action:** Track `spend_redemption_started` for the pending-create flow.
6. **User action:** Verify at the bar or complete the instant flow.
7. **App action:** Mark the redemption fulfilled, deduct points when the redemption is verified/completed, and track `spend_redemption_completed`.
8. **Success means:** A fulfilled `spend_redemptions` row exists and the player's points balance is lower.

### Returning for repeat usage

1. **User action:** Come back after the first successful action.
2. **App action:** Load the dashboard, points balance, activity history, map, events, rewards, and checkpoints.
3. **User action:** Complete another check-in, claim another eligible reward, or finish a spend redemption.
4. **Success means:** The user records another meaningful persisted action after initial activation.

## Existing features

### Live

| Feature name                   | What it does                                                                                                        | Who uses it        | Status |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------ | ------ |
| Privy auth + player onboarding | Authenticates users, links email, and creates a player profile with username and wallet identity.                   | End users          | `live` |
| Interactive map                | Shows visible locations and serves as the main discovery surface for check-ins.                                     | End users          | `live` |
| Location check-ins             | Lets a user check in at a location, persist the visit, and earn points.                                             | End users          | `live` |
| Checkpoint check-ins           | Lets a user open `/c/[id]`, satisfy chain requirements, and complete a checkpoint-based check-in.                   | End users          | `live` |
| Points balance + tiers         | Stores current points on `players.total_points`, resolves tiers from `tiers`, and updates tier analytics on change. | End users          | `live` |
| Dashboard + leaderboard        | Shows user points/activity and ranked users.                                                                        | End users          | `live` |
| Rewards catalog                | Lists active rewards across `/rewards` and `/perks` with eligibility and expiration context.                        | End users          | `live` |
| Perk claiming                  | Lets an eligible user redeem a perk and receive a code or claim link.                                               | End users          | `live` |
| Spend redemption               | Supports point-spend items tied to checkpoints, pending verification, instant redemption, and completion tracking.  | End users          | `live` |
| Events page                    | Shows public events from DICE plus manually maintained events.                                                      | End users          | `live` |
| User-submitted locations       | Lets users create locations; non-admin-created locations start hidden and may need approval.                        | End users + admins | `live` |
| Admin operations surfaces      | Admin routes exist for users, locations, checkpoints, perks, analytics, city metrics, and related operations.       | Internal team      | `live` |

### Partial / Manual

| Feature name                 | What it does                                                                                                             | Who uses it                 | Status    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------- | --------- |
| Challenges / quests          | Shows challenge content, but current quest progress and completion state are randomized client-side from static JSON.    | End users                   | `partial` |
| City guides                  | Route exists, but content is explicitly placeholder data until a CMS powers it.                                          | End users                   | `partial` |
| Events ingestion             | Event discovery is live, but part of the feed comes from manually maintained JSON instead of one fully automated source. | End users + internal team   | `manual`  |
| Spend fulfillment operations | User-facing spend flows are live, but admin fulfillment paths and venue verification can rely on manual operations.      | Internal team + venue staff | `manual`  |

### Planned but not live

| Feature name                   | What it does                                                                                          | Who uses it               | Status             |
| ------------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------- | ------------------ |
| CMS-powered city guides        | Replace the current placeholder guides/editorials with real CMS-backed content.                       | End users + internal team | `planned-not-live` |
| TODO: additional roadmap items | The repo does not contain a reliable, current product roadmap beyond the explicit placeholders above. | TODO                      | `planned-not-live` |

## Key data sources and definitions

### Supabase

- Stores persisted product state: users, points balances, locations, check-ins, checkpoints, perks, codes, redemptions, tiers, and admin-facing analytics queries.
- Trust Supabase for completed facts that should exist as rows or current balances after a successful write.
- Limitations:
  - `players.total_points` is the operative current points balance.
  - `points_activities` is **not** a complete ledger of every point mutation.
  - Some analytics use RPCs with code fallbacks.
  - Public discovery often filters out hidden locations.

### Mixpanel

- Stores behavioral analytics: pageviews, activation events, reward views/claims, spend redemptions, location creation, and tier progression.
- Trust Mixpanel for engagement trends, funnels, and behavior sequencing when an event is actually instrumented.
- Limitations:
  - Client and server identity resolution can differ because distinct ID priority is `email > privyUserId > walletAddress > playerId`, with server fallback to wallet on failure.
  - `session_started` and `tier_changed` are defined in code but not currently emitted.
  - Some user properties are incomplete or placeholder (for example, `cohort` is hard-coded to `new` on the client).
  - Similar behavioral counts may not exactly match Supabase row counts.

| Name                         | Type           | Source            | Meaning                                                                                       | When it is created or fired                                                              | Caveats                                                                                                       |
| ---------------------------- | -------------- | ----------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `players`                    | table          | Supabase          | One row per player profile with wallet identity, username, email, and current points balance. | Created or updated through player creation/update and some check-in flows.               | Use `players.total_points` as current balance; Mixpanel identity may use email instead of wallet.             |
| `points_activities`          | table          | Supabase          | Stored point-earning activity rows.                                                           | Written for checkpoint check-ins and location creation.                                  | Not a complete ledger for all point changes.                                                                  |
| `player_location_checkins`   | table          | Supabase          | Persisted location visit records.                                                             | Written on successful location check-in.                                                 | Duplicate location check-ins are blocked.                                                                     |
| `locations`                  | table          | Supabase          | Discoverable locations or venues.                                                             | Created through location creation or location check-in flows.                            | Public surfaces typically use visible locations only; new user-created rows may start hidden.                 |
| `checkpoints`                | table          | Supabase          | Configuration for `/c/[id]` check-in or spend flows.                                          | Managed through admin checkpoint flows.                                                  | Checkpoints can be `checkin` or `spend` mode.                                                                 |
| `tiers`                      | table          | Supabase          | Point-range definitions for membership tiers.                                                 | Managed in admin data.                                                                   | Tier membership is derived from `players.total_points`.                                                       |
| `perks`                      | table          | Supabase          | Reward catalog.                                                                               | Managed in admin data.                                                                   | Points qualify the user; they are not spent on perk claim.                                                    |
| `user_perk_redemptions`      | table          | Supabase          | Claimed perk records.                                                                         | Written on successful perk redemption.                                                   | Claiming a perk does not deduct points.                                                                       |
| `perk_discount_codes`        | table          | Supabase          | Reward code inventory and assignments.                                                        | Managed in admin data; assigned on perk redemption.                                      | Supports universal/public codes and user-assigned codes.                                                      |
| `spend_items`                | table          | Supabase          | Items users can spend points on.                                                              | Created or synced from spend checkpoints/admin flows.                                    | Often linked to a checkpoint; inactive items can remain for history.                                          |
| `spend_redemptions`          | table          | Supabase          | Point-spend redemption records.                                                               | Written when a spend redemption starts or completes.                                     | Pending rows exist before fulfillment; points are deducted on verification/completion, not on pending create. |
| `account_created`            | event          | Mixpanel          | A new player profile was created.                                                             | Fired only when `/api/player` creates a net-new player.                                  | In this route, `wallet_type` is currently sent as `EVM`.                                                      |
| `user_active`                | event          | Mixpanel          | Generic marker for user activity.                                                             | Fired alongside check-ins, reward claims, location creation, and spend start/completion. | Not every screen view or action emits it.                                                                     |
| `$pageview`                  | event          | Mixpanel          | Route view.                                                                                   | Fired on route changes by the analytics provider.                                        | Client-side event; includes `checkpoint_id` for `/c/[id]`.                                                    |
| `checkin_completed`          | event          | Mixpanel          | Successful location or checkpoint check-in.                                                   | Fired after successful check-in writes.                                                  | Use `checkin_type` to separate location vs checkpoint; checkpoint events use `location_id: 0`.                |
| `checkin_type`               | field          | Mixpanel property | Subtype of check-in.                                                                          | Attached to `checkin_completed`.                                                         | Property only; not a standalone event.                                                                        |
| `points_earned`              | event          | Mixpanel          | Points were awarded for an action.                                                            | Fired for checkpoint check-ins, location check-ins, and location creation.               | Does not represent point spending.                                                                            |
| `reward_page_viewed`         | event          | Mixpanel          | A reward detail was opened.                                                                   | Fired when a reward modal or perk detail page opens.                                     | Captures detail views, not every browse/list impression.                                                      |
| `reward_claimed`             | event          | Mixpanel          | A user successfully claimed a perk.                                                           | Fired after successful perk redemption.                                                  | Does not mean points were deducted.                                                                           |
| `spend_redemption_started`   | event          | Mixpanel          | A spend redemption was initiated.                                                             | Fired on the pending-create spend flow.                                                  | Not all instant spend paths emit a start event first.                                                         |
| `spend_redemption_completed` | event          | Mixpanel          | A spend redemption was fulfilled or verified.                                                 | Fired on verify, admin fulfill, or instant redemption completion.                        | Better completion signal than `spend_redemption_started`.                                                     |
| `tier_changed`               | event          | Mixpanel          | Event constant/helper exists in code.                                                         | TODO: not currently fired.                                                               | Do not use as a live reporting event.                                                                         |
| `tier_progression`           | event          | Mixpanel          | Tier actually changed after a points update.                                                  | Fired only when the tier range changes.                                                  | Absence of the event can mean points changed without crossing a tier boundary.                                |
| `location_created`           | event          | Mixpanel          | A location was created.                                                                       | Fired after successful location creation and some admin CSV imports.                     | Does not mean the location is publicly visible yet.                                                           |
| `city_milestone`             | event          | Mixpanel          | A city hit a visible-location threshold.                                                      | Fired when visible location count hits 10, 25, 50, 100, 250, or 500.                     | Based on visible locations only.                                                                              |
| `total_points_awarded`       | derived metric | Supabase          | Admin analytics summary field.                                                                | Calculated when analytics summary is requested.                                          | Implemented as the sum of `players.total_points`, not a sum of `points_activities`.                           |

## Source-of-truth rules

- Supabase is the source of truth for persisted product facts:
  - current points balances
  - completed location check-ins
  - completed perk claims
  - spend redemption state
  - active locations, checkpoints, tiers, and rewards
- Mixpanel is the source of truth for:
  - engagement trends
  - route views
  - funnel conversion
  - reward demand
  - behavior sequencing
- Similar metrics may not match exactly.
- Expected reasons for mismatch include:
  - delayed analytics ingestion
  - event retries or duplication
  - client vs server identity resolution differences
  - behavioral events that do not always correspond to a persisted row
  - persisted rows that are hidden or admin-only in some surfaces
  - `players.total_points` representing net current balance while events represent actions over time
- Do **not** try to reconstruct current points balances from Mixpanel events.
- Do **not** assume `points_activities` contains every points mutation.
- If the question is "how many completed things exist now?", prefer Supabase.
- If the question is "where are users dropping in a flow?", prefer Mixpanel.

## Important funnels

| Funnel name                              | Start step                 | Success step                                                         | Why it matters                                                                     |
| ---------------------------------------- | -------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Signup -> first check-in                 | `account_created`          | first `checkin_completed`                                            | Measures activation from account creation into the first core product action.      |
| First check-in -> repeat check-in        | first `checkin_completed`  | second `checkin_completed`                                           | Measures whether the product creates repeat usage after initial activation.        |
| Reward interest -> reward claim          | `reward_page_viewed`       | `reward_claimed`                                                     | Measures whether reward demand converts into claimed value.                        |
| Spend redemption start -> completion     | `spend_redemption_started` | `spend_redemption_completed`                                         | Measures whether points-spend intent turns into completed redemption.              |
| Location creation -> usable venue growth | `location_created`         | visible location count growth and/or successful downstream check-ins | Measures whether the supply side is growing into something users can actually use. |

## Constraints

- New user-created locations can start hidden and may require admin approval before public discovery.
- Location creation is capped per creator per week.
- Events data is hybrid: DICE API plus manually maintained JSON.
- Challenges / quests are not fully productized; current progress/completion is placeholder behavior.
- City guides are not fully productized; current content is placeholder data pending CMS support.
- Spend redemption can involve manual or venue-side verification/fulfillment steps.
- Mixpanel instrumentation is incomplete:
  - `session_started` is not emitted
  - `tier_changed` is not emitted
  - `cohort` is hard-coded to `new`
  - reward browsing intent is only partially captured
- Reward claims and spend redemptions are different:
  - perks are qualification-based and do not deduct points
  - spend redemptions deduct points on completion
- Checkpoint check-ins have a daily limit.
- TODO: current traffic volume, launch stage, active city footprint, and reward inventory limits are not documented in the repo.

## Do Not Recommend

- Do not recommend building basic wallet auth or username onboarding from scratch; both already exist.
- Do not recommend adding a map-based location discovery surface; it already exists.
- Do not recommend adding check-ins as a new concept; both location check-ins and checkpoint check-ins already exist.
- Do not recommend adding points, tiers, a dashboard, or a leaderboard as new features; all already exist.
- Do not recommend adding a rewards catalog or reward detail page; both already exist.
- Do not recommend adding perk redemption or discount code delivery; both already exist.
- Do not recommend adding point-spend redemptions; spend checkpoints, spend items, and redemption completion flows already exist.
- Do not recommend adding an events page from scratch; it already exists.
- Do not recommend suggesting city guides or challenges as net-new ideas; both already exist, but are partial/placeholder implementations.
- Do not recommend work that assumes perfect analytics coverage, fully automated venue ops, or a finished CMS without acknowledging current constraints.
- Do not recommend generic growth ideas disconnected from a measured bottleneck.

## Open questions / missing instrumentation

- TODO: the repo does not document the team's single current product goal or north-star metric.
- `session_started` is defined but not emitted.
- `tier_changed` is defined but not emitted; current live tier-change signal is `tier_progression`.
- `cohort` is currently hard-coded to `new`, so it should not be trusted for real segmentation.
- There is no complete persisted ledger for all points changes in one table; `players.total_points` and action tables must be interpreted together.
- Reward browse intent is only partially captured. There is no strong live event for "reward list viewed but no reward detail opened."
- There is no dedicated live event for failed reward claim attempts caused by insufficient points, expiration, or sold-out state.
- Spend start instrumentation does not cover every instant redemption path symmetrically.
- Joining Mixpanel users to Supabase users can be messy because Mixpanel distinct IDs may be email, Privy ID, wallet, or player ID.
- TODO: current live city count, active venue count, and active reward inventory are not documented in a stable reference file.
- TODO: there is no clear documented mapping from weekly business questions to exact SQL queries / Mixpanel reports.

## How this file should be used

- Use this file as the first reference when interpreting weekly product data.
- Use it to avoid recommending features that already exist.
- Prefer at most one concrete, realistic product recommendation per weekly recap.
- Tie any recommendation directly to an observed bottleneck in Supabase or Mixpanel data.
- If the evidence is weak or instrumentation is missing, say there is no clear recommendation this week.
