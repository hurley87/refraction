# feat: Integrate DICE Events API and Ticket Holders API

## Overview

Sync DICE events as checkable locations and verify ticket ownership at check-in time.

## Problem Statement

- Events are manually added as locations
- No way to verify ticket ownership for exclusive event check-ins
- No integration with ticketing platforms

## Proposed Solution

A minimal integration with two API routes and one library file.

```
lib/
  dice.ts              # Client, schemas, types - ONE file

app/api/dice/
  sync/route.ts        # Cron job (every 6 hours)
  verify-ticket/route.ts   # Real-time verification at check-in
```

### Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Vercel Cron    │────▶│  /api/dice/sync  │────▶│  DICE Events    │
│  (every 6hrs)   │     │                  │     │  API (REST)     │
└─────────────────┘     └────────┬─────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌────────────────┐
                        │   Supabase     │
                        │   locations    │
                        └────────────────┘
                                 ▲
┌─────────────────┐     ┌────────┴─────────┐     ┌─────────────────┐
│  Check-in Flow  │────▶│ /api/dice/      │────▶│  DICE Ticket    │
│                 │     │ verify-ticket    │     │  Holders (GQL)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## Technical Approach

### 1. The One Library File

```typescript
// lib/dice.ts - Everything in one place
import { z } from 'zod';

const DICE_EVENTS_API = process.env.DICE_EVENTS_API_URL!;
const DICE_EVENTS_KEY = process.env.DICE_EVENTS_API_KEY!;
const DICE_GRAPHQL_API = 'https://partners-endpoint.dice.fm/graphql';
const DICE_GRAPHQL_KEY = process.env.DICE_TICKET_HOLDERS_API_KEY!;

// ============ SCHEMAS ============

export const DiceEventSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  state: z.enum(['DRAFT', 'APPROVED', 'CANCELLED', 'ON_SALE', 'SOLD_OUT']),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().nullable().optional(),
  venue: z.object({
    name: z.string(),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
  }).nullable().optional(),
  url: z.string().url().nullable().optional(),
});

export const DiceEventsResponseSchema = z.object({
  events: z.array(DiceEventSchema),
});

export const DiceTicketVerifyResponseSchema = z.object({
  viewer: z.object({
    event: z.object({
      tickets: z.object({
        edges: z.array(z.object({
          node: z.object({
            id: z.string(),
            status: z.string(),
          }),
        })),
      }),
    }).nullable(),
  }),
});

// Types inferred from schemas - no separate types.ts
export type DiceEvent = z.infer<typeof DiceEventSchema>;

// ============ CLIENTS ============

export async function fetchDiceEvents(): Promise<DiceEvent[]> {
  const response = await fetch(`${DICE_EVENTS_API}/events`, {
    headers: {
      'Authorization': `Bearer ${DICE_EVENTS_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`DICE Events API error: ${response.status}`);
  }

  const json = await response.json();
  const parsed = DiceEventsResponseSchema.safeParse(json);

  if (!parsed.success) {
    console.error('DICE API validation failed:', parsed.error.flatten());
    throw new Error('Invalid response from DICE Events API');
  }

  return parsed.data.events;
}

const VERIFY_TICKET_QUERY = `
  query VerifyTicket($eventId: ID!, $fanEmail: String!) {
    viewer {
      event(id: $eventId) {
        tickets(where: { fanEmail: { eq: $fanEmail } }, first: 1) {
          edges {
            node {
              id
              status
            }
          }
        }
      }
    }
  }
`;

export async function verifyTicketHolder(
  eventId: string,
  email: string
): Promise<boolean> {
  const response = await fetch(DICE_GRAPHQL_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DICE_GRAPHQL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: VERIFY_TICKET_QUERY,
      variables: { eventId, fanEmail: email },
    }),
  });

  if (!response.ok) {
    throw new Error(`DICE Ticket API error: ${response.status}`);
  }

  const json = await response.json();
  const parsed = DiceTicketVerifyResponseSchema.safeParse(json.data);

  if (!parsed.success) {
    console.error('DICE GraphQL validation failed:', parsed.error.flatten());
    throw new Error('Invalid response from DICE Ticket Holders API');
  }

  const tickets = parsed.data.viewer.event?.tickets.edges ?? [];
  return tickets.length > 0;
}
```

### 2. Database Changes

**Minimal columns on `locations` table:**

```sql
-- database/dice-integration.sql
ALTER TABLE locations
ADD COLUMN dice_event_id TEXT UNIQUE,
ADD COLUMN dice_event_state TEXT,
ADD COLUMN dice_start_time TIMESTAMPTZ,
ADD COLUMN dice_end_time TIMESTAMPTZ;

CREATE INDEX idx_locations_dice_event_id
  ON locations(dice_event_id)
  WHERE dice_event_id IS NOT NULL;
```

**One column on `players` table:**

```sql
ALTER TABLE players
ADD COLUMN dice_linked_email TEXT;
```

**Total: 5 columns, no new tables.**

### 3. Sync Route

```typescript
// app/api/dice/sync/route.ts
import { NextRequest } from 'next/server';
import { fetchDiceEvents } from '@/lib/dice';
import { supabase } from '@/lib/db/client';
import { apiSuccess, apiError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  // Verify cron secret
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return apiError('Unauthorized', 401);
  }

  try {
    const events = await fetchDiceEvents();

    // Filter to only APPROVED/ON_SALE events
    const syncableEvents = events.filter(e =>
      ['APPROVED', 'ON_SALE', 'SOLD_OUT'].includes(e.state)
    );

    let created = 0, updated = 0;

    for (const event of syncableEvents) {
      // Skip events without coordinates
      if (!event.venue?.latitude || !event.venue?.longitude) {
        continue;
      }

      const locationData = {
        name: event.name,
        display_name: event.venue?.name ?? event.name,
        description: event.description,
        latitude: event.venue.latitude,
        longitude: event.venue.longitude,
        place_id: `dice_${event.id}`,
        points_value: 100,
        type: 'event',
        event_url: event.url,
        is_visible: true,
        dice_event_id: event.id,
        dice_event_state: event.state,
        dice_start_time: event.startTime,
        dice_end_time: event.endTime,
      };

      const { data: existing } = await supabase
        .from('locations')
        .select('id')
        .eq('dice_event_id', event.id)
        .single();

      if (existing) {
        await supabase.from('locations').update(locationData).eq('id', existing.id);
        updated++;
      } else {
        await supabase.from('locations').insert(locationData);
        created++;
      }
    }

    console.log(`DICE sync complete: ${created} created, ${updated} updated`);
    return apiSuccess({ created, updated, total: syncableEvents.length });

  } catch (error) {
    console.error('DICE sync failed:', error);
    return apiError('Sync failed', 500);
  }
}
```

### 4. Ticket Verification Route

```typescript
// app/api/dice/verify-ticket/route.ts
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { verifyTicketHolder } from '@/lib/dice';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';

const RequestSchema = z.object({
  diceEventId: z.string(),
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = RequestSchema.safeParse(body);

    if (!validation.success) {
      return apiValidationError(validation.error);
    }

    const { diceEventId, email } = validation.data;
    const hasTicket = await verifyTicketHolder(diceEventId, email);

    return apiSuccess({ hasTicket });

  } catch (error) {
    console.error('Ticket verification failed:', error);
    return apiError('Verification failed', 500);
  }
}
```

### 5. Modify Existing Check-in Route

Add ticket verification inline in `app/api/checkin/route.ts`:

```typescript
// Add to existing check-in logic
if (location.dice_event_id) {
  const player = await getPlayerById(playerId);

  if (!player.dice_linked_email) {
    return apiError('Link your DICE account in settings to check in', 400);
  }

  const hasTicket = await verifyTicketHolder(
    location.dice_event_id,
    player.dice_linked_email
  );

  if (!hasTicket) {
    return apiError('No valid ticket found for this event', 403);
  }
}

// Continue with normal check-in...
```

### 6. Cron Configuration

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/update-airtable",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/dice/sync",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

## Implementation Phases

### Phase 1: Core Integration (2-3 days)

1. [ ] Create `lib/dice.ts` with schemas and client functions
2. [ ] Run database migration (5 columns)
3. [ ] Create `/api/dice/sync/route.ts`
4. [ ] Create `/api/dice/verify-ticket/route.ts`
5. [ ] Update vercel.json with cron
6. [ ] Test with real DICE API

**Files:**
- `lib/dice.ts` (new)
- `database/dice-integration.sql` (new)
- `app/api/dice/sync/route.ts` (new)
- `app/api/dice/verify-ticket/route.ts` (new)
- `vercel.json` (modify)
- `.env.example` (modify)

### Phase 2: Check-in Integration (1-2 days)

1. [ ] Add DICE email field to player settings UI
2. [ ] Modify check-in route to verify tickets for DICE events
3. [ ] Add error messages for missing ticket/unlinked account
4. [ ] Test end-to-end check-in flow

**Files:**
- `app/api/checkin/route.ts` (modify)
- `app/settings/page.tsx` (modify)
- `lib/db/players.ts` (modify - add dice_linked_email)

### Phase 3: Polish (1-2 days)

1. [ ] Add admin visibility for DICE events in dashboard
2. [ ] Manual sync trigger button for admins
3. [ ] Error handling edge cases
4. [ ] Basic tests for `lib/dice.ts`

**Files:**
- `app/admin/locations/page.tsx` (modify - show DICE badge)
- `app/api/admin/dice/sync/route.ts` (new - manual trigger)

**Total: 4-7 days**

## Acceptance Criteria

- [ ] DICE events sync to locations table via cron
- [ ] Only events with coordinates are synced
- [ ] Users can link DICE email in settings
- [ ] Check-in verifies ticket ownership for DICE events
- [ ] Users without tickets see clear error message
- [ ] Admin can manually trigger sync

## What We're NOT Building (Yet)

Per reviewer feedback, these are explicitly deferred:

- ❌ Sync logs table (use console.log)
- ❌ Caching layer (measure first)
- ❌ Webhook endpoint (no DICE support confirmed)
- ❌ Retroactive rewards (future feature)
- ❌ Custom error classes (use standard errors)
- ❌ Separate mappers/types files (inline everything)

## Environment Variables

```
DICE_EVENTS_API_URL=https://api.dice.fm/v1
DICE_EVENTS_API_KEY=your_events_api_key
DICE_TICKET_HOLDERS_API_KEY=your_graphql_api_key
```

## Open Questions

1. Does DICE Events API return coordinates, or do we need to geocode?
2. Can Ticket Holders API filter by email, or must we paginate?
3. What are the API rate limits?

---

*Simplified per reviewer feedback: January 2026*
