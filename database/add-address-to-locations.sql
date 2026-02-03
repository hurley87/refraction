-- Add address column to locations table
-- This stores the street address separately from the venue name

ALTER TABLE locations
ADD COLUMN IF NOT EXISTS address TEXT;

-- Migrate existing data: copy current 'name' values to 'address'
-- This assumes that 'name' currently contains address data
UPDATE locations SET address = name WHERE address IS NULL;

-- Add a comment for documentation
COMMENT ON COLUMN locations.address IS 'Street address of the location (e.g., "123 Main St, New York, NY 10001")';
