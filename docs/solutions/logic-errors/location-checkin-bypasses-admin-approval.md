---
title: New locations created during check-in bypass admin approval
category: logic-errors
tags:
  - location-creation
  - admin-approval
  - data-integrity
  - security
component: app/api/location-checkin/route.ts
severity: high
date_solved: 2026-01-06
---

# Problem

When users check in at a new location (one that doesn't exist in the database), the location was created without `is_visible: false`, bypassing the admin approval workflow. Unapproved locations would immediately appear on the public map.

## Symptoms

- New locations created via check-in appeared on the public map without admin approval
- Admin approval queue didn't show locations created through the check-in flow
- Only locations created via `POST /api/locations` required approval

# Root Cause

The codebase has **two distinct code paths that create locations**:

1. **Explicit**: `POST /api/locations` - user directly creates a location (correctly sets `is_visible: false`)
2. **Implicit**: `POST /api/location-checkin` → `createOrGetLocation()` - location auto-created during check-in (**missing `is_visible: false`**)

When the admin visibility feature was added, only path #1 was updated. Path #2 was missed because:

- The feature description focused on explicit location creation
- The check-in endpoint's implicit location creation wasn't recognized as a dependency
- No automated tests covered the "check-in creates new location" scenario

# Solution

Added `is_visible: false` to the `locationInfo` object in the check-in endpoint:

```typescript
// app/api/location-checkin/route.ts (line ~117)
const locationInfo: Omit<Location, 'id' | 'created_at'> = {
  place_id: sanitizedPlaceId,
  name: sanitizedName,
  latitude: parsedLat,
  longitude: parsedLon,
  points_value: 100,
  type: sanitizedType || 'location',
  context: sanitizedContext,
  is_visible: false, // ADD THIS - requires admin approval
};
```

# Prevention

## Code Review Checklist

- [ ] Search for all `createOrGetLocation` calls - verify all set `is_visible: false`
- [ ] When adding features that touch location creation, audit ALL creation paths
- [ ] Check both `/api/locations` and `/api/location-checkin` endpoints

## Architectural Improvement

Consider centralizing location creation logic:

```typescript
// lib/db/locations.ts
export const createLocationForApproval = async (
  locationData: Omit<Location, 'id' | 'created_at' | 'is_visible'>
) => {
  return createOrGetLocation({
    ...locationData,
    is_visible: false, // Enforced at single source of truth
  });
};
```

## Testing

```typescript
describe('location-checkin', () => {
  it('creates hidden location requiring approval', async () => {
    const res = await POST(checkInRequest);
    const { location } = await res.json();
    expect(location.is_visible).toBe(false);
  });
});
```

# Related

- Feature plan: `plans/feat-admin-location-visibility-approval.md`
- Location creation endpoint: `app/api/locations/route.ts`
- Database migration: `database/add-is-visible-to-locations.sql`
