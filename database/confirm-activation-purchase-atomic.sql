-- IRL-54: Atomic confirm purchase for sponsored activations (points + redemption + cap increment).
-- Idempotent when redemption is already past `available` (no second deduct, no cap bump).

CREATE OR REPLACE FUNCTION confirm_activation_purchase_atomic(
  p_redemption_id UUID,
  p_player_id BIGINT,
  p_wallet_address TEXT,
  p_max_purchase_confirms_per_user INTEGER,
  p_max_purchase_confirms_per_user_per_day INTEGER
) RETURNS TABLE (
  outcome TEXT,
  player_total_points INTEGER
) AS $$
DECLARE
  v_red activation_redemption%ROWTYPE;
  v_act sponsored_activation%ROWTYPE;
  v_item activation_reward_item%ROWTYPE;
  v_player_total INTEGER;
  v_player_row_id BIGINT;
  v_points INTEGER;
  v_nt INTEGER;
  v_lifetime_confirms INTEGER;
  v_daily_confirms INTEGER;
BEGIN
  IF p_wallet_address IS NULL OR length(trim(p_wallet_address)) = 0 THEN
    RAISE EXCEPTION 'ACTIVATION_PURCHASE_WALLET_REQUIRED';
  END IF;

  SELECT *
  INTO v_red
  FROM activation_redemption
  WHERE id = p_redemption_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ACTIVATION_PURCHASE_NOT_FOUND';
  END IF;

  IF v_red.user_id IS DISTINCT FROM p_player_id THEN
    RAISE EXCEPTION 'ACTIVATION_PURCHASE_PLAYER_MISMATCH';
  END IF;

  -- Idempotent: already confirmed or later success path (no mutation).
  IF v_red.status IN (
    'ready_to_redeem',
    'redeemed',
    'settlement_pending',
    'settlement_confirmed',
    'settlement_failed',
    'purchase_confirmed'
  ) THEN
    SELECT COALESCE(total_points, 0)::INTEGER
    INTO v_player_total
    FROM players
    WHERE id = p_player_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'ACTIVATION_PURCHASE_PLAYER_NOT_FOUND';
    END IF;

    RETURN QUERY SELECT 'already_confirmed'::TEXT, v_player_total;
    RETURN;
  END IF;

  IF v_red.status IS DISTINCT FROM 'available' THEN
    RAISE EXCEPTION 'ACTIVATION_PURCHASE_INVALID_STATUS';
  END IF;

  SELECT *
  INTO v_act
  FROM sponsored_activation
  WHERE id = v_red.activation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ACTIVATION_PURCHASE_ACTIVATION_NOT_FOUND';
  END IF;

  -- Per-user purchase caps (activation eligibility config), evaluated after activation row lock
  -- so concurrent confirms for the same user cannot race past limits (IRL-54).
  SELECT COUNT(*)::INTEGER
  INTO v_lifetime_confirms
  FROM activation_redemption ar
  WHERE ar.activation_id = v_act.id
    AND ar.user_id = v_red.user_id
    AND ar.purchase_confirmed_at IS NOT NULL;

  IF v_lifetime_confirms >= p_max_purchase_confirms_per_user THEN
    RAISE EXCEPTION 'ACTIVATION_PURCHASE_LIFETIME_USER_LIMIT_EXCEEDED';
  END IF;

  SELECT COUNT(*)::INTEGER
  INTO v_daily_confirms
  FROM activation_redemption ar
  WHERE ar.activation_id = v_act.id
    AND ar.user_id = v_red.user_id
    AND ar.purchase_confirmed_at IS NOT NULL
    AND (ar.purchase_confirmed_at AT TIME ZONE 'UTC')::date =
        (now() AT TIME ZONE 'UTC')::date;

  IF v_daily_confirms >= p_max_purchase_confirms_per_user_per_day THEN
    RAISE EXCEPTION 'ACTIVATION_PURCHASE_DAILY_USER_LIMIT_EXCEEDED';
  END IF;

  SELECT *
  INTO v_item
  FROM activation_reward_item
  WHERE id = v_red.reward_item_id
  FOR UPDATE;

  IF NOT FOUND OR v_item.activation_id IS DISTINCT FROM v_act.id THEN
    RAISE EXCEPTION 'ACTIVATION_PURCHASE_REWARD_ITEM_MISMATCH';
  END IF;

  IF NOT v_item.is_active THEN
    RAISE EXCEPTION 'ACTIVATION_PURCHASE_REWARD_INACTIVE';
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
    RAISE EXCEPTION 'ACTIVATION_PURCHASE_MAX_PER_USER';
  END IF;

  IF v_act.max_redemptions IS NOT NULL
     AND v_act.redemption_count_confirmed >= v_act.max_redemptions THEN
    RAISE EXCEPTION 'ACTIVATION_PURCHASE_CAP_EXCEEDED';
  END IF;

  v_points := v_item.points_cost::INTEGER;
  IF v_points IS NULL OR v_points < 0 THEN
    RAISE EXCEPTION 'ACTIVATION_PURCHASE_INVALID_POINTS_COST';
  END IF;

  SELECT id, COALESCE(total_points, 0)::INTEGER
  INTO v_player_row_id, v_player_total
  FROM players
  WHERE id = p_player_id
    AND lower(trim(wallet_address)) = lower(trim(p_wallet_address))
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ACTIVATION_PURCHASE_PLAYER_MISMATCH';
  END IF;

  IF v_points > 0 THEN
    IF v_player_total < v_points THEN
      RAISE EXCEPTION 'ACTIVATION_PURCHASE_INSUFFICIENT_POINTS';
    END IF;

    UPDATE players
    SET
      total_points = COALESCE(total_points, 0) - v_points,
      updated_at = NOW()
    WHERE id = v_player_row_id
    RETURNING total_points::INTEGER INTO v_player_total;
  END IF;

  UPDATE sponsored_activation
  SET
    redemption_count_confirmed = redemption_count_confirmed + 1,
    updated_at = NOW()
  WHERE id = v_act.id;

  UPDATE activation_redemption
  SET
    status = 'ready_to_redeem',
    points_spent = v_points,
    usdc_amount_snapshot = v_item.usdc_amount,
    purchase_confirmed_at = COALESCE(purchase_confirmed_at, NOW()),
    updated_at = NOW()
  WHERE id = v_red.id;

  RETURN QUERY SELECT 'created'::TEXT, v_player_total;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION confirm_activation_purchase_atomic IS
  'IRL-54: Atomically deduct points (when points_cost > 0), bump activation redemption_count_confirmed, '
  'and move activation_redemption from available to ready_to_redeem. Idempotent for later statuses. '
  'Enforces per-user lifetime and UTC-daily purchase caps after locking the activation row.';
