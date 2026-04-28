-- Adds Privy server wallet metadata used by the spend pilot admin API.
ALTER TABLE spend_experiences
  ADD COLUMN IF NOT EXISTS privy_server_wallet_id TEXT,
  ADD COLUMN IF NOT EXISTS server_wallet_address TEXT,
  ADD COLUMN IF NOT EXISTS server_wallet_chain TEXT NOT NULL DEFAULT 'base-mainnet',
  ADD COLUMN IF NOT EXISTS server_wallet_created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS spend_create_idempotency_key TEXT;

-- Existing pilot rows used treasury_wallet_address as the payout wallet.
UPDATE spend_experiences
SET server_wallet_address = treasury_wallet_address
WHERE server_wallet_address IS NULL
  AND treasury_wallet_address IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_spend_experiences_privy_server_wallet_id
  ON spend_experiences (privy_server_wallet_id)
  WHERE privy_server_wallet_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_spend_experiences_create_idempotency_key
  ON spend_experiences (spend_create_idempotency_key)
  WHERE spend_create_idempotency_key IS NOT NULL;
