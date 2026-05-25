-- IRL-53: Admin activation create idempotency + Privy campaign wallet id (optional audit).
ALTER TABLE sponsored_activation
    ADD COLUMN IF NOT EXISTS activation_create_idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sponsored_activation_create_idempotency_key
    ON sponsored_activation (activation_create_idempotency_key)
    WHERE activation_create_idempotency_key IS NOT NULL;

ALTER TABLE sponsored_activation
    ADD COLUMN IF NOT EXISTS privy_campaign_wallet_id TEXT;

COMMENT ON COLUMN sponsored_activation.activation_create_idempotency_key IS
    'Optional client idempotency key for POST /api/admin/sponsored-activations (mirrors spend_experiences).';
COMMENT ON COLUMN sponsored_activation.privy_campaign_wallet_id IS
    'Privy server wallet id for campaign_wallet_address (Base: ethereum; Stellar: stellar chain).';
