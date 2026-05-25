-- IRL-58: Atomic settlement confirm/fail with redemption status sync (no usdc_settled_total).

CREATE OR REPLACE FUNCTION confirm_activation_settlement_atomic(
  p_settlement_id UUID,
  p_tx_hash TEXT
)
RETURNS TEXT AS $$
DECLARE
  v_redemption_id UUID;
  v_status TEXT;
BEGIN
  SELECT redemption_id, status
  INTO v_redemption_id, v_status
  FROM activation_settlement_transaction
  WHERE id = p_settlement_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SETTLEMENT_NOT_FOUND';
  END IF;

  IF v_status = 'confirmed' THEN
    RETURN 'already_confirmed';
  END IF;

  UPDATE activation_settlement_transaction
  SET
    status = 'confirmed',
    tx_hash = trim(p_tx_hash),
    confirmed_at = COALESCE(confirmed_at, NOW())
  WHERE id = p_settlement_id
    AND status IN ('queued', 'submitted');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SETTLEMENT_INVALID_STATE';
  END IF;

  UPDATE activation_redemption
  SET status = 'settlement_confirmed', updated_at = NOW()
  WHERE id = v_redemption_id
    AND status = 'settlement_pending';

  RETURN 'confirmed';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fail_activation_settlement_atomic(
  p_settlement_id UUID,
  p_last_error_code TEXT
)
RETURNS TEXT AS $$
DECLARE
  v_redemption_id UUID;
  v_status TEXT;
BEGIN
  SELECT redemption_id, status
  INTO v_redemption_id, v_status
  FROM activation_settlement_transaction
  WHERE id = p_settlement_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SETTLEMENT_NOT_FOUND';
  END IF;

  IF v_status = 'confirmed' THEN
    RETURN 'already_confirmed';
  END IF;

  IF v_status = 'failed' THEN
    RETURN 'already_failed';
  END IF;

  UPDATE activation_settlement_transaction
  SET
    status = 'failed',
    last_error_code = left(trim(p_last_error_code), 128),
    submission_attempt = submission_attempt + 1
  WHERE id = p_settlement_id
    AND status IN ('queued', 'submitted', 'retrying', 'not_started');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SETTLEMENT_INVALID_STATE';
  END IF;

  UPDATE activation_redemption
  SET status = 'settlement_failed', updated_at = NOW()
  WHERE id = v_redemption_id
    AND status = 'settlement_pending';

  RETURN 'failed';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION confirm_activation_settlement_atomic IS
  'IRL-58: Marks settlement confirmed and redemption settlement_confirmed. Idempotent when already confirmed.';

COMMENT ON FUNCTION fail_activation_settlement_atomic IS
  'IRL-58: Marks settlement failed and redemption settlement_failed. No-op when already confirmed.';
