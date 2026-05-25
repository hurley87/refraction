-- IRL-55: Atomic swipe-to-redeem — ready_to_redeem → settlement_pending, enqueue one settlement row.
-- Idempotent when redemption is already in a post-swipe settlement state.

CREATE OR REPLACE FUNCTION swipe_activation_redeem_atomic(
  p_redemption_id UUID,
  p_player_id BIGINT,
  p_wallet_address TEXT,
  p_max_swipe_redeems_per_user INTEGER,
  p_max_swipe_redeems_per_user_per_day INTEGER
) RETURNS TABLE (
  outcome TEXT
) AS $$
DECLARE
  v_red activation_redemption%ROWTYPE;
  v_act sponsored_activation%ROWTYPE;
  v_item activation_reward_item%ROWTYPE;
  v_lifetime_swipes INTEGER;
  v_daily_swipes INTEGER;
  v_nt INTEGER;
  v_inflight NUMERIC(24, 8);
  v_budget_cap NUMERIC(24, 8);
  v_settled NUMERIC(24, 8);
  v_snapshot NUMERIC(24, 8);
BEGIN
  IF p_wallet_address IS NULL OR length(trim(p_wallet_address)) = 0 THEN
    RAISE EXCEPTION 'ACTIVATION_SWIPE_WALLET_REQUIRED';
  END IF;

  SELECT *
  INTO v_red
  FROM activation_redemption
  WHERE id = p_redemption_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ACTIVATION_SWIPE_NOT_FOUND';
  END IF;

  IF v_red.user_id IS DISTINCT FROM p_player_id THEN
    RAISE EXCEPTION 'ACTIVATION_SWIPE_PLAYER_MISMATCH';
  END IF;

  IF v_red.status IN ('settlement_pending', 'settlement_confirmed', 'settlement_failed') THEN
    RETURN QUERY SELECT 'already_redeemed'::TEXT;
    RETURN;
  END IF;

  IF v_red.status IS DISTINCT FROM 'ready_to_redeem' THEN
    RAISE EXCEPTION 'ACTIVATION_SWIPE_INVALID_STATUS';
  END IF;

  IF v_red.usdc_amount_snapshot IS NULL OR v_red.usdc_amount_snapshot <= 0 THEN
    RAISE EXCEPTION 'ACTIVATION_SWIPE_MISSING_USDC_SNAPSHOT';
  END IF;

  v_snapshot := v_red.usdc_amount_snapshot;

  SELECT *
  INTO v_act
  FROM sponsored_activation
  WHERE id = v_red.activation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ACTIVATION_SWIPE_ACTIVATION_NOT_FOUND';
  END IF;

  IF NOW() < v_act.starts_at OR NOW() >= v_act.ends_at THEN
    UPDATE activation_redemption
    SET
      status = 'expired',
      cancelled_reason = 'activation_window_ended',
      updated_at = NOW()
    WHERE id = v_red.id;

    RETURN QUERY SELECT 'expired'::TEXT;
    RETURN;
  END IF;

  IF v_act.status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'ACTIVATION_SWIPE_NOT_LIVE';
  END IF;

  SELECT COUNT(*)::INTEGER
  INTO v_lifetime_swipes
  FROM activation_redemption ar
  WHERE ar.activation_id = v_act.id
    AND ar.user_id = v_red.user_id
    AND ar.redeemed_at IS NOT NULL;

  IF v_lifetime_swipes >= p_max_swipe_redeems_per_user THEN
    RAISE EXCEPTION 'ACTIVATION_SWIPE_LIFETIME_USER_LIMIT_EXCEEDED';
  END IF;

  SELECT COUNT(*)::INTEGER
  INTO v_daily_swipes
  FROM activation_redemption ar
  WHERE ar.activation_id = v_act.id
    AND ar.user_id = v_red.user_id
    AND ar.redeemed_at IS NOT NULL
    AND (ar.redeemed_at AT TIME ZONE 'UTC')::date =
        (NOW() AT TIME ZONE 'UTC')::date;

  IF v_daily_swipes >= p_max_swipe_redeems_per_user_per_day THEN
    RAISE EXCEPTION 'ACTIVATION_SWIPE_DAILY_USER_LIMIT_EXCEEDED';
  END IF;

  SELECT *
  INTO v_item
  FROM activation_reward_item
  WHERE id = v_red.reward_item_id
  FOR UPDATE;

  IF NOT FOUND OR v_item.activation_id IS DISTINCT FROM v_act.id THEN
    RAISE EXCEPTION 'ACTIVATION_SWIPE_REWARD_ITEM_MISMATCH';
  END IF;

  SELECT COUNT(*)::INTEGER
  INTO v_nt
  FROM activation_redemption ar
  WHERE ar.activation_id = v_red.activation_id
    AND ar.user_id = v_red.user_id
    AND ar.reward_item_id = v_red.reward_item_id
    AND ar.status NOT IN (
      'redeemed',
      'settlement_confirmed',
      'cancelled',
      'expired',
      'settlement_failed'
    );

  IF v_nt > v_item.max_per_user THEN
    RAISE EXCEPTION 'ACTIVATION_SWIPE_MAX_PER_USER';
  END IF;

  IF v_act.max_usdc_budget IS NOT NULL THEN
    v_settled := v_act.usdc_settled_total;
    SELECT COALESCE(SUM(amount), 0)
    INTO v_inflight
    FROM activation_settlement_transaction st
    WHERE st.activation_id = v_act.id
      AND st.status IN ('not_started', 'queued', 'submitted', 'retrying');

    v_budget_cap := v_act.max_usdc_budget;

    IF (v_settled + v_inflight + v_snapshot) > v_budget_cap THEN
      RAISE EXCEPTION 'ACTIVATION_SWIPE_BUDGET_EXCEEDED';
    END IF;
  END IF;

  PERFORM 1
  FROM players
  WHERE id = p_player_id
    AND lower(trim(wallet_address)) = lower(trim(p_wallet_address))
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ACTIVATION_SWIPE_PLAYER_WALLET_MISMATCH';
  END IF;

  UPDATE activation_redemption
  SET
    status = 'settlement_pending',
    redeemed_at = COALESCE(redeemed_at, NOW()),
    updated_at = NOW()
  WHERE id = v_red.id;

  INSERT INTO activation_settlement_transaction (
    redemption_id,
    activation_id,
    settlement_rail,
    status,
    amount,
    from_wallet_address,
    to_wallet_address,
    queued_at
  ) VALUES (
    v_red.id,
    v_act.id,
    v_act.settlement_rail,
    'queued',
    v_snapshot,
    v_act.campaign_wallet_address,
    v_act.venue_settlement_wallet_address,
    NOW()
  );

  RETURN QUERY SELECT 'created'::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION swipe_activation_redeem_atomic IS
  'IRL-55: Moves activation_redemption from ready_to_redeem to settlement_pending, inserts one queued '
  'activation_settlement_transaction. Idempotent for settlement_pending and later settlement outcomes. '
  'Lazy-expires to expired when activation time window is invalid. Enforces swipe rate limits (redeemed_at), '
  'max_per_user, and optional USDC budget reservation via in-flight settlement sums.';
