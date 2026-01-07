# Mixpanel Analytics Documentation

## Overview

This project uses Mixpanel for product analytics with a dual-architecture approach:
- **Client-side tracking** via `mixpanel-browser` for pageviews and user identification
- **Server-side tracking** via `mixpanel` (Node.js SDK) for reliable event tracking from API routes

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                         │
├─────────────────────────────────────────────────────────────────┤
│  AnalyticsProvider                                              │
│  ├── Initializes Mixpanel on mount                              │
│  ├── Identifies users when authenticated                        │
│  ├── Tracks pageviews on route changes                          │
│  └── Resets identity on logout                                  │
├─────────────────────────────────────────────────────────────────┤
│  lib/analytics/client.ts                                        │
│  └── Dynamic import of mixpanel-browser (bundle optimization)   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Server (API Routes)                       │
├─────────────────────────────────────────────────────────────────┤
│  lib/analytics/server.ts                                        │
│  ├── Tracks events from API routes                              │
│  └── Sets user properties server-side                           │
└─────────────────────────────────────────────────────────────────┘
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_MIXPANEL_TOKEN` | Yes | Client-side Mixpanel project token |
| `MIXPANEL_TOKEN` | No | Server-side token (falls back to `NEXT_PUBLIC_MIXPANEL_TOKEN`) |
| `MIXPANEL_SECRET` | No | Server-side API secret for enhanced security |

## Events Tracked

### Automatic Events (Client-side)

| Event | Trigger | Properties |
|-------|---------|------------|
| `$pageview` | Every route change | `page`, `pathname`, `search`, `query` |

### Server-side Events

| Event | Trigger | Properties |
|-------|---------|------------|
| `account_created` | New player registration | `wallet_type`, `has_email`, `wallet_address` |
| `checkin_completed` | Location or checkpoint check-in | `location_id`, `city`, `venue`, `points`, `checkin_type` |
| `user_active` | Any user action (checkin, reward claim, location creation) | `action_type` |
| `reward_claimed` | Perk redemption | `reward_id`, `reward_type`, `partner`, `points_required` |
| `location_created` | New location created | `location_id`, `city`, `country`, `place_id`, `type` |
| `points_earned` | Points awarded for any activity | `activity_type`, `amount`, `description` |
| `tier_changed` | User tier changes | `old_tier`, `new_tier`, `direction`, `total_points` |

### Event Flow by Feature

**Check-in Flow:**
```
User checks in → checkin_completed + user_active + points_earned
```

**Reward Redemption:**
```
User claims perk → reward_claimed + user_active
```

**Location Creation:**
```
User creates location → location_created + user_active + points_earned
```

**Account Creation:**
```
New player → account_created + user properties set
```

## User Properties

User profiles are enriched with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `$email` | string | User's email address (Mixpanel reserved) |
| `$name` | string | Username (Mixpanel reserved) |
| `wallet_address` | string | Primary wallet address |
| `wallet_type` | enum | `EVM`, `Solana`, or `Stellar` |
| `tier` | string | Current membership tier |
| `total_points` | number | Total points accumulated |
| `first_action_at` | ISO date | First activity timestamp |
| `cohort` | enum | `new`, `returning`, or `power` |

## User Identification

- **Distinct ID**: Wallet address (e.g., `0x...`)
- **Identification Flow**:
  1. User authenticates via Privy
  2. AnalyticsProvider calls `identifyUser(walletAddress, properties)`
  3. User properties are set/updated on Mixpanel profile
- **Reset**: Called on logout to clear identity

## File Structure

```
lib/analytics/
├── index.ts          # Centralized exports
├── client.ts         # Client-side tracking functions
├── server.ts         # Server-side tracking functions
├── events.ts         # Event name constants
└── types.ts          # TypeScript interfaces

components/
└── analytics-provider.tsx  # React context provider
```

## SDK Configuration

### Client-side (`mixpanel-browser`)

```typescript
mixpanel.init(token, {
  debug: process.env.NODE_ENV === "development",
  track_pageview: false,        // Manual tracking via route changes
  persistence: "localStorage",  // Recommended for web
  autocapture: false,           // Manual event tracking
});
```

### Server-side (`mixpanel`)

```typescript
Mixpanel.init(token, {
  secret: process.env.MIXPANEL_SECRET,
});
```

## Usage

### Track Custom Events (Client)

```tsx
import { useAnalytics } from "@/components/analytics-provider";

function MyComponent() {
  const { trackEvent } = useAnalytics();
  
  const handleClick = () => {
    trackEvent("button_clicked", { button_name: "subscribe" });
  };
}
```

### Track Events (Server)

```typescript
import { trackCheckinCompleted, trackPointsEarned } from "@/lib/analytics";

// In API route
trackCheckinCompleted(walletAddress, {
  location_id: location.id,
  city: "New York",
  points: 100,
  checkin_type: "location",
});
```

## Privacy Compliance

Functions available for GDPR/CCPA compliance:

```typescript
import { optOutTracking, optInTracking, hasOptedOutTracking } from "@/lib/analytics";

// Check opt-out status
if (hasOptedOutTracking()) {
  // User has opted out
}

// Opt out (stops all tracking)
optOutTracking();

// Opt back in
optInTracking();
```

## Key Metrics to Track in Mixpanel

| Metric | Events/Properties |
|--------|-------------------|
| **DAU/MAU** | `$pageview`, `user_active` |
| **Conversion** | `account_created` → `checkin_completed` |
| **Retention** | Cohort analysis on `user_active` |
| **Engagement** | `checkin_completed` frequency |
| **Revenue** | `reward_claimed` by `partner` |
| **Growth** | `account_created` over time |
| **Geography** | `checkin_completed` by `city` |

## Implementation Details

### Initialization

- **Client**: Initialized in `AnalyticsProvider` on mount via `useEffect`
- **Server**: Lazy initialization on first event tracking
- **Dynamic Import**: Client-side SDK is dynamically imported to reduce initial bundle size

### Pageview Tracking

- Automatically tracked on all route changes using Next.js App Router hooks
- Uses `usePathname()` and `useSearchParams()` for route detection
- Wrapped in Suspense boundary for Next.js static generation compatibility

### Error Handling

- All tracking functions include try-catch blocks
- Failed events are logged but don't break application flow
- Graceful degradation if Mixpanel token is missing

## Best Practices

1. **Always use typed event names** from `ANALYTICS_EVENTS` constants
2. **Include relevant context** in event properties (location_id, points, etc.)
3. **Use server-side tracking** for critical events (checkins, redemptions)
4. **Set user properties** when they change (tier, total_points)
5. **Test in development** with `debug: true` enabled

