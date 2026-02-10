-- Add Aptos wallet support to players table
-- Run this migration to enable Aptos wallet check-ins

-- Add aptos_wallet_address column
ALTER TABLE players ADD COLUMN IF NOT EXISTS aptos_wallet_address VARCHAR(66);

-- Add aptos_wallet_id column (Privy wallet ID for signing transactions)
ALTER TABLE players ADD COLUMN IF NOT EXISTS aptos_wallet_id VARCHAR(100);

-- Create index for faster lookups by Aptos wallet
CREATE INDEX IF NOT EXISTS idx_players_aptos_wallet ON players(aptos_wallet_address);

-- Note: Aptos addresses are 0x-prefixed hex strings (66 characters total: 0x + 64 hex chars)
-- Example: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
