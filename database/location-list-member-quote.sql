-- Optional contributor quote for one spot inside one curated list.
-- The same location can carry a different quote in each list.
-- Empty means the city guide falls back to the spot description, then the address.
-- Safe to run multiple times.

ALTER TABLE location_list_members
  ADD COLUMN IF NOT EXISTS quote TEXT;

COMMENT ON COLUMN location_list_members.quote IS
  'Contributor quote shown on a city guide for this list membership. Null falls back to the location description.';
