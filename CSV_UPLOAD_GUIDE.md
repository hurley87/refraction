# CSV Bulk Points Upload Feature

## Overview

The admin users page now includes a CSV upload feature that allows bulk assignment of points to users by email.

## How to Use

### 1. **Prepare Your CSV File**

Create a CSV file with three columns:

- `email`: User's email address
- `reason`: Reason for awarding points
- `points`: Number of points to award (must be positive)

**Example CSV:**

```csv
email,reason,points
user@example.com,Event participation bonus,100
user2@example.com,Campaign completion reward,50
user3@example.com,Community contribution,75
```

### 2. **Download Template**

Click the "Template" button on the admin users page to download a pre-formatted CSV template.

### 3. **Upload CSV**

1. Click "Upload Points CSV" button
2. Select your CSV file
3. Wait for processing (shows "Uploading..." during processing)
4. Review results in the dialog that appears

### 4. **Review Results**

After upload, a dialog shows:

- **Summary Statistics**:

  - Total records processed
  - Successful uploads
  - Users not found
  - Failed uploads
  - Total points awarded

- **Detailed Results**:
  - Status indicator (✓ success, ⚠ not found, ✗ failed)
  - Email address
  - Reason
  - Points
  - Error message (if any)

### 5. **View Upload History**

Click "Show History" to see all previous uploads with:

- Date and time
- Email
- Reason
- Points awarded
- Status
- Who uploaded it

## Database Schema

### Points Uploads Table (`points_uploads`)

Records every row from each CSV upload for audit purposes:

```sql
CREATE TABLE points_uploads (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    points_awarded INTEGER NOT NULL,
    reason TEXT NOT NULL,
    user_wallet_address VARCHAR(42),
    upload_batch_id UUID NOT NULL,
    uploaded_by_email VARCHAR(255) NOT NULL,
    status VARCHAR(20),  -- 'success', 'failed', 'user_not_found'
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE
);
```

### Batch Summary View

A view that aggregates uploads by batch:

- Total records per batch
- Success/failure counts
- Total points awarded
- Upload timestamp

## How It Works

1. **User Lookup**: System searches for users by email (case-insensitive)
2. **Points Award**: If user found, points are added via `points_activities` table
3. **Tracking**: Every attempt is recorded in `points_uploads` table
4. **Batch Grouping**: All rows from a single upload share a `upload_batch_id`

## Status Types

- **success**: User found and points successfully awarded
- **user_not_found**: Email doesn't match any user in system - **Points saved as pending for future signup!**
- **failed**: Error occurred during points award process

## 🆕 Pending Points Feature

When a user isn't found (orange "user_not_found" status), **points are automatically saved as pending**!

### How It Works:

1. CSV uploaded with email not in system
2. Points stored in `pending_points` table
3. When user signs up with that email → **Points automatically awarded!**
4. Zero manual intervention needed

### View Pending Points:

Click "Show Pending" button to see:

- All users with pending points
- Summary: pending users, records, total points
- Detailed table with email, reason, points, upload date

See [PENDING_POINTS_GUIDE.md](./PENDING_POINTS_GUIDE.md) for complete documentation.

## Points Activity Type

Points uploaded via CSV are recorded with:

- `activity_type`: "admin_bulk_upload"
- `description`: "Admin upload: {reason from CSV}"
- `metadata`: Contains upload batch ID, uploader email, and reason

## Security

- Only admins can upload (checked via `ADMIN_EMAILS` list)
- All uploads are tracked with admin email
- Full audit trail maintained in database

## API Endpoints

### Upload CSV

```
POST /api/admin/points-upload
Content-Type: multipart/form-data
Header: x-user-email (admin email)
Body: file (CSV file)
```

### Get Upload History

```
GET /api/admin/points-upload
Header: x-user-email (admin email)
Query params: limit, offset
```

## Error Handling

The system handles:

- Invalid CSV format
- Missing required columns
- Invalid point values (negative or non-numeric)
- Users not found
- Database errors

All errors are:

1. Shown in upload results dialog
2. Recorded in database
3. Logged to console

## Best Practices

1. **Test with small batch first**: Upload a few rows to verify format
2. **Review results carefully**: Check for failed/not found records
3. **Export users list**: Use "Export CSV" to get current emails
4. **Keep records**: Upload history is permanent for audit trail
5. **Use descriptive reasons**: Helps with future reference and reporting
