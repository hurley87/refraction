-- Add server_wallet_address column to locations table
-- This tracks which server wallet created the coin for each location

ALTER TABLE locations 
ADD COLUMN IF NOT EXISTS server_wallet_address TEXT;

-- Add index for server wallet address lookups
CREATE INDEX IF NOT EXISTS idx_locations_server_wallet 
ON locations(server_wallet_address);

-- Update the locations table to support server-side coin creation
COMMENT ON COLUMN locations.server_wallet_address IS 'Address of the server wallet that created the coin for this location';