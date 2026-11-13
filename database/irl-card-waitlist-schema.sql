-- IRL Card pre-launch waitlist (three-month campaign landing page).
-- One row per email. Signed-in members link to their existing player; signup
-- never creates a player. Welcome email and Campaign Monitor list sync are
-- tracked per row so failures can be retried without duplicate sends.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS irl_card_waitlist_signups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    email_normalized TEXT NOT NULL,

    country_id UUID NOT NULL REFERENCES countries(id) ON DELETE RESTRICT,
    geo_city_id UUID NOT NULL REFERENCES geo_cities(id) ON DELETE RESTRICT,
    country_iso2 CHAR(2) NOT NULL,
    city_name TEXT NOT NULL,

    already_uses_irl BOOLEAN NOT NULL,
    player_id BIGINT REFERENCES players(id) ON DELETE SET NULL,
    privy_user_id TEXT,

    marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
    consent_at TIMESTAMPTZ,

    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_term TEXT,
    utm_content TEXT,
    source TEXT,
    source_ref TEXT,
    landing_page TEXT,
    referrer TEXT,

    welcome_email_status VARCHAR(16) NOT NULL DEFAULT 'pending'
        CHECK (welcome_email_status IN ('pending', 'sending', 'sent', 'failed')),
    welcome_email_attempts INTEGER NOT NULL DEFAULT 0,
    welcome_email_sent_at TIMESTAMPTZ,
    welcome_email_last_error TEXT,
    welcome_email_claimed_at TIMESTAMPTZ,

    list_sync_status VARCHAR(16) NOT NULL DEFAULT 'not_requested'
        CHECK (list_sync_status IN ('not_requested', 'pending', 'synced', 'failed')),
    list_sync_attempts INTEGER NOT NULL DEFAULT 0,
    list_synced_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT irl_card_waitlist_signups_email_normalized_key UNIQUE (email_normalized)
);

CREATE INDEX IF NOT EXISTS irl_card_waitlist_signups_location_idx
    ON irl_card_waitlist_signups (country_id, geo_city_id);
CREATE INDEX IF NOT EXISTS irl_card_waitlist_signups_already_uses_irl_idx
    ON irl_card_waitlist_signups (already_uses_irl);
CREATE INDEX IF NOT EXISTS irl_card_waitlist_signups_welcome_status_idx
    ON irl_card_waitlist_signups (welcome_email_status);
CREATE INDEX IF NOT EXISTS irl_card_waitlist_signups_list_sync_status_idx
    ON irl_card_waitlist_signups (list_sync_status);
CREATE INDEX IF NOT EXISTS irl_card_waitlist_signups_player_id_idx
    ON irl_card_waitlist_signups (player_id);

CREATE OR REPLACE FUNCTION update_irl_card_waitlist_signups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS irl_card_waitlist_signups_updated_at_trigger ON irl_card_waitlist_signups;
CREATE TRIGGER irl_card_waitlist_signups_updated_at_trigger
    BEFORE UPDATE ON irl_card_waitlist_signups
    FOR EACH ROW
    EXECUTE FUNCTION update_irl_card_waitlist_signups_updated_at();

-- Atomically claims the welcome send for one signup. Returns the row only to
-- the caller that wins; a stale 'sending' claim (crashed worker) can be
-- reclaimed after p_stale_after.
CREATE OR REPLACE FUNCTION claim_irl_card_welcome_send(
    p_id UUID,
    p_max_attempts INTEGER DEFAULT 5,
    p_stale_after INTERVAL DEFAULT INTERVAL '10 minutes'
)
RETURNS SETOF irl_card_waitlist_signups
LANGUAGE sql
AS $$
    UPDATE irl_card_waitlist_signups
    SET welcome_email_status = 'sending',
        welcome_email_attempts = welcome_email_attempts + 1,
        welcome_email_claimed_at = NOW()
    WHERE id = p_id
      AND welcome_email_attempts < p_max_attempts
      AND (
        welcome_email_status IN ('pending', 'failed')
        OR (
          welcome_email_status = 'sending'
          AND welcome_email_claimed_at < NOW() - p_stale_after
        )
      )
    RETURNING *;
$$;

ALTER TABLE irl_card_waitlist_signups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on irl_card_waitlist_signups"
    ON irl_card_waitlist_signups;
CREATE POLICY "Service role full access on irl_card_waitlist_signups"
    ON irl_card_waitlist_signups
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
