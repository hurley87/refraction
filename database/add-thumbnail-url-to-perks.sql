-- Add thumbnail_url column to perks table
-- This stores the URL of the thumbnail image for each perk

ALTER TABLE perks 
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN perks.thumbnail_url IS 'URL of the thumbnail image for the perk (stored on IPFS)';

