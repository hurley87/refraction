-- Pending Points System
-- Stores points for users who haven't created accounts yet
-- When they sign up, these points are automatically awarded

CREATE TABLE IF NOT EXISTS pending_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    points INTEGER NOT NULL,
    reason TEXT NOT NULL,
    uploaded_by_email VARCHAR(255) NOT NULL,
    upload_batch_id UUID NOT NULL,
    awarded BOOLEAN DEFAULT false,
    awarded_at TIMESTAMP WITH TIME ZONE,
    awarded_to_wallet_address VARCHAR(42),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT positive_points CHECK (points > 0),
    CONSTRAINT valid_email CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pending_points_email ON pending_points(email) WHERE awarded = false;
CREATE INDEX IF NOT EXISTS idx_pending_points_awarded ON pending_points(awarded);
CREATE INDEX IF NOT EXISTS idx_pending_points_created_at ON pending_points(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pending_points_batch ON pending_points(upload_batch_id);

-- View to see pending points summary by email
CREATE OR REPLACE VIEW pending_points_summary AS
SELECT 
    email,
    COUNT(*) as pending_count,
    SUM(points) as total_pending_points,
    MIN(created_at) as oldest_pending,
    MAX(created_at) as newest_pending
FROM pending_points
WHERE awarded = false
GROUP BY email;

-- Function to automatically award pending points when user creates account
CREATE OR REPLACE FUNCTION award_pending_points_on_signup()
RETURNS TRIGGER AS $$
DECLARE
    pending_record RECORD;
BEGIN
    -- Only process if email is set and is new or changed
    IF NEW.email IS NOT NULL AND (OLD IS NULL OR OLD.email IS NULL OR OLD.email != NEW.email) THEN
        -- Find all pending points for this email
        FOR pending_record IN 
            SELECT * FROM pending_points 
            WHERE LOWER(email) = LOWER(NEW.email) 
            AND awarded = false
            FOR UPDATE
        LOOP
            -- Award the points
            INSERT INTO points_activities (
                user_wallet_address,
                activity_type,
                points_earned,
                description,
                metadata,
                processed
            ) VALUES (
                NEW.wallet_address,
                'pending_points_awarded',
                pending_record.points,
                'Pre-signup award: ' || pending_record.reason,
                jsonb_build_object(
                    'pending_points_id', pending_record.id,
                    'upload_batch_id', pending_record.upload_batch_id,
                    'uploaded_by', pending_record.uploaded_by_email,
                    'original_reason', pending_record.reason
                ),
                true
            );
            
            -- Mark as awarded
            UPDATE pending_points
            SET 
                awarded = true,
                awarded_at = NOW(),
                awarded_to_wallet_address = NEW.wallet_address
            WHERE id = pending_record.id;
            
            RAISE NOTICE 'Awarded % pending points to user %', pending_record.points, NEW.email;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-award pending points when user adds email to profile
DROP TRIGGER IF EXISTS trigger_award_pending_points_on_signup ON players;
CREATE TRIGGER trigger_award_pending_points_on_signup
    AFTER INSERT OR UPDATE OF email ON players
    FOR EACH ROW
    EXECUTE FUNCTION award_pending_points_on_signup();

-- Comments
COMMENT ON TABLE pending_points IS 'Points waiting to be awarded to users who haven''t signed up yet';
COMMENT ON COLUMN pending_points.awarded IS 'Whether these points have been awarded to a user';
COMMENT ON COLUMN pending_points.email IS 'Email address of the future user';
COMMENT ON FUNCTION award_pending_points_on_signup() IS 'Automatically awards pending points when user signs up or adds email to profile';

