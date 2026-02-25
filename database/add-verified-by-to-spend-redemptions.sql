-- Add verified_by to spend_redemptions for audit (user vs admin verification)
-- Pending: is_fulfilled = false, points not yet deducted at creation
-- Verified: is_fulfilled = true, fulfilled_at set, verified_by = 'user' | 'admin'

ALTER TABLE spend_redemptions
  ADD COLUMN IF NOT EXISTS verified_by TEXT;

COMMENT ON COLUMN spend_redemptions.verified_by IS 'Who verified: user (button) or admin (fulfill). Null if not yet verified.';
