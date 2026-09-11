-- Admin-created players may omit an EVM wallet. Chain-only rows already
-- leave this column unset; Postgres was still NOT NULL on some environments.
ALTER TABLE players
  ALTER COLUMN wallet_address DROP NOT NULL;

-- Pending-point awards insert into points_activities.user_wallet_address,
-- which is NOT NULL + 0x format. Skip until a wallet exists.
CREATE OR REPLACE FUNCTION award_pending_points_on_signup()
RETURNS TRIGGER AS $$
DECLARE
    pending_record RECORD;
BEGIN
    IF NEW.email IS NULL
       OR NEW.wallet_address IS NULL
       OR length(trim(NEW.wallet_address)) = 0 THEN
        RETURN NEW;
    END IF;

    IF OLD IS NOT NULL
       AND OLD.email IS NOT NULL
       AND OLD.email = NEW.email THEN
        RETURN NEW;
    END IF;

    FOR pending_record IN
        SELECT * FROM pending_points
        WHERE LOWER(email) = LOWER(NEW.email)
        AND awarded = false
        FOR UPDATE
    LOOP
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

        UPDATE pending_points
        SET
            awarded = true,
            awarded_at = NOW(),
            awarded_to_wallet_address = NEW.wallet_address
        WHERE id = pending_record.id;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
