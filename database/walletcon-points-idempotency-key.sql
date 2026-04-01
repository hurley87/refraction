-- WalletCon one-time points hardening
-- Prevents duplicate awards under concurrent requests by enforcing
-- one activity row per wallet + activity_type for WalletCon flows.

ALTER TABLE points_activities
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_points_activities_walletcon_idempotency
ON points_activities (idempotency_key)
WHERE idempotency_key IS NOT NULL
  AND activity_type IN ('walletcon_cannes_checkin', 'walletcon_cannes_mint');
