-- Add is_unlisted column to perks table
-- Unlisted perks are active but not shown on the main perks/rewards listing.
-- They remain accessible via direct link (e.g. /perks/[perkId]).
ALTER TABLE perks ADD COLUMN is_unlisted BOOLEAN NOT NULL DEFAULT false;
