---
title: React Query cache invalidation mismatch prevents UI update
category: ui-bugs
tags:
  - react-query
  - cache-invalidation
  - admin-dashboard
  - state-management
component: app/admin/locations/page.tsx
severity: high
date_solved: 2026-01-06
---

# Problem

After toggling location visibility in the admin dashboard, the UI didn't update to reflect the change. The location appeared to retain its previous visibility status despite the backend update succeeding.

## Symptoms

- Toggle switch would flip, API call would succeed
- Table data remained stale (showed old visibility state)
- Page refresh fixed the issue (confirmed it was a cache problem)
- No console errors

# Root Cause

**Query key mismatch between the query and invalidation:**

```typescript
// Query key used (line 57):
queryKey: [...LOCATIONS_KEY, "all"]  // ["admin-locations", "all"]

// Invalidation key used (line 110) - WRONG:
queryClient.invalidateQueries({ queryKey: LOCATIONS_KEY })  // ["admin-locations"]
```

React Query's `invalidateQueries` does **NOT** do prefix matching by default. The key `["admin-locations"]` does not match `["admin-locations", "all"]`, so the cache was never invalidated.

## Why This Happened

- Developer assumed React Query would match `["admin-locations"]` as a prefix of `["admin-locations", "all"]`
- This is intuitive but incorrect - exact matching is the default behavior
- The error manifests silently (no console error, just stale cache)
- TypeScript provides no compile-time checking for query key consistency

# Solution

Changed invalidation to use the exact same query key:

```typescript
// BEFORE (broken):
queryClient.invalidateQueries({ queryKey: LOCATIONS_KEY });

// AFTER (fixed):
queryClient.invalidateQueries({ queryKey: [...LOCATIONS_KEY, "all"] });
```

Alternative fix using prefix matching:
```typescript
queryClient.invalidateQueries({
  queryKey: LOCATIONS_KEY,
  exact: false  // Enable prefix matching
});
```

# Prevention

## Code Review Checklist

- [ ] For every `useQuery`, find all `invalidateQueries` calls that should affect it
- [ ] Verify invalidation key is **identical** to query key (or uses `exact: false`)
- [ ] Search for `invalidateQueries` and verify each matches an actual query

## Best Practice: Centralize Query Keys

```typescript
// lib/constants/queryKeys.ts
export const QUERY_KEYS = {
  admin: {
    locations: {
      all: ["admin-locations", "all"] as const,
      byId: (id: number) => ["admin-locations", "byId", id] as const,
    },
  },
} as const;

// Usage in component:
import { QUERY_KEYS } from "@/lib/constants/queryKeys";

const { data } = useQuery({
  queryKey: QUERY_KEYS.admin.locations.all,
  queryFn: fetchLocations,
});

// Invalidation uses same constant:
queryClient.invalidateQueries({
  queryKey: QUERY_KEYS.admin.locations.all
});
```

## Best Practice: Named Invalidation Helpers

```typescript
// lib/api/queryClient.ts
export const invalidateAdminLocations = (client: QueryClient) => {
  return client.invalidateQueries({
    queryKey: QUERY_KEYS.admin.locations.all,
    exact: true,
  });
};

// Usage:
onSuccess: () => {
  invalidateAdminLocations(queryClient);
  toast.success("Updated");
}
```

## Testing

```typescript
describe("cache invalidation", () => {
  it("updates UI after visibility toggle", async () => {
    // Render admin page
    // Toggle visibility on a location
    // Assert: table row reflects new state WITHOUT page refresh
  });
});
```

# Related

- React Query docs: [invalidateQueries](https://tanstack.com/query/latest/docs/react/reference/useQueryClient#queryclientinvalidatequeries)
- Admin locations page: `app/admin/locations/page.tsx`
- Feature plan: `plans/feat-admin-location-visibility-approval.md`
