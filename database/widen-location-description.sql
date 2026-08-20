-- Widen locations.description to at least 500 characters.
-- ADD COLUMN IF NOT EXISTS does not change an existing VARCHAR(255) column.

ALTER TABLE locations
  ALTER COLUMN description TYPE VARCHAR(500);

COMMENT ON COLUMN locations.description IS
  'Short description of the location, visible to all users (up to 500 characters).';
