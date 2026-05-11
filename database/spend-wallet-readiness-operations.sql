-- IRL-5: Idempotent wallet readiness ledger row per spend session (Stellar activation / trustline, etc.).
-- Depends on: spend_sessions (including IRL-9 spend_rail / rail_user_wallet_address), treasury_transactions.

CREATE TABLE IF NOT EXISTS spend_wallet_readiness_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spend_session_id UUID NOT NULL REFERENCES spend_sessions(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    spend_rail TEXT NOT NULL
        CHECK (spend_rail IN ('base_usdc', 'stellar_usdc')),
    rail_user_wallet_address TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending',
            'completed',
            'failed',
            'needs_review'
        )),
    step_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    sanitized_error_category TEXT,
    sanitized_error_code TEXT,
    internal_diagnostics JSONB,
    idempotency_key TEXT NOT NULL,
    sponsor_treasury_transaction_id UUID
        REFERENCES treasury_transactions(id) ON DELETE SET NULL,
    trustline_treasury_transaction_id UUID
        REFERENCES treasury_transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT spend_wallet_readiness_operations_idempotency_key_unique
        UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_spend_wallet_readiness_operations_session
    ON spend_wallet_readiness_operations (spend_session_id);

CREATE INDEX IF NOT EXISTS idx_spend_wallet_readiness_operations_user
    ON spend_wallet_readiness_operations (user_id);

COMMENT ON TABLE spend_wallet_readiness_operations IS
    'Per-session idempotent wallet readiness (e.g. Stellar sponsor + USDC trustline); one row per idempotency_key.';

COMMENT ON COLUMN spend_wallet_readiness_operations.rail_user_wallet_address IS
    'Rail user wallet snapshotted for this operation (same normalization as spend_sessions.rail_user_wallet_address).';

COMMENT ON COLUMN spend_wallet_readiness_operations.step_metadata IS
    'Structured per-step state for orchestration (JSON).';

COMMENT ON COLUMN spend_wallet_readiness_operations.sanitized_error_category IS
    'User-safe error grouping for product copy (no raw chain errors).';

COMMENT ON COLUMN spend_wallet_readiness_operations.sanitized_error_code IS
    'Stable user-safe error code for analytics and support.';

COMMENT ON COLUMN spend_wallet_readiness_operations.internal_diagnostics IS
    'Server-only diagnostic payload (JSON); not for client display.';

COMMENT ON COLUMN spend_wallet_readiness_operations.idempotency_key IS
    'Deterministic v1 key: wallet_readiness:{spend_session_id}. Unique for retry safety.';

COMMENT ON COLUMN spend_wallet_readiness_operations.sponsor_treasury_transaction_id IS
    'Optional treasury row for account sponsorship / activation step.';

COMMENT ON COLUMN spend_wallet_readiness_operations.trustline_treasury_transaction_id IS
    'Optional treasury row for USDC trustline (or related) step.';

CREATE OR REPLACE FUNCTION set_spend_wallet_readiness_operations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS spend_wallet_readiness_operations_updated_at
    ON spend_wallet_readiness_operations;
CREATE TRIGGER spend_wallet_readiness_operations_updated_at
    BEFORE UPDATE ON spend_wallet_readiness_operations
    FOR EACH ROW
    EXECUTE FUNCTION set_spend_wallet_readiness_operations_updated_at();

ALTER TABLE spend_wallet_readiness_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access spend_wallet_readiness_operations"
    ON spend_wallet_readiness_operations
    FOR ALL
    USING (true)
    WITH CHECK (true);
