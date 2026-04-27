-- Spend pilot: admin-configured spend experiences (IRL Spend Pilot PRD §7)
-- Apply after core tables exist. Optional event_id links to external Dice event ids (text).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS spend_experiences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_id TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'ended')),
    -- Points required per 1 USDC (e.g. 1000 => 1000 points = $1 USDC)
    points_to_usdc_rate NUMERIC(24, 8) NOT NULL
        CHECK (points_to_usdc_rate > 0),
    max_usdc_per_user NUMERIC(24, 8) NOT NULL
        CHECK (max_usdc_per_user > 0),
    treasury_wallet_address TEXT NOT NULL,
    receiving_wallet_address TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT spend_experiences_time_window CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_spend_experiences_status
    ON spend_experiences (status);

CREATE INDEX IF NOT EXISTS idx_spend_experiences_active_window
    ON spend_experiences (start_time, end_time)
    WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_spend_experiences_event_id
    ON spend_experiences (event_id)
    WHERE event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_spend_experiences_created_at
    ON spend_experiences (created_at DESC);

COMMENT ON TABLE spend_experiences IS 'Admin spend pilot configuration: conversion rate, caps, wallets, active window.';

CREATE OR REPLACE FUNCTION update_spend_experiences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS spend_experiences_updated_at_trigger ON spend_experiences;
CREATE TRIGGER spend_experiences_updated_at_trigger
    BEFORE UPDATE ON spend_experiences
    FOR EACH ROW
    EXECUTE FUNCTION update_spend_experiences_updated_at();

ALTER TABLE spend_experiences ENABLE ROW LEVEL SECURITY;

-- Authenticated product flows can read active experiences; service role bypasses RLS.
CREATE POLICY "Allow public read of active spend experiences"
    ON spend_experiences
    FOR SELECT
    USING (status = 'active');

CREATE POLICY "Allow service role full access spend experiences"
    ON spend_experiences
    USING (true)
    WITH CHECK (true);
