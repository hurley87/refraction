# Checkpoint Checkin Activity Implementation

## Overview
This implementation adds activity tracking for IRL checkpoint checkins to the existing points system. Each checkpoint checkin now creates a proper activity record in the `points_activities` table and awards 100 points to the user.

## Changes Made

### 1. Points Activities Configuration

**File:** `lib/points-activities.ts`

Added new activity type:
- `checkpoint_checkin` - for IRL checkpoint checkins
- Added to `PointsActivityType` enum
- Added configuration with 100 base points, no daily limits

```typescript
{
  type: "checkpoint_checkin",
  name: "Checkpoint Check-in",
  description: "Check in to an IRL checkpoint to earn points",
  icon: "📍",
  category: "engagement",
  base_points: 100,
  is_active: true,
}
```

### 2. Database Schema Updates

**File:** `database/points-system-schema.sql`

Added checkpoint_checkin to the initial data population:
```sql
INSERT INTO points_activity_config (activity_type, name, description, icon, category, base_points, max_daily_points, is_active) VALUES
('checkpoint_checkin', 'Checkpoint Check-in', 'Check in to an IRL checkpoint to earn points', '📍', 'engagement', 100, NULL, true);
```

### 3. API Endpoint Updates

**File:** `app/api/checkin/route.ts`

Completely refactored the checkin endpoint:

#### Before:
- Directly updated `players` table with points
- Used `updatePlayerPoints()` function
- No activity tracking

#### After:
- Creates activity record in `points_activities` table
- Uses new `awardCheckpointPoints()` function
- Proper duplicate checking based on checkpoint + wallet address
- Leverages database triggers for automatic point aggregation

#### Key Features:
1. **Duplicate Prevention**: Checks for existing activity records for the same checkpoint/wallet combination
2. **Activity Tracking**: Each checkin creates a proper activity record with metadata
3. **Automatic Point Aggregation**: Database triggers handle updating user total points
4. **Rich Metadata**: Stores checkpoint name and email in activity metadata

### 4. Points Awarding Function

Created `awardCheckpointPoints()` function that:
- Checks for duplicate checkpoint checkins
- Creates activity record with proper metadata
- Returns activity ID for tracking
- Handles errors gracefully

```typescript
async function awardCheckpointPoints(
  walletAddress: string,
  checkpoint: string,
  email?: string
) {
  // Check for duplicates
  const { data: existingActivity } = await supabase
    .from("points_activities")
    .select("id")
    .eq("user_wallet_address", walletAddress)
    .eq("activity_type", "checkpoint_checkin")
    .contains("metadata", { checkpoint })
    .limit(1);

  if (existingActivity && existingActivity.length > 0) {
    throw new Error(`Already awarded points for checkpoint: ${checkpoint}`);
  }

  // Create activity record
  const { data: activity, error: activityError } = await supabase
    .from("points_activities")
    .insert({
      user_wallet_address: walletAddress,
      activity_type: "checkpoint_checkin",
      points_earned: 100,
      description: `Checked in to ${checkpoint}`,
      metadata: { checkpoint, email },
      processed: true,
    })
    .select()
    .single();

  return activity;
}
```

## Database Schema Requirements

The implementation requires the following tables to exist:

### 1. points_activities
- Stores individual point-earning activities
- Has database triggers for automatic point aggregation
- Includes metadata field for storing checkpoint information

### 2. points_activity_config
- Stores configuration for different activity types
- Must include the `checkpoint_checkin` activity type

### 3. user_points (optional)
- Aggregated user statistics
- Updated automatically by database triggers

## Usage

### API Endpoint
```
POST /api/checkin
{
  "walletAddress": "0x...",
  "email": "user@example.com",
  "checkpoint": "Checkpoint Name"
}
```

### Response
```json
{
  "success": true,
  "player": {
    "id": 1,
    "wallet_address": "0x...",
    "total_points": 100
  },
  "pointsEarned": 100,
  "activityId": "uuid-here",
  "message": "Congratulations! You earned 100 points for checking in to Checkpoint Name!"
}
```

## Benefits

1. **Proper Activity Tracking**: Each checkin is now tracked as a proper activity
2. **Comprehensive Points System**: Integrates with existing points infrastructure
3. **Duplicate Prevention**: Prevents multiple point awards for same checkpoint
4. **Rich Metadata**: Stores checkpoint and email information
5. **Scalable**: Uses database triggers for automatic point aggregation
6. **Audit Trail**: Full history of all checkpoint checkins

## Database Triggers

The implementation relies on existing database triggers:
- `trigger_update_user_points` - Updates user total points when activities are added
- `update_user_points_on_activity()` - Function that handles point aggregation

## Future Enhancements

1. **Daily Limits**: Could add daily limits for checkpoint checkins
2. **Cooldown Periods**: Prevent rapid re-checkins at same checkpoint
3. **Bonus Points**: Different checkpoints could have different point values
4. **Streaks**: Reward consecutive days of checkins
5. **Achievements**: Unlock achievements for visiting multiple checkpoints

## Testing

To test the implementation:
1. Ensure database tables exist with proper schema
2. Insert checkpoint_checkin activity config
3. Make POST request to `/api/checkin` with valid data
4. Verify activity record is created in `points_activities`
5. Verify user points are updated correctly
6. Test duplicate prevention by checking in to same checkpoint twice