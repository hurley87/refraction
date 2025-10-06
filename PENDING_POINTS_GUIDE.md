# Pending Points System

## Overview

The pending points system allows you to award points to users **before they create an account**. When they sign up in the future, they'll automatically receive all pending points.

## How It Works

### 1. **Upload CSV with Future Users**

When you upload a CSV, the system handles two scenarios:

- **Existing Users**: Points are awarded immediately
- **Non-Existent Users**: Points are saved as "pending" until they sign up

### 2. **Automatic Point Award**

When a user signs up and adds their email:

1. System checks for pending points matching their email
2. Automatically awards all pending points
3. Creates activity record: `pending_points_awarded`
4. Marks pending points as awarded

### 3. **Email Matching**

- Case-insensitive matching
- Works when user first creates account OR when they add email to existing account
- Handles both scenarios seamlessly

## Database Schema

### Pending Points Table

```sql
CREATE TABLE pending_points (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    points INTEGER NOT NULL,
    reason TEXT NOT NULL,
    uploaded_by_email VARCHAR(255) NOT NULL,
    upload_batch_id UUID NOT NULL,
    awarded BOOLEAN DEFAULT false,
    awarded_at TIMESTAMP,
    awarded_to_wallet_address VARCHAR(42),
    created_at TIMESTAMP
);
```

### Auto-Award Trigger

A database trigger automatically:

- Monitors `players` table for new/updated emails
- Finds matching pending points
- Awards points via `points_activities`
- Marks pending points as awarded
- Logs the action

## Usage Examples

### Example 1: Pre-Event Registration

**Scenario**: You want to reward event attendees but they haven't signed up yet

1. Export attendee list with emails
2. Create CSV:

```csv
email,reason,points
attendee1@example.com,ETH Denver Attendance Bonus,500
attendee2@example.com,ETH Denver Attendance Bonus,500
attendee3@example.com,ETH Denver Attendance Bonus,500
```

3. Upload CSV - points saved as pending
4. When attendees sign up later → automatic points!

### Example 2: Marketing Campaign

**Scenario**: Rewarding users from a marketing campaign

1. Upload CSV with campaign participants:

```csv
email,reason,points
lead1@company.com,Q4 Campaign Participation,250
lead2@startup.io,Q4 Campaign Participation,250
```

2. When they convert and sign up → instant points

### Example 3: Partnership Distribution

**Scenario**: Partner provides user list for rewards

1. Partner sends user list
2. Upload with reason:

```csv
email,reason,points
partner_user1@example.com,Partnership Reward - Acme Corp,1000
partner_user2@example.com,Partnership Reward - Acme Corp,1000
```

3. Users sign up over time → automatic distribution

## Admin Interface

### View Pending Points

1. Go to `/admin/users`
2. Click "Show Pending" button
3. See summary:
   - Number of pending users
   - Total pending records
   - Total pending points

### Pending Points Table Shows:

- Date created
- Email address
- Reason
- Points amount
- Who uploaded it

### CSV Upload Shows Status:

- **Success**: User found and points awarded immediately
- **User Not Found**: Saved as pending (orange status)
- **Failed**: Error occurred (red status)

## Technical Details

### Activity Type

Awarded pending points create activity with:

- `activity_type`: "pending_points_awarded"
- `description`: "Pre-signup award: {original reason}"
- `metadata`: Contains full context (pending_points_id, upload_batch_id, etc.)

### Email Updates

Trigger fires on:

- `INSERT` into `players` table (new user)
- `UPDATE OF email` on `players` table (email added/changed)

### Edge Cases Handled

1. **Multiple pending records**: All awarded when user signs up
2. **Email changes**: Points awarded when email first added, not on subsequent changes
3. **Case sensitivity**: Email matching is case-insensitive
4. **Race conditions**: Uses `FOR UPDATE` lock to prevent double-awarding
5. **Partial failures**: Each pending point awarded independently

## Monitoring

### Check Pending Points Summary

```sql
SELECT * FROM pending_points_summary;
```

Returns:

- Email
- Number of pending records
- Total pending points
- Oldest and newest pending dates

### View Recent Awards

```sql
SELECT * FROM pending_points
WHERE awarded = true
ORDER BY awarded_at DESC
LIMIT 10;
```

### Find Pending for Specific Email

```sql
SELECT * FROM pending_points
WHERE LOWER(email) = LOWER('user@example.com')
AND awarded = false;
```

## Best Practices

1. **Verify Email Lists**: Ensure emails are valid before uploading
2. **Use Clear Reasons**: Future reference when points are awarded
3. **Monitor Pending**: Regular check on pending points status
4. **Batch Similar Campaigns**: Use consistent batch IDs for related uploads
5. **Track Conversions**: Monitor how many pending points get awarded

## Benefits

✅ **Pre-signup Engagement**: Reward users before they join
✅ **Seamless UX**: Users see points immediately upon signup
✅ **Marketing Tool**: Incentivize signups with guaranteed rewards
✅ **Partnership Ready**: Easy integration with partner user lists
✅ **Zero Manual Work**: Fully automated award process
✅ **Audit Trail**: Complete history of all pending and awarded points

## API Endpoints

### Get Pending Points

```
GET /api/admin/pending-points
Headers: x-user-email (admin)
Query: limit, offset, showAwarded
```

### Delete Pending Point

```
DELETE /api/admin/pending-points?id={uuid}
Headers: x-user-email (admin)
```

Note: Can only delete un-awarded pending points

## Limitations

- Email must be exact match (case-insensitive)
- Points awarded only once per pending record
- Cannot delete already-awarded pending points
- Requires user to actually add email to their profile
