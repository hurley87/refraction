-- Add Stellar wallet ID column for server-side transaction signing
-- Run this migration after add-stellar-wallet-to-players.sql

-- Add stellar_wallet_id column (Privy wallet ID for signing transactions)
ALTER TABLE players ADD COLUMN IF NOT EXISTS stellar_wallet_id VARCHAR(100);

-- Note: This ID is required to call privy.walletApi.stellar.signTransaction()
