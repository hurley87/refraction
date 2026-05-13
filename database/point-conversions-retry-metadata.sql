-- IRL-17: audit metadata for explicit conversion retries after safe refund.

ALTER TABLE point_conversions
  ADD COLUMN IF NOT EXISTS conversion_attempt_count INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS conversion_last_failure JSONB;

COMMENT ON COLUMN point_conversions.conversion_attempt_count IS
  'Number of point-deduction attempts for this session conversion (1 on first confirm; incremented on each explicit retry). Capped at MAX_SPEND_CONVERSION_POINT_DEDUCTION_ATTEMPTS in lib/spend-eligibility-messages.ts (must match retry RPC).';

COMMENT ON COLUMN point_conversions.conversion_last_failure IS
  'Last terminal failure metadata after a safe points refund (timestamps, phase, category, snippet) for support.';

-- Existing rows receive DEFAULT 1 from ADD COLUMN NOT NULL DEFAULT 1; no separate backfill needed.

-- After a refunded failure, deduct points again and reset the row for a new funding attempt (same conversion id / idempotency key).
CREATE OR REPLACE FUNCTION retry_spend_conversion_after_refund_atomic(
  p_spend_session_id UUID,
  p_user_id TEXT,
  p_wallet_address TEXT,
  p_spend_experience_id UUID,
  p_points_to_deduct INTEGER,
  p_usdc_amount NUMERIC(24, 8)
) RETURNS TABLE (
  outcome TEXT,
  conversion_id UUID,
  player_total_points INTEGER
) AS $$
DECLARE
  v_session spend_sessions%ROWTYPE;
  v_conv point_conversions%ROWTYPE;
  v_player_id BIGINT;
  v_player_total INTEGER;
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

  SELECT *
  INTO v_conv
  FROM point_conversions
  WHERE spend_session_id = p_spend_session_id
  FOR UPDATE;

  IF v_conv.id IS NULL THEN
    RAISE EXCEPTION 'No conversion for session';
  END IF;

  IF v_conv.status IS DISTINCT FROM 'failed' THEN
    RAISE EXCEPTION 'Conversion is not in a retryable failed state';
  END IF;

  -- Cap must match MAX_SPEND_CONVERSION_POINT_DEDUCTION_ATTEMPTS in lib/spend-eligibility-messages.ts
  IF v_conv.conversion_attempt_count >= 4 THEN
    RAISE EXCEPTION 'Conversion retry limit reached';
  END IF;

  IF v_conv.user_id IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Conversion does not belong to this user';
  END IF;

  IF v_conv.points_deducted::INTEGER IS DISTINCT FROM p_points_to_deduct THEN
    RAISE EXCEPTION 'Points amount mismatch';
  END IF;

  IF v_conv.usdc_amount IS DISTINCT FROM p_usdc_amount THEN
    RAISE EXCEPTION 'USDC amount mismatch';
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

  UPDATE point_conversions
  SET
    conversion_attempt_count = conversion_attempt_count + 1,
    status = 'points_deducted',
    failed_reason = NULL,
    completed_at = NULL,
    funding_tx_hash = NULL,
    explorer_tx_url = NULL,
    updated_at = NOW()
  WHERE id = v_conv.id;

  RETURN QUERY SELECT 'retried'::TEXT, v_conv.id, v_player_total;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION retry_spend_conversion_after_refund_atomic IS
  'Spend pilot: after a safe refund to status failed, deduct points again and reset the same conversion row for an explicit user retry (IRL-17).';

-- Ensure new inserts set attempt count explicitly (default covers, but keep function self-documenting).
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
    user_wallet_address,
    spend_rail,
    network,
    asset_symbol,
    conversion_attempt_count
  )
  VALUES (
    p_spend_experience_id,
    p_spend_session_id,
    p_user_id,
    p_points_to_deduct,
    p_usdc_amount,
    'points_deducted',
    p_treasury_wallet_address,
    p_user_wallet_address,
    COALESCE(v_session.spend_rail, 'base_usdc'),
    CASE COALESCE(v_session.spend_rail, 'base_usdc')
      WHEN 'stellar_usdc' THEN 'Stellar'
      ELSE 'Base'
    END,
    'USDC',
    1
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
