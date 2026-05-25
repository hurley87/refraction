-- IRL-55: User-initiated cancel from ready_to_redeem only (no settlement row yet).

CREATE OR REPLACE FUNCTION cancel_activation_redemption_atomic(
  p_redemption_id UUID,
  p_player_id BIGINT,
  p_wallet_address TEXT,
  p_reason TEXT
) RETURNS TABLE (
  outcome TEXT
) AS $$
DECLARE
  v_red activation_redemption%ROWTYPE;
  v_reason TEXT;
BEGIN
  IF p_wallet_address IS NULL OR length(trim(p_wallet_address)) = 0 THEN
    RAISE EXCEPTION 'ACTIVATION_CANCEL_WALLET_REQUIRED';
  END IF;

  SELECT *
  INTO v_red
  FROM activation_redemption
  WHERE id = p_redemption_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ACTIVATION_CANCEL_NOT_FOUND';
  END IF;

  IF v_red.user_id IS DISTINCT FROM p_player_id THEN
    RAISE EXCEPTION 'ACTIVATION_CANCEL_PLAYER_MISMATCH';
  END IF;

  IF v_red.status = 'cancelled' THEN
    RETURN QUERY SELECT 'already_cancelled'::TEXT;
    RETURN;
  END IF;

  IF v_red.status IS DISTINCT FROM 'ready_to_redeem' THEN
    RAISE EXCEPTION 'ACTIVATION_CANCEL_INVALID_STATUS';
  END IF;

  PERFORM 1
  FROM players
  WHERE id = p_player_id
    AND lower(trim(wallet_address)) = lower(trim(p_wallet_address))
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ACTIVATION_CANCEL_PLAYER_WALLET_MISMATCH';
  END IF;

  v_reason := NULLIF(trim(COALESCE(p_reason, '')), '');
  IF v_reason IS NULL THEN
    v_reason := 'user_cancelled';
  END IF;

  UPDATE activation_redemption
  SET
    status = 'cancelled',
    cancelled_reason = v_reason,
    updated_at = NOW()
  WHERE id = v_red.id;

  RETURN QUERY SELECT 'cancelled'::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cancel_activation_redemption_atomic IS
  'IRL-55: Cancels activation_redemption from ready_to_redeem to cancelled. Idempotent when already cancelled.';
