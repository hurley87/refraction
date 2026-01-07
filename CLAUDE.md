# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IRL is a Next.js 14 rewards program for cultural events and locations. Users check in at locations, earn points, advance through tiers, and redeem perks. The app uses Privy for authentication with embedded multi-chain wallets (EVM/Base, Solana, Stellar).

## Commands

```bash
yarn dev              # Start development server (http://localhost:3000)
yarn build            # Production build
yarn lint             # Run ESLint
yarn test             # Run Jest tests
yarn test:watch       # Jest in watch mode
yarn test:coverage    # Generate coverage report
```

**Package manager**: Yarn 1.22.22 (required, specified in `packageManager` field)

## Architecture

### Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Auth**: Privy (social login + embedded wallets)
- **Database**: Supabase PostgreSQL
- **Blockchain**: Wagmi/Viem (EVM), Solana Web3.js, Stellar
- **State**: React Query v5
- **Validation**: Zod
- **UI**: Tailwind CSS + shadcn/ui (Radix-based)
- **Analytics**: Mixpanel (client + server)
- **Maps**: Mapbox GL

### Directory Structure

```
app/                    # Next.js App Router pages & API routes
├── api/                # RESTful API endpoints (~50 routes)
├── dashboard/          # User dashboard
├── leaderboard/        # Rankings
├── checkpoints/        # Location check-ins
├── stellar-checkins/   # Stellar blockchain check-ins
├── challenges/         # Quest system
├── rewards/            # Perk redemption
└── admin/              # Admin dashboard

components/             # React components
├── ui/                 # shadcn/ui components

lib/                    # Business logic (modular, domain-driven)
├── db/                 # Database access layer (players.ts, locations.ts, checkins.ts, etc.)
├── schemas/            # Zod validation schemas (api.ts, player.ts, location.ts, perk.ts)
├── api/                # API utilities (client.ts, response.ts)
├── analytics/          # Mixpanel integration (client.ts, server.ts, events.ts)
├── contracts/          # Smart contract ABIs (Events.ts, Points.ts, etc.)
└── types.ts            # Centralized TypeScript types

hooks/                  # Custom React hooks (usePlayer, useCheckins, usePerks, etc.)
database/               # SQL migration scripts
```

### Key Patterns

**API Response Format** (`lib/api/response.ts`):

```typescript
type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};
```

Use `apiSuccess()`, `apiError()`, `apiValidationError()` helpers.

**Data Layer**:

- `lib/db/*.ts` for database operations
- `lib/schemas/*.ts` for Zod validation
- `lib/types.ts` for TypeScript types

**React Query for Data Fetching**:

```typescript
// Example from hooks/usePlayer.ts
useQuery({
  queryKey: ["player", address],
  queryFn: () =>
    apiClient<{ player: Player }>(`/api/player?walletAddress=${address}`),
  enabled: !!address,
});
```

**Admin Auth**: Simple email allowlist in `lib/auth.ts` (checks `x-user-email` header)

### Database

Supabase PostgreSQL with schemas in `/database/*.sql`. Key tables:

- `players` - User accounts with wallet addresses
- `locations` - Check-in points with coordinates
- `player_location_checkins` - Check-in records
- `perks` - Rewards
- `user_perk_redemptions` - Redemption tracking
- `tiers` - Membership levels

### Smart Contracts

Contract ABIs in `lib/contracts/`. Key addresses:

- Events Contract: `0xDCF6fbBbbF83848Bf68500432392C0988712Bf43`

## Environment Variables

Required in `.env.local`:

```
NEXT_PUBLIC_PRIVY_APP_ID
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
NEXT_PUBLIC_MIXPANEL_TOKEN  # Client-side Mixpanel project token
MIXPANEL_TOKEN              # Server-side Mixpanel project token (optional, falls back to NEXT_PUBLIC_MIXPANEL_TOKEN)
MIXPANEL_SECRET             # Server-side Mixpanel API secret (optional, for enhanced security)
SERVER_WALLET_PRIVATE_KEY
BASE_RPC_URL
```

## Coding Conventions

- TypeScript with Zod validation for all inputs
- Tailwind CSS for styling (mobile-first)
- Functional components with hooks
- Server Components by default, `"use client"` when needed
- Path alias: `@/*` maps to root directory
