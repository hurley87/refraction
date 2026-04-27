-- Spend pilot: sessions, conversion, spend, and optional treasury ledger (IRL Spend Pilot PRD §7, §11)
-- Depends on: spend_experiences (spend-experiences-schema.sql)

-- SpendSession: one row per user per experience (idempotent scan)
CREATE TABLE IF NOT EXISTS spend_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spend_experience_id UUID NOT NULL REFERENCES spend_experiences(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'created'
        CHECK (status IN (
            'created',
            'conversion_pending',
            'conversion_complete',
            'payment_pending',
            'payment_complete',
            'failed',
            'expired'
        )),
    qr_token_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_spend_sessions_experience_user_unique
    ON spend_sessions (spend_experience_id, user_id);

CREATE INDEX IF NOT EXISTS idx_spend_sessions_experience
    ON spend_sessions (spend_experience_id);

CREATE INDEX IF NOT EXISTS idx_spend_sessions_user
    ON spend_sessions (user_id);

CREATE INDEX IF NOT EXISTS idx_spend_sessions_status
    ON spend_sessions (status);

-- PointConversion: at most one successful (funded) conversion per user per experience
CREATE TABLE IF NOT EXISTS point_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spend_experience_id UUID NOT NULL REFERENCES spend_experiences(id) ON DELETE CASCADE,
    spend_session_id UUID NOT NULL REFERENCES spend_sessions(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    points_deducted NUMERIC(24, 8) NOT NULL
        CHECK (points_deducted >= 0),
    usdc_amount NUMERIC(24, 8) NOT NULL
        CHECK (usdc_amount > 0),
    status VARCHAR(32) NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending',
            'points_deducted',
            'funding_pending',
            'funded',
            'failed'
        )),
    treasury_wallet_address TEXT NOT NULL,
    user_wallet_address TEXT NOT NULL,
    funding_tx_hash TEXT,
    idempotency_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    failed_reason TEXT,
    CONSTRAINT point_conversions_session_experience
        CHECK (spend_experience_id IS NOT NULL)
);

-- One in-flight or completed conversion attempt per session (enforces idempotent retry semantics)
CREATE UNIQUE INDEX IF NOT EXISTS idx_point_conversions_session_unique
    ON point_conversions (spend_session_id);

-- One successful conversion per user per experience
CREATE UNIQUE INDEX IF NOT EXISTS idx_point_conversions_one_funded_per_user_experience
    ON point_conversions (spend_experience_id, user_id)
    WHERE status = 'funded';

-- Optional idempotency for confirm endpoints
CREATE UNIQUE INDEX IF NOT EXISTS idx_point_conversions_idempotency
    ON point_conversions (idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_point_conversions_experience
    ON point_conversions (spend_experience_id);

-- SpendTransaction: user USDC to receiving wallet; at most one confirmed payment per session
CREATE TABLE IF NOT EXISTS spend_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spend_experience_id UUID NOT NULL REFERENCES spend_experiences(id) ON DELETE CASCADE,
    spend_session_id UUID NOT NULL REFERENCES spend_sessions(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    usdc_amount NUMERIC(24, 8) NOT NULL
        CHECK (usdc_amount > 0),
    from_wallet_address TEXT NOT NULL,
    to_wallet_address TEXT NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending',
            'submitted',
            'confirmed',
            'failed'
        )),
    payment_tx_hash TEXT,
    idempotency_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    failed_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_spend_transactions_experience
    ON spend_transactions (spend_experience_id);

CREATE INDEX IF NOT EXISTS idx_spend_transactions_session
    ON spend_transactions (spend_session_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_spend_transactions_idempotency
    ON spend_transactions (idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_spend_transactions_one_confirmed_per_session
    ON spend_transactions (spend_session_id)
    WHERE status = 'confirmed';

-- TreasuryTransaction: optional audit ledger
CREATE TABLE IF NOT EXISTS treasury_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spend_experience_id UUID REFERENCES spend_experiences(id) ON DELETE SET NULL,
    transaction_type VARCHAR(32) NOT NULL
        CHECK (transaction_type IN (
            'fund_user',
            'receive_payment',
            'admin_recovery'
        )),
    amount NUMERIC(24, 8) NOT NULL
        CHECK (amount >= 0),
    from_wallet_address TEXT,
    to_wallet_address TEXT,
    tx_hash TEXT,
    status VARCHAR(24) NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending',
            'submitted',
            'confirmed',
            'failed'
        )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_treasury_tx_experience
    ON treasury_transactions (spend_experience_id);

CREATE INDEX IF NOT EXISTS idx_treasury_tx_hash
    ON treasury_transactions (tx_hash)
    WHERE tx_hash IS NOT NULL;

-- RLS: product flows use service role; mirror spend_experiences
ALTER TABLE spend_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE spend_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE treasury_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access spend_sessions"
    ON spend_sessions
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access point_conversions"
    ON point_conversions
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access spend_transactions"
    ON spend_transactions
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access treasury_transactions"
    ON treasury_transactions
    FOR ALL
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE spend_sessions IS 'User scan session for a spend experience; one per user per experience.';
COMMENT ON TABLE point_conversions IS 'Points-to-USDC conversion; unique funded row per (experience, user).';
COMMENT ON TABLE spend_transactions IS 'USDC spend to event wallet; one confirmed per session where applicable.';
COMMENT ON TABLE treasury_transactions IS 'Optional treasury / payment audit log.';
