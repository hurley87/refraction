-- Add is_featured to perks. The featured perk is shown in the LATEST REWARD slot
-- on /rewards, chosen manually by admins instead of auto-selected by created_at.
ALTER TABLE perks ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;

-- Partial index: typically only one (or few) perks are featured at a time.
CREATE INDEX IF NOT EXISTS idx_perks_is_featured ON perks (is_featured) WHERE is_featured = true;
