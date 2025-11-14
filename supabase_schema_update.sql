-- Add server_wallet_address column to locations table
-- This tracks which server wallet created the coin for each location

ALTER TABLE locations 
ADD COLUMN IF NOT EXISTS server_wallet_address TEXT;

-- Add index for server wallet address lookups
CREATE INDEX IF NOT EXISTS idx_locations_server_wallet 
ON locations(server_wallet_address);

-- Update the locations table to support server-side coin creation
COMMENT ON COLUMN locations.server_wallet_address IS 'Address of the server wallet that created the coin for this location';

-- Ensure player_location_checkins can store optional user comments and images
ALTER TABLE player_location_checkins
ADD COLUMN IF NOT EXISTS comment TEXT;

ALTER TABLE player_location_checkins
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ---------------------------------------------------------------------------
-- Tier system (reward policy levels)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL UNIQUE,
  min_points INTEGER NOT NULL,
  max_points INTEGER,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tiers_positive_min CHECK (min_points >= 0),
  CONSTRAINT tiers_valid_range CHECK (
    max_points IS NULL OR max_points > min_points
  )
);

CREATE INDEX IF NOT EXISTS idx_tiers_min_points ON tiers(min_points);

-- Ensure updated_at stays in sync
CREATE OR REPLACE FUNCTION set_tiers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_tiers_updated_at ON tiers;
CREATE TRIGGER trigger_set_tiers_updated_at
  BEFORE UPDATE ON tiers
  FOR EACH ROW
  EXECUTE FUNCTION set_tiers_updated_at();

-- Seed/refresh the canonical tiers
INSERT INTO tiers (title, min_points, max_points, description)
VALUES
  (
    'General Admission',
    0,
    5000,
    'Access to limited global perks such as online store discounts and product licenses.'
  ),
  (
    'Insider',
    5000,
    15000,
    'Includes all General Admission perks plus select local perks and recommendations world-wide (free coffees, local discounts).'
  ),
  (
    'Resident',
    15000,
    25000,
    'Includes all Insider perks plus premium local and global perks like guest list spots and complimentary product.'
  ),
  (
    'Patron',
    25000,
    NULL,
    'Includes all Resident perks, queue skip at all Refraction events, exclusive t-shirt and digital collectible, and premium local/global perks.'
  )
ON CONFLICT (title) DO UPDATE
SET
  min_points = EXCLUDED.min_points,
  max_points = EXCLUDED.max_points,
  description = EXCLUDED.description;

-- ---------------------------------------------------------------------------
-- Add is_universal column to perk_discount_codes table
-- ---------------------------------------------------------------------------

ALTER TABLE perk_discount_codes
ADD COLUMN IF NOT EXISTS is_universal BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN perk_discount_codes.is_universal IS 'If true, this code is shared by all eligible users and not redeemed/burned. If false, this is an individual code that can only be redeemed once.';
