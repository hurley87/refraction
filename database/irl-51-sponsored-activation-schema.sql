-- IRL-51: Public Records sponsored USDC activation — core tables (schema only).
-- PRD: docs/plans/public-records-sponsored-usdc-activation-prd.md
--
-- ON DELETE behavior (summary):
--   sponsored_activation: root row; DELETE blocked while activation_redemption rows
--     reference it (ON DELETE RESTRICT on redemptions).
--   activation_reward_item / activation_eligibility_event: CASCADE when the parent
--     activation is removed (only after redemptions and dependent settlements are gone).
--   activation_redemption: RESTRICT on players, reward_item, eligibility_event, activation.
--   activation_settlement_transaction: CASCADE with redemption (no orphaned settlements
--     when a redemption row is deleted); RESTRICT on activation for direct deletes.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- sponsored_activation
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sponsored_activation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    sponsor_name TEXT NOT NULL,
    event_id TEXT,
    status VARCHAR(24) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'paused', 'ended')),
    settlement_rail VARCHAR(16) NOT NULL
        CHECK (settlement_rail IN ('base', 'stellar', 'tempo')),
    campaign_wallet_address TEXT NOT NULL,
    venue_settlement_wallet_address TEXT NOT NULL,
    usdc_asset_config JSONB NOT NULL,
    max_redemptions INTEGER
        CHECK (max_redemptions IS NULL OR max_redemptions > 0),
    max_usdc_budget NUMERIC(24, 8)
        CHECK (max_usdc_budget IS NULL OR max_usdc_budget > 0),
    usdc_settled_total NUMERIC(24, 8) NOT NULL DEFAULT 0
        CHECK (usdc_settled_total >= 0),
    redemption_count_confirmed INTEGER NOT NULL DEFAULT 0
        CHECK (redemption_count_confirmed >= 0),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    eligibility_config JSONB NOT NULL,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT sponsored_activation_time_window CHECK (ends_at > starts_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sponsored_activation_slug
    ON sponsored_activation (slug);

CREATE INDEX IF NOT EXISTS idx_sponsored_activation_status
    ON sponsored_activation (status);

CREATE INDEX IF NOT EXISTS idx_sponsored_activation_window
    ON sponsored_activation (starts_at, ends_at)
    WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_sponsored_activation_event_id
    ON sponsored_activation (event_id)
    WHERE event_id IS NOT NULL;

COMMENT ON TABLE sponsored_activation IS
    'Sponsor-funded activation config (campaign → venue USDC settlement). '
    'Child reward items and eligibility events CASCADE on activation DELETE; '
    'redemptions RESTRICT activation DELETE until removed.';

-- ---------------------------------------------------------------------------
-- activation_reward_item
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activation_reward_item (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activation_id UUID NOT NULL
        REFERENCES sponsored_activation(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    hero_image_url TEXT,
    description TEXT,
    points_cost INTEGER NOT NULL DEFAULT 0
        CHECK (points_cost >= 0),
    usdc_amount NUMERIC(24, 8) NOT NULL
        CHECK (usdc_amount > 0),
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    max_per_user INTEGER NOT NULL DEFAULT 1
        CHECK (max_per_user > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activation_reward_item_activation
    ON activation_reward_item (activation_id);

CREATE INDEX IF NOT EXISTS idx_activation_reward_item_activation_active
    ON activation_reward_item (activation_id)
    WHERE is_active = TRUE;

COMMENT ON TABLE activation_reward_item IS
    'Perk line items for an activation. CASCADE delete with sponsored_activation; '
    'activation_redemption.reward_item_id RESTRICT prevents delete while redemptions exist.';

-- ---------------------------------------------------------------------------
-- activation_eligibility_event
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activation_eligibility_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activation_id UUID NOT NULL
        REFERENCES sponsored_activation(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL
        REFERENCES players(id) ON DELETE RESTRICT,
    wallet_address TEXT,
    source VARCHAR(32) NOT NULL
        CHECK (source IN (
            'checkpoint_checkin',
            'location_checkin',
            'qr_scan',
            'nfc',
            'ticket_scan'
        )),
    source_ref_id TEXT,
    occurred_at TIMESTAMPTZ NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_activation_eligibility_event_activation
    ON activation_eligibility_event (activation_id);

CREATE INDEX IF NOT EXISTS idx_activation_eligibility_event_user
    ON activation_eligibility_event (user_id);

CREATE INDEX IF NOT EXISTS idx_activation_eligibility_event_activation_user
    ON activation_eligibility_event (activation_id, user_id);

CREATE INDEX IF NOT EXISTS idx_activation_eligibility_event_occurred
    ON activation_eligibility_event (occurred_at DESC);

COMMENT ON TABLE activation_eligibility_event IS
    'Eligibility signals (v1: no staff_grant). CASCADE delete with sponsored_activation; '
    'RESTRICT on players prevents deleting a player row while events reference them.';

-- ---------------------------------------------------------------------------
-- activation_redemption
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activation_redemption (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activation_id UUID NOT NULL
        REFERENCES sponsored_activation(id) ON DELETE RESTRICT,
    reward_item_id UUID NOT NULL
        REFERENCES activation_reward_item(id) ON DELETE RESTRICT,
    user_id BIGINT NOT NULL
        REFERENCES players(id) ON DELETE RESTRICT,
    eligibility_event_id UUID NOT NULL
        REFERENCES activation_eligibility_event(id) ON DELETE RESTRICT,
    status VARCHAR(32) NOT NULL DEFAULT 'eligible'
        CHECK (status IN (
            'eligible',
            'available',
            'purchase_confirmed',
            'ready_to_redeem',
            'redeemed',
            'settlement_pending',
            'settlement_confirmed',
            'settlement_failed',
            'cancelled',
            'expired'
        )),
    points_spent INTEGER
        CHECK (points_spent IS NULL OR points_spent >= 0),
    usdc_amount_snapshot NUMERIC(24, 8)
        CHECK (usdc_amount_snapshot IS NULL OR usdc_amount_snapshot >= 0),
    purchase_confirmed_at TIMESTAMPTZ,
    redeemed_at TIMESTAMPTZ,
    cancelled_reason TEXT,
    idempotency_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT activation_redemption_idempotency_key_unique UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_activation_redemption_activation
    ON activation_redemption (activation_id);

CREATE INDEX IF NOT EXISTS idx_activation_redemption_user
    ON activation_redemption (user_id);

CREATE INDEX IF NOT EXISTS idx_activation_redemption_activation_user
    ON activation_redemption (activation_id, user_id);

CREATE INDEX IF NOT EXISTS idx_activation_redemption_reward_item
    ON activation_redemption (reward_item_id);

CREATE INDEX IF NOT EXISTS idx_activation_redemption_eligibility_event
    ON activation_redemption (eligibility_event_id);

CREATE INDEX IF NOT EXISTS idx_activation_redemption_status
    ON activation_redemption (status);

COMMENT ON TABLE activation_redemption IS
    'User redemption lifecycle (PRD state machine). RESTRICT on activation, reward_item, '
    'eligibility_event, and players while this row exists.';

-- ---------------------------------------------------------------------------
-- activation_settlement_transaction
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activation_settlement_transaction (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    redemption_id UUID NOT NULL
        REFERENCES activation_redemption(id) ON DELETE CASCADE,
    activation_id UUID NOT NULL
        REFERENCES sponsored_activation(id) ON DELETE RESTRICT,
    settlement_rail VARCHAR(16) NOT NULL
        CHECK (settlement_rail IN ('base', 'stellar', 'tempo')),
    status VARCHAR(24) NOT NULL DEFAULT 'not_started'
        CHECK (status IN (
            'not_started',
            'queued',
            'submitted',
            'confirmed',
            'failed',
            'retrying'
        )),
    amount NUMERIC(24, 8) NOT NULL
        CHECK (amount >= 0),
    from_wallet_address TEXT NOT NULL,
    to_wallet_address TEXT NOT NULL,
    tx_hash TEXT,
    submission_attempt INTEGER NOT NULL DEFAULT 0
        CHECK (submission_attempt >= 0),
    last_error_code TEXT,
    queued_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    privy_transaction_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_activation_settlement_redemption
    ON activation_settlement_transaction (redemption_id);

CREATE INDEX IF NOT EXISTS idx_activation_settlement_activation
    ON activation_settlement_transaction (activation_id);

CREATE INDEX IF NOT EXISTS idx_activation_settlement_status
    ON activation_settlement_transaction (status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_activation_settlement_one_confirmed_per_redemption
    ON activation_settlement_transaction (redemption_id)
    WHERE status = 'confirmed';

COMMENT ON TABLE activation_settlement_transaction IS
    'Per-redemption onchain settlement attempts. CASCADE delete with activation_redemption. '
    'At most one row per redemption_id with status = confirmed (partial unique index).';

-- ---------------------------------------------------------------------------
-- updated_at triggers (match spend_experiences / spend_items style)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_sponsored_activation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sponsored_activation_updated_at_trigger ON sponsored_activation;
CREATE TRIGGER sponsored_activation_updated_at_trigger
    BEFORE UPDATE ON sponsored_activation
    FOR EACH ROW
    EXECUTE FUNCTION update_sponsored_activation_updated_at();

CREATE OR REPLACE FUNCTION update_activation_reward_item_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS activation_reward_item_updated_at_trigger ON activation_reward_item;
CREATE TRIGGER activation_reward_item_updated_at_trigger
    BEFORE UPDATE ON activation_reward_item
    FOR EACH ROW
    EXECUTE FUNCTION update_activation_reward_item_updated_at();

CREATE OR REPLACE FUNCTION update_activation_redemption_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS activation_redemption_updated_at_trigger ON activation_redemption;
CREATE TRIGGER activation_redemption_updated_at_trigger
    BEFORE UPDATE ON activation_redemption
    FOR EACH ROW
    EXECUTE FUNCTION update_activation_redemption_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: service_role only (no authenticated policies in v1)
-- ---------------------------------------------------------------------------
ALTER TABLE sponsored_activation ENABLE ROW LEVEL SECURITY;
ALTER TABLE activation_reward_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE activation_eligibility_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE activation_redemption ENABLE ROW LEVEL SECURITY;
ALTER TABLE activation_settlement_transaction ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on sponsored_activation"
    ON sponsored_activation
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access on activation_reward_item"
    ON activation_reward_item
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access on activation_eligibility_event"
    ON activation_eligibility_event
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access on activation_redemption"
    ON activation_redemption
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access on activation_settlement_transaction"
    ON activation_settlement_transaction
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
