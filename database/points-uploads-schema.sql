-- Points Uploads Tracking Table
-- Records all bulk points uploads from CSV files for audit and tracking

CREATE TABLE IF NOT EXISTS points_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    points_awarded INTEGER NOT NULL,
    reason TEXT NOT NULL,
    user_wallet_address VARCHAR(42),
    upload_batch_id UUID NOT NULL,
    uploaded_by_email VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT positive_points CHECK (points_awarded > 0),
    CONSTRAINT valid_status CHECK (status IN ('success', 'failed', 'user_not_found'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_points_uploads_batch ON points_uploads(upload_batch_id);
CREATE INDEX IF NOT EXISTS idx_points_uploads_email ON points_uploads(email);
CREATE INDEX IF NOT EXISTS idx_points_uploads_uploaded_by ON points_uploads(uploaded_by_email);
CREATE INDEX IF NOT EXISTS idx_points_uploads_created_at ON points_uploads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_points_uploads_status ON points_uploads(status);

-- Create a view for batch summaries
CREATE OR REPLACE VIEW points_uploads_batch_summary AS
SELECT 
    upload_batch_id,
    uploaded_by_email,
    COUNT(*) as total_records,
    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_records,
    SUM(CASE WHEN status = 'failed' OR status = 'user_not_found' THEN 1 ELSE 0 END) as failed_records,
    SUM(CASE WHEN status = 'success' THEN points_awarded ELSE 0 END) as total_points_awarded,
    MIN(created_at) as uploaded_at
FROM points_uploads
GROUP BY upload_batch_id, uploaded_by_email;

-- Comments
COMMENT ON TABLE points_uploads IS 'Records all bulk points uploads from CSV files for audit trail';
COMMENT ON COLUMN points_uploads.upload_batch_id IS 'Groups all records from the same CSV upload';
COMMENT ON COLUMN points_uploads.status IS 'success: points awarded, failed: error occurred, user_not_found: email not in system';

