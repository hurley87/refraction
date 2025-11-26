-- Add description column to locations table
-- This allows users and admins to add short descriptions to locations

ALTER TABLE locations
ADD COLUMN IF NOT EXISTS description VARCHAR(500) NULL;

-- Add a comment for documentation
COMMENT ON COLUMN locations.description IS 'Short description of the location, visible to all users';

