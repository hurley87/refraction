-- IRL-20: `needs_review` conversion status, funding idempotency key mutability, refund RPC for
-- definitive failures after `funding_pending` / `needs_review`.
--
-- Idempotency: app sets `point_conversions.idempotency_key` to `fund_user:<conversion_id>` once
-- after `confirm_spend_conversion_atomic`, before treasury funding. Uniqueness is enforced by
-- `idx_point_conversions_idempotency` plus one row per `spend_session_id`.

-- ---------------------------------------------------------------------------
-- Status CHECK: add `needs_review`
-- ---------------------------------------------------------------------------
ALTER TABLE point_conversions DROP CONSTRAINT IF EXISTS point_conversions_status_check;

ALTER TABLE point_conversions
  ADD CONSTRAINT point_conversions_status_check
  CHECK (status IN (
    'pending',
    'points_deducted',
    'funding_pending',
    'needs_review',
    'funded',
    'failed'
  ));

COMMENT ON CONSTRAINT point_conversions_status_check ON point_conversions IS
  'Conversion lifecycle including IRL-20 needs_review for ambiguous funding outcomes.';

-- ---------------------------------------------------------------------------
-- Ledger mutability: allow first-time set of idempotency_key (NULL → non-NULL only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_point_conversions_ledger_mutability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  funding_changed BOOLEAN := OLD.funding_tx_hash IS DISTINCT FROM NEW.funding_tx_hash;
  explorer_changed BOOLEAN := OLD.explorer_tx_url IS DISTINCT FROM NEW.explorer_tx_url;
BEGIN
  NEW.updated_at := NOW();

  IF OLD.id IS DISTINCT FROM NEW.id
     OR OLD.spend_experience_id IS DISTINCT FROM NEW.spend_experience_id
     OR OLD.spend_session_id IS DISTINCT FROM NEW.spend_session_id
     OR OLD.user_id IS DISTINCT FROM NEW.user_id
     OR OLD.points_deducted IS DISTINCT FROM NEW.points_deducted
     OR OLD.usdc_amount IS DISTINCT FROM NEW.usdc_amount
     OR OLD.treasury_wallet_address IS DISTINCT FROM NEW.treasury_wallet_address
     OR OLD.user_wallet_address IS DISTINCT FROM NEW.user_wallet_address
     OR OLD.spend_rail IS DISTINCT FROM NEW.spend_rail
     OR OLD.network IS DISTINCT FROM NEW.network
     OR OLD.asset_symbol IS DISTINCT FROM NEW.asset_symbol
     OR OLD.created_at IS DISTINCT FROM NEW.created_at
  THEN
    RAISE EXCEPTION 'point_conversions: snapshot columns cannot be changed after insert';
  END IF;

  IF OLD.idempotency_key IS DISTINCT FROM NEW.idempotency_key THEN
    IF NOT (
      OLD.idempotency_key IS NULL
      AND NEW.idempotency_key IS NOT NULL
      AND trim(NEW.idempotency_key) <> ''
    ) THEN
      RAISE EXCEPTION 'point_conversions: idempotency_key can only be set once from NULL';
    END IF;
  END IF;

  IF funding_changed THEN
    IF OLD.funding_tx_hash IS NULL THEN
      NULL;
    ELSIF OLD.funding_tx_hash LIKE 'pending:%' AND COALESCE(NEW.funding_tx_hash, '') NOT LIKE 'pending:%' THEN
      NULL;
    ELSIF OLD.funding_tx_hash LIKE 'pending:%' AND NEW.funding_tx_hash LIKE 'pending:%'
          AND OLD.funding_tx_hash IS DISTINCT FROM NEW.funding_tx_hash THEN
      RAISE EXCEPTION 'point_conversions: funding pending reference cannot change';
    ELSIF OLD.funding_tx_hash LIKE 'pending:%' AND NEW.funding_tx_hash IS NULL THEN
      RAISE EXCEPTION 'point_conversions: funding_tx_hash cannot be cleared';
    ELSIF NEW.funding_tx_hash IS DISTINCT FROM OLD.funding_tx_hash THEN
      RAISE EXCEPTION 'point_conversions: funding_tx_hash cannot be overwritten';
    END IF;
  END IF;

  IF explorer_changed THEN
    IF OLD.explorer_tx_url IS NULL THEN
      NULL;
    ELSIF OLD.explorer_tx_url IS DISTINCT FROM NEW.explorer_tx_url THEN
      RAISE EXCEPTION 'point_conversions: explorer_tx_url cannot be changed after it is set';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Refund: allow definitive unwind from funding_pending / needs_review (caller must ensure
-- no successful funding can still land — e.g. receipt `reverted` or pre-submit failure).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION refund_spend_conversion_on_funding_failure(
  p_conversion_id UUID,
  p_user_id TEXT,
  p_spend_session_id UUID,
  p_points_to_refund INTEGER,
  p_failed_reason TEXT
) RETURNS VOID AS $$
DECLARE
  v_status VARCHAR(32);
  v_session TEXT;
  v_user TEXT;
  v_points NUMERIC(24, 8);
  v_player_id BIGINT;
BEGIN
  IF p_points_to_refund IS NULL OR p_points_to_refund <= 0 THEN
    RAISE EXCEPTION 'Invalid refund amount';
  END IF;

  SELECT status, user_id, spend_session_id, points_deducted
  INTO v_status, v_user, v_session, v_points
  FROM point_conversions
  WHERE id = p_conversion_id
  FOR UPDATE;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Conversion not found';
  END IF;

  IF v_user IS DISTINCT FROM p_user_id OR v_session::TEXT IS DISTINCT FROM p_spend_session_id::TEXT THEN
    RAISE EXCEPTION 'Conversion mismatch';
  END IF;

  IF v_status NOT IN ('points_deducted', 'funding_pending', 'needs_review') THEN
    RAISE EXCEPTION 'Conversion is not refundable from this state';
  END IF;

  IF v_points::INTEGER IS DISTINCT FROM p_points_to_refund THEN
    RAISE EXCEPTION 'Points amount mismatch';
  END IF;

  SELECT id
  INTO v_player_id
  FROM players
  WHERE lower(trim(wallet_address)) = (
    SELECT lower(trim(wallet_address)) FROM spend_sessions WHERE id = p_spend_session_id
  )
  FOR UPDATE;

  IF v_player_id IS NULL THEN
    RAISE EXCEPTION 'Player not found for session';
  END IF;

  UPDATE players
  SET total_points = COALESCE(total_points, 0) + p_points_to_refund,
      updated_at = NOW()
  WHERE id = v_player_id;

  UPDATE point_conversions
  SET
    status = 'failed',
    failed_reason = left(
      COALESCE(p_failed_reason, 'funding_transaction_failed'),
      256
    ),
    completed_at = NOW()
  WHERE id = p_conversion_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refund_spend_conversion_on_funding_failure IS
  'Reverses spend conversion funding: restores points and marks conversion failed when funding '
  'definitively cannot succeed (IRL-20: from points_deducted, funding_pending, or needs_review).';
