-- Add Stellar wallet support to players table
-- Run this migration to enable Stellar wallet check-ins

-- Add stellar_wallet_address column
ALTER TABLE players ADD COLUMN IF NOT EXISTS stellar_wallet_address VARCHAR(56);

-- Create index for faster lookups by Stellar wallet
CREATE INDEX IF NOT EXISTS idx_players_stellar_wallet ON players(stellar_wallet_address);

-- Note: Stellar public addresses are 56 characters starting with 'G'
-- Example: GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOBER62EOTS64MUQO
