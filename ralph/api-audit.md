# API Route Audit

**Generated:** 2026-01-09
**Total Routes:** 56
**Using Helpers:** 17
**Using Raw NextResponse.json():** 38
**Using Response.json():** 1

## Legend

- **uses-helpers**: Uses `apiSuccess`/`apiError`/`apiValidationError` from `lib/api/response.ts`
- **uses-raw**: Uses raw `NextResponse.json()` calls
- **mixed**: Uses both helpers and raw responses
- **native**: Uses native `Response.json()` (not NextResponse)

---

## Routes Using Helpers (17)

These routes already follow the standard pattern. No changes needed.

| Route | Helpers Used |
|-------|--------------|
| `app/api/add-checkpoint/route.ts` | apiSuccess, apiError |
| `app/api/admin/checkpoints/route.ts` | apiSuccess, apiError, apiValidationError |
| `app/api/admin/checkpoints/[id]/route.ts` | apiSuccess, apiError, apiValidationError |
| `app/api/checkin/route.ts` | apiSuccess, apiError, apiValidationError |
| `app/api/checkpoint/route.ts` | apiSuccess, apiError |
| `app/api/leaderboard/route.ts` | apiSuccess, apiError, apiValidationError |
| `app/api/perks/route.ts` | apiSuccess, apiError |
| `app/api/perks/[id]/route.ts` | apiSuccess, apiError |
| `app/api/perks/[id]/available-count/route.ts` | apiSuccess, apiError |
| `app/api/perks/redeem/route.ts` | apiSuccess, apiError, apiValidationError |
| `app/api/player/route.ts` | apiSuccess, apiError, apiValidationError |
| `app/api/player/rank/route.ts` | apiSuccess, apiError |
| `app/api/solana-checkin/route.ts` | apiSuccess, apiError |
| `app/api/stellar-checkin/route.ts` | apiSuccess, apiError |
| `app/api/stellar-wallet/route.ts` | apiSuccess, apiError |
| `app/api/tiers/route.ts` | apiSuccess, apiError |
| `app/api/user/redemptions/route.ts` | apiSuccess, apiError |

---

## Routes Using Raw NextResponse.json() (38)

### Priority 1: High-Traffic / Core Functionality

| Route | Line Numbers | Notes |
|-------|--------------|-------|
| `app/api/locations/route.ts` | 23, 50, 80, 86, 89, 132, 144, 162, 189, 216, 254, 315, 323, 328 | Core location data - heavily used |
| `app/api/location-checkin/route.ts` | 24, 53, 79, 112, 134, 183, 193, 206, 215, 218, 224 | Check-in flow - critical path |
| `app/api/profile/route.ts` | 15, 26, 43, 46, 59, 155, 164 | User profile - frequently accessed |
| `app/api/checkin-status/route.ts` | 14, 21, 83, 91 | Check-in status polling |
| `app/api/checkin-events/route.ts` | 204, 208 | Event data |

### Priority 2: Admin Routes (8 routes)

| Route | Line Numbers | Notes |
|-------|--------------|-------|
| `app/api/admin/auth/route.ts` | 18, 26, 29 | Admin authentication |
| `app/api/admin/perks/route.ts` | 12, 15, 39, 42 | Perk management |
| `app/api/admin/perks/[id]/route.ts` | 24, 27, 41, 44 | Individual perk |
| `app/api/admin/perks/[id]/codes/route.ts` | 11, 14, 29, 32 | Perk codes |
| `app/api/admin/perks/codes/[codeId]/route.ts` | 11, 14 | Code management |
| `app/api/admin/users/route.ts` | 12, 26, 39, 54, 61, 82, 93, 107, 110 | User management |
| `app/api/admin/points-upload/route.ts` | 28, 38, 46, 215, 223, 239, 271, 277 | Points CSV upload |
| `app/api/admin/pending-points/route.ts` | 11, 42, 48, 61, 71, 87, 90 | Pending points |
| `app/api/admin/locations/[locationId]/route.ts` | 28, 33, 43, 73, 80, 83 | Location admin |
| `app/api/admin/location-lists/route.ts` | 54, 58, 61, 72, 87, 90, 97 | Location lists |
| `app/api/admin/location-lists/[listId]/route.ts` | 22, 43, 46, 53, 67, 71, 74 | List management |
| `app/api/admin/location-lists/[listId]/locations/route.ts` | 31, 35, 38, 52, 59, 62, 69, 76, 90, 99, 106, 109 | List locations |
| `app/api/admin/location-lists/location-options/route.ts` | 15, 25, 28, 35 | Location options |

### Priority 3: Perk & Reward Routes

| Route | Line Numbers | Notes |
|-------|--------------|-------|
| `app/api/perks/[id]/codes/route.ts` | 19, 22, 37, 53, 56 | User-facing perk codes |
| `app/api/perks/codes/[codeId]/route.ts` | 18, 21 | Code deletion |

### Priority 4: Geocoding Routes

| Route | Line Numbers | Notes |
|-------|--------------|-------|
| `app/api/geocode-google/route.ts` | 77, 85, 150, 270, 273 | Google geocoding |
| `app/api/geocode-mapbox/route.ts` | 77, 85, 264, 267 | Mapbox geocoding |
| `app/api/geocode-nominatim/route.ts` | 8, 33, 36 | Nominatim geocoding |

### Priority 5: Blockchain / Token Routes

| Route | Line Numbers | Notes |
|-------|--------------|-------|
| `app/api/claim-nft/route.ts` | 21, 31, 44, 61, 76, 113, 123, 142, 155, 196, 213, 266, 275 | NFT claiming - complex |
| `app/api/transfer-tokens/route.ts` | 18, 29, 41, 54, 69, 85, 104, 114, 137, 152, 170, 188, 198, 219, 240, 248 | Token transfers |
| `app/api/friendbot/route.ts` | 12, 34, 43, 46 | Testnet faucet |

### Priority 6: Utility Routes

| Route | Line Numbers | Notes |
|-------|--------------|-------|
| `app/api/activities/route.ts` | 13, 29, 56, 59 | Activity feed |
| `app/api/add-user/route.ts` | 10, 26, 60, 63, 66 | Airtable user add |
| `app/api/contact/route.ts` | 9, 18, 40, 96, 108, 124, 127 | Contact form |
| `app/api/iyk/route.ts` | 26, 29 | IYK integration |
| `app/api/location-comments/route.ts` | 11, 30, 37, 78, 81 | Location comments |
| `app/api/location-lists/route.ts` | 28, 43, 46 | Public location lists |
| `app/api/newsletter/route.ts` | 9, 18, 37, 58, 105, 117, 124, 131 | Newsletter signup |
| `app/api/number-assignment/route.ts` | 31, 48, 83, 110, 118, 121 | Number assignment |
| `app/api/update-airtable/route.ts` | 30, 47, 170, 183 | Airtable sync |
| `app/api/upload/route.ts` | 22, 43, 57, 80, 87, 129, 140, 149 | File upload |
| `app/api/user/route.ts` | 14, 25, 27 | Basic user info |
| `app/api/checkin-events/invalidate-cache/route.ts` | 25, 34 | Cache invalidation |

---

## Routes Using Native Response.json() (1)

| Route | Line Numbers | Notes |
|-------|--------------|-------|
| `app/api/send/route.ts` | 14, 36, 39, 41 | Email sending (uses Response.json not NextResponse) |

---

## Summary by Priority

| Priority | Count | Description |
|----------|-------|-------------|
| P1 | 5 | High-traffic core routes |
| P2 | 13 | Admin routes |
| P3 | 2 | Perk routes |
| P4 | 3 | Geocoding routes |
| P5 | 3 | Blockchain routes |
| P6 | 12 | Utility routes |
| Native | 1 | Uses Response.json() |

---

## Recommended Conversion Order

1. **TYPE-001** - Fix `catch (error: any)` in claim-nft and transfer-tokens first
2. **API-002** - Admin routes (8 routes) - lower risk, good for establishing pattern
3. **API-003** - Location routes (locations, location-checkin, geocode-*) - high traffic
4. **API-004** - Remaining perk routes
5. **API-005** - All remaining routes

---

## Files with `catch (error: any)` Pattern

These need TYPE-001 fix before API standardization:

| File | Occurrences |
|------|-------------|
| `app/api/claim-nft/route.ts` | Multiple catch blocks |
| `app/api/transfer-tokens/route.ts` | Multiple catch blocks |
