-- Add description column to locations table
-- This allows users and admins to add short descriptions to locations

ALTER TABLE locations
ADD COLUMN IF NOT EXISTS description VARCHAR(500) NULL;

-- Widen an existing VARCHAR(255) column; ADD COLUMN IF NOT EXISTS is a no-op
-- when the column already exists at a narrower type.
ALTER TABLE locations
  ALTER COLUMN description TYPE VARCHAR(500);

-- Add a comment for documentation
COMMENT ON COLUMN locations.description IS 'Short description of the location, visible to all users (up to 500 characters).';

