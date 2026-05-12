-- IRL-19: Idempotent server-prepared Base USDC payment descriptor per spend session.
-- Depends on: spend_sessions.

CREATE TABLE IF NOT EXISTS spend_payment_prepare_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spend_session_id UUID NOT NULL REFERENCES spend_sessions(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    spend_rail TEXT NOT NULL
        CHECK (spend_rail IN ('base_usdc', 'stellar_usdc')),
    status VARCHAR(32) NOT NULL DEFAULT 'prepared'
        CHECK (status IN ('prepared')),
    prepared_action JSONB NOT NULL,
    verification_snapshot JSONB NOT NULL,
    idempotency_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT spend_payment_prepare_operations_idempotency_key_unique
        UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_spend_payment_prepare_operations_session
    ON spend_payment_prepare_operations (spend_session_id);

CREATE INDEX IF NOT EXISTS idx_spend_payment_prepare_operations_user
    ON spend_payment_prepare_operations (user_id);

COMMENT ON TABLE spend_payment_prepare_operations IS
    'Per-session idempotent prepared payment action (Base: Privy EVM tx request + verification snapshot).';

COMMENT ON COLUMN spend_payment_prepare_operations.prepared_action IS
    'JSON-serializable client payload (e.g. Privy-compatible EVM transaction request for Base USDC transfer).';

COMMENT ON COLUMN spend_payment_prepare_operations.verification_snapshot IS
    'Immutable rail fields used to bind payment/confirm to the prepared descriptor (no client-supplied recipient trust).';

COMMENT ON COLUMN spend_payment_prepare_operations.idempotency_key IS
    'Deterministic v1 key: payment:{spend_session_id}. Distinct from spend_transactions idempotency (spend_payment:{sessionId}).';

CREATE OR REPLACE FUNCTION set_spend_payment_prepare_operations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS spend_payment_prepare_operations_updated_at
    ON spend_payment_prepare_operations;
CREATE TRIGGER spend_payment_prepare_operations_updated_at
    BEFORE UPDATE ON spend_payment_prepare_operations
    FOR EACH ROW
    EXECUTE FUNCTION set_spend_payment_prepare_operations_updated_at();

ALTER TABLE spend_payment_prepare_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access spend_payment_prepare_operations"
    ON spend_payment_prepare_operations
    FOR ALL
    USING (true)
    WITH CHECK (true);
