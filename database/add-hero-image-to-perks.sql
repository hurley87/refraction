-- Add hero_image column to perks table
-- This stores the URL of the hero/modal image for each perk

ALTER TABLE perks 
ADD COLUMN IF NOT EXISTS hero_image TEXT;

-- Add comment for documentation
COMMENT ON COLUMN perks.hero_image IS 'URL of the hero/modal image for the perk (stored on Supabase Storage)';

