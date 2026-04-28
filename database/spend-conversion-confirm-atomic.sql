-- Atomic spend pilot conversion: lock session + player, deduct points, insert point_conversions (`points_deducted`).
-- Retries: if a conversion row already exists for the session, returns it without deducting again.

CREATE OR REPLACE FUNCTION confirm_spend_conversion_atomic(
  p_spend_session_id UUID,
  p_user_id TEXT,
  p_wallet_address TEXT,
  p_spend_experience_id UUID,
  p_points_to_deduct INTEGER,
  p_usdc_amount NUMERIC(24, 8),
  p_treasury_wallet_address TEXT,
  p_user_wallet_address TEXT
) RETURNS TABLE (
  outcome TEXT,
  conversion_id UUID,
  player_total_points INTEGER
) AS $$
DECLARE
  v_session spend_sessions%ROWTYPE;
  v_existing_id UUID;
  v_player_id BIGINT;
  v_player_total INTEGER;
  v_funded_exists BOOLEAN;
BEGIN
  IF p_points_to_deduct IS NULL OR p_points_to_deduct <= 0 THEN
    RAISE EXCEPTION 'Invalid points amount';
  END IF;

  IF p_usdc_amount IS NULL OR p_usdc_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid USDC amount';
  END IF;

  SELECT *
  INTO v_session
  FROM spend_sessions
  WHERE id = p_spend_session_id
  FOR UPDATE;

  IF v_session.id IS NULL THEN
    RAISE EXCEPTION 'Spend session not found';
  END IF;

  IF v_session.user_id IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Session does not belong to this user';
  END IF;

  IF lower(trim(v_session.wallet_address)) IS DISTINCT FROM lower(trim(p_wallet_address)) THEN
    RAISE EXCEPTION 'Wallet does not match this session';
  END IF;

  IF v_session.spend_experience_id IS DISTINCT FROM p_spend_experience_id THEN
    RAISE EXCEPTION 'Spend experience mismatch';
  END IF;

  SELECT pc.id
  INTO v_existing_id
  FROM point_conversions pc
  WHERE pc.spend_session_id = p_spend_session_id
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    SELECT COALESCE(total_points, 0)::INTEGER
    INTO v_player_total
    FROM players
    WHERE lower(trim(wallet_address)) = lower(trim(p_wallet_address));

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Player not found';
    END IF;

    RETURN QUERY SELECT 'already_exists'::TEXT, v_existing_id, v_player_total;
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM point_conversions pc
    WHERE pc.spend_experience_id = p_spend_experience_id
      AND pc.user_id = p_user_id
      AND pc.status = 'funded'
  )
  INTO v_funded_exists;

  IF v_funded_exists THEN
    RAISE EXCEPTION 'Already converted for this spend experience';
  END IF;

  SELECT id, COALESCE(total_points, 0)::INTEGER
  INTO v_player_id, v_player_total
  FROM players
  WHERE lower(trim(wallet_address)) = lower(trim(p_wallet_address))
  FOR UPDATE;

  IF v_player_id IS NULL THEN
    RAISE EXCEPTION 'Player not found';
  END IF;

  IF v_player_total < p_points_to_deduct THEN
    RAISE EXCEPTION 'Insufficient points';
  END IF;

  UPDATE players
  SET total_points = COALESCE(total_points, 0) - p_points_to_deduct,
      updated_at = NOW()
  WHERE id = v_player_id
  RETURNING total_points::INTEGER INTO v_player_total;

  INSERT INTO point_conversions (
    spend_experience_id,
    spend_session_id,
    user_id,
    points_deducted,
    usdc_amount,
    status,
    treasury_wallet_address,
    user_wallet_address
  )
  VALUES (
    p_spend_experience_id,
    p_spend_session_id,
    p_user_id,
    p_points_to_deduct,
    p_usdc_amount,
    'points_deducted',
    p_treasury_wallet_address,
    p_user_wallet_address
  )
  RETURNING id INTO v_existing_id;

  RETURN QUERY SELECT 'created'::TEXT, v_existing_id, v_player_total;

EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Conversion already in progress';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION confirm_spend_conversion_atomic IS
  'Spend pilot: atomically deduct points and create point_conversions row (pending). Idempotent per session if row exists.';

-- Refund points and mark conversion failed (e.g. on-chain USDC send failed). Only when status is still `pending`.
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

  IF v_status IS DISTINCT FROM 'points_deducted' THEN
    RAISE EXCEPTION 'Conversion is not in points_deducted state';
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
  'Reverses a pending spend conversion: restores points to the user and marks the conversion as failed (PRD: rollback on funding failure / race).';
