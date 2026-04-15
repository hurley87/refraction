# IRL

IRL is a rewards app for cultural events and locations. Users sign in with [Privy](https://privy.io), create a player profile, discover locations and events, complete check-ins to earn points, progress through tiers, and redeem perks.

## Tech stack

- **Framework**: Next.js 14 (App Router)
- **Auth**: Privy — social login + embedded multi-chain wallets (EVM/Base, Solana, Stellar)
- **Database**: Supabase PostgreSQL
- **Blockchain**: Wagmi/Viem (EVM), Solana Web3.js, Stellar/Soroban
- **State**: React Query v5
- **Validation**: Zod
- **UI**: Tailwind CSS + shadcn/ui (Radix-based)
- **Analytics**: Mixpanel (client + server)
- **Maps**: Mapbox GL

## Getting started

**Package manager:** Yarn 1.22.22 is required (specified in `packageManager`).

```bash
yarn install
cp .env.local.example .env.local   # then fill in credentials
yarn dev                            # http://localhost:3000
```

## Environment variables

Create `.env.local` from `.env.local.example`. Required variables:

```bash
# Auth
NEXT_PUBLIC_PRIVY_APP_ID=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Maps
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=

# Analytics
NEXT_PUBLIC_MIXPANEL_TOKEN=   # client-side project token
MIXPANEL_TOKEN=               # server-side (falls back to NEXT_PUBLIC_MIXPANEL_TOKEN)
MIXPANEL_SECRET=              # optional, for enhanced API security

# Blockchain
SERVER_WALLET_PRIVATE_KEY=
BASE_RPC_URL=
```

### Stellar / Soroban (optional)

The app auto-selects testnet in development and mainnet in production (`VERCEL_ENV=production`). Override with:

```bash
NEXT_PUBLIC_STELLAR_NETWORK=TESTNET          # TESTNET | PUBLIC | FUTURENET | LOCAL
# Network-specific contract addresses (recommended)
NEXT_PUBLIC_NFT_CONTRACT_ADDRESS_MAINNET=
NEXT_PUBLIC_NFT_CONTRACT_ADDRESS_TESTNET=
NEXT_PUBLIC_SIMPLE_PAYMENT_CONTRACT_ADDRESS_MAINNET=
NEXT_PUBLIC_SIMPLE_PAYMENT_CONTRACT_ADDRESS_TESTNET=
```

## Commands

```bash
yarn dev            # Dev server at http://localhost:3000
yarn build          # Production build
yarn lint           # ESLint
yarn test           # Vitest (single run)
yarn test:watch     # Vitest watch mode
yarn test:coverage  # Coverage report
```

## Core user flows

| Flow                   | Entry point                            | Success signal                                             |
| ---------------------- | -------------------------------------- | ---------------------------------------------------------- |
| Signup & onboarding    | Privy sign-in                          | `players` row with wallet + username                       |
| Location discovery     | Map or `/c/[id]`                       | User reaches a check-in surface                            |
| Location check-in      | Map pin or location page               | `player_location_checkins` row written, points incremented |
| Checkpoint check-in    | `/c/[id]`                              | `points_activities` row written, points incremented        |
| Rewards browse & claim | `/rewards` or `/perks`                 | `user_perk_redemptions` row with code or link              |
| Spend redemption       | `/c/[id]` with `checkpoint_mode=spend` | `spend_redemptions` fulfilled, points deducted             |

> **Note:** Perk claims do **not** deduct points — points act as a qualification threshold. Only spend redemptions deduct points.

## Feature status

### Live

- Privy auth + player onboarding
- Interactive map (main discovery surface)
- Location check-ins and checkpoint check-ins
- Points balance, tiers, dashboard, leaderboard
- Rewards catalog + perk claiming (qualification-based, no deduction)
- Spend redemption (points deducted on completion)
- Events page (DICE API + manually maintained JSON)
- User-submitted locations (new submissions start hidden, may need admin approval)
- Admin surfaces: users, locations, checkpoints, perks, analytics, city metrics

### Partial / manual

- **Challenges / quests** — UI exists; progress is randomized client-side from static JSON
- **City guides** — route exists; content is placeholder pending CMS
- **Events ingestion** — partly from DICE API, partly from manually maintained JSON
- **Spend fulfillment** — user flows are live; venue-side verification can rely on manual ops

### Planned

- CMS-powered city guides
- IRL Spend (staff-friendly event checkout tied to user + event)
- Bridge-powered IRL Member Card (in-person identity + spend instrument)

## Data sources

| Source   | Source of truth for                                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------------------------------ |
| Supabase | Current points balances, completed check-ins, perk claims, spend state, active locations / checkpoints / tiers / rewards |
| Mixpanel | Engagement trends, funnel conversion, route views, behavior sequencing                                                   |

**Key rules:**

- `players.total_points` is the authoritative current points balance.
- `points_activities` is **not** a complete ledger of every point mutation.
- Do not reconstruct point balances from Mixpanel events.
- For "how many completed X exist?" → Supabase. For "where do users drop off?" → Mixpanel.

## Key analytics events

| Event                        | When fired                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------ |
| `account_created`            | Net-new player profile created                                                 |
| `checkin_completed`          | Successful location or checkpoint check-in (use `checkin_type` to distinguish) |
| `points_earned`              | Points awarded (check-ins, location creation)                                  |
| `reward_page_viewed`         | Reward detail opened                                                           |
| `reward_claimed`             | Perk successfully redeemed                                                     |
| `spend_redemption_started`   | Spend redemption initiated (pending-create flow)                               |
| `spend_redemption_completed` | Spend redemption fulfilled or verified                                         |
| `tier_progression`           | Tier changed after a points update                                             |
| `location_created`           | Location created (may start hidden)                                            |

**Known gaps:** `session_started` and `tier_changed` are defined in code but not currently emitted. `cohort` is hard-coded to `new` and should not be used for segmentation.

## Directory structure

```
app/            # Next.js App Router: pages, layouts, ~50 API routes
components/     # React components (components/ui/ = shadcn)
lib/            # Business logic
├── db/         # Database access layer
├── schemas/    # Zod validation schemas
├── api/        # API utilities (response helpers)
├── analytics/  # Mixpanel integration
└── types.ts    # Centralized TypeScript types
hooks/          # Custom React hooks
database/       # SQL migration scripts
soroban-contracts/  # Stellar/Soroban smart contracts
```

Path alias: `@/*` maps to the project root.

## API response format

All API routes use helpers from `lib/api/response.ts`:

```typescript
// Success
return apiSuccess({ player });

// Error
return apiError('Not found', 404);

// Validation error
return apiValidationError(zodError);
```

Response shape: `{ success: boolean; data?: T; error?: string; message?: string }`.

## Contributing

1. Branch from `main`: `git checkout -b feature/your-feature`
2. Commit with clear messages: `fix: handle edge case in login form`
3. Open a PR targeting `main`; ensure lint and tests pass

See `docs/APP_OVERVIEW.md` for product context, funnel definitions, and data source rules.
