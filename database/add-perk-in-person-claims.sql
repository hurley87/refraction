-- In-person perk claims + optional daily per-member cap.
-- Safe to run multiple times.

-- Blank/null = unlimited claims per member per UTC-12:00 day.
ALTER TABLE perks
ADD COLUMN IF NOT EXISTS max_claims_per_member_per_day INTEGER NULL;

COMMENT ON COLUMN perks.max_claims_per_member_per_day IS
  'Max in-person claims per wallet per perk per UTC day (12:00 UTC boundary). NULL = unlimited.';

CREATE TABLE IF NOT EXISTS perk_in_person_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perk_id UUID NOT NULL REFERENCES perks(id) ON DELETE CASCADE,
  user_wallet_address TEXT NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_perk_in_person_claims_perk_wallet_time
ON perk_in_person_claims (perk_id, user_wallet_address, claimed_at DESC);

COMMENT ON TABLE perk_in_person_claims IS
  'Show-to-staff in-person perk claims recorded when the success screen is reached';
