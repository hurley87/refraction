-- Add city column to locations for first-class geographic analytics
-- City is derived from coordinates at creation time and used for
-- per-city spot counts, milestone tracking in Mixpanel, and admin metrics.

ALTER TABLE locations
ADD COLUMN IF NOT EXISTS city TEXT;

COMMENT ON COLUMN locations.city IS 'City name derived from coordinates or address, used for geographic analytics';

CREATE INDEX IF NOT EXISTS idx_locations_city ON locations (city) WHERE city IS NOT NULL;
