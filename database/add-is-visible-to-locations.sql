-- Add is_visible column to locations table
-- Safe migration: existing locations visible, new locations hidden

BEGIN;

-- Add column with DEFAULT TRUE (existing rows get TRUE)
ALTER TABLE locations
ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT TRUE;

-- Change default for future inserts to FALSE
ALTER TABLE locations ALTER COLUMN is_visible SET DEFAULT FALSE;

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_locations_is_visible ON locations(is_visible);

COMMIT;
