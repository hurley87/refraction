-- IRL-60: USDC budget at confirm, finalize usdc_settled_total on settlement confirm,
-- retry/exhaust failure policy (no next_retry_at), promote retrying→queued, Stellar submit RPC,
-- admin manual retry reset.

-- ---------------------------------------------------------------------------
-- confirm_activation_purchase_atomic: block when USDC budget would be exceeded
-- ---------------------------------------------------------------------------
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
  v_inflight NUMERIC(24, 8);
  v_committed NUMERIC(24, 8);
  v_this_usdc NUMERIC(24, 8);
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

  v_this_usdc := COALESCE(v_item.usdc_amount, 0);
  IF v_act.max_usdc_budget IS NOT NULL AND v_this_usdc > 0 THEN
    SELECT COALESCE(SUM(st.amount), 0)
    INTO v_inflight
    FROM activation_settlement_transaction st
    WHERE st.activation_id = v_act.id
      AND st.status IN ('not_started', 'queued', 'submitted', 'retrying');

    SELECT COALESCE(SUM(ar.usdc_amount_snapshot), 0)
    INTO v_committed
    FROM activation_redemption ar
    WHERE ar.activation_id = v_act.id
      AND ar.id IS DISTINCT FROM v_red.id
      AND ar.status IN ('purchase_confirmed', 'ready_to_redeem')
      AND ar.usdc_amount_snapshot IS NOT NULL
      AND ar.usdc_amount_snapshot > 0;

    IF (v_act.usdc_settled_total + v_inflight + v_committed + v_this_usdc) > v_act.max_usdc_budget THEN
      RAISE EXCEPTION 'ACTIVATION_PURCHASE_USDC_BUDGET_EXCEEDED';
    END IF;
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
  'IRL-54 + IRL-60: Atomically confirm purchase; optional USDC budget cap (settled + inflight settlements + '
  'committed redemption snapshots + this reward) vs max_usdc_budget.';

-- ---------------------------------------------------------------------------
-- confirm_activation_settlement_atomic: bump usdc_settled_total; optional privy + submitted_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION confirm_activation_settlement_atomic(
  p_settlement_id UUID,
  p_tx_hash TEXT,
  p_privy_transaction_id TEXT DEFAULT NULL,
  p_preserve_submitted_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  v_redemption_id UUID;
  v_status TEXT;
  v_amount NUMERIC(24, 8);
  v_activation_id UUID;
  v_trim_privy TEXT;
  v_rcount INTEGER;
BEGIN
  SELECT redemption_id, status, amount, activation_id
  INTO v_redemption_id, v_status, v_amount, v_activation_id
  FROM activation_settlement_transaction
  WHERE id = p_settlement_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SETTLEMENT_NOT_FOUND';
  END IF;

  IF v_status = 'confirmed' THEN
    RETURN 'already_confirmed';
  END IF;

  v_trim_privy := NULLIF(trim(COALESCE(p_privy_transaction_id, '')), '');

  UPDATE activation_settlement_transaction
  SET
    status = 'confirmed',
    tx_hash = trim(p_tx_hash),
    privy_transaction_id = CASE
      WHEN v_trim_privy IS NOT NULL THEN left(v_trim_privy, 512)
      ELSE privy_transaction_id
    END,
    confirmed_at = COALESCE(confirmed_at, NOW()),
    submitted_at = COALESCE(
      p_preserve_submitted_at,
      submitted_at,
      NOW()
    ),
    last_error_code = NULL
  WHERE id = p_settlement_id
    AND status IN ('queued', 'submitted');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SETTLEMENT_INVALID_STATE';
  END IF;

  UPDATE activation_redemption
  SET status = 'settlement_confirmed', updated_at = NOW()
  WHERE id = v_redemption_id
    AND status = 'settlement_pending';

  GET DIAGNOSTICS v_rcount = ROW_COUNT;
  IF v_rcount = 0 THEN
    RAISE EXCEPTION 'REDEMPTION_SETTLEMENT_STATE_MISMATCH';
  END IF;

  UPDATE sponsored_activation
  SET
    usdc_settled_total = usdc_settled_total + v_amount,
    updated_at = NOW()
  WHERE id = v_activation_id;

  RETURN 'confirmed';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION confirm_activation_settlement_atomic IS
  'IRL-58 + IRL-60: Confirms settlement, increments sponsored_activation.usdc_settled_total, syncs redemption.';

-- ---------------------------------------------------------------------------
-- record_activation_settlement_failure_atomic: uniform retry vs exhaust
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION record_activation_settlement_failure_atomic(
  p_settlement_id UUID,
  p_last_error_code TEXT
)
RETURNS TEXT AS $$
DECLARE
  v_redemption_id UUID;
  v_status TEXT;
  v_attempt INTEGER;
  v_new_attempt INTEGER;
  v_queued_at TIMESTAMPTZ;
  v_err TEXT;
BEGIN
  SELECT redemption_id, status, submission_attempt, queued_at
  INTO v_redemption_id, v_status, v_attempt, v_queued_at
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

  IF v_status NOT IN ('queued', 'submitted', 'retrying', 'not_started') THEN
    RAISE EXCEPTION 'SETTLEMENT_INVALID_STATE';
  END IF;

  v_new_attempt := v_attempt + 1;
  v_err := left(trim(COALESCE(p_last_error_code, '')), 128);

  IF v_new_attempt >= 5
     OR (v_queued_at IS NOT NULL AND NOW() >= v_queued_at + INTERVAL '24 hours') THEN
    UPDATE activation_settlement_transaction
    SET
      status = 'failed',
      last_error_code = v_err,
      submission_attempt = v_new_attempt
    WHERE id = p_settlement_id;

    UPDATE activation_redemption
    SET status = 'settlement_failed', updated_at = NOW()
    WHERE id = v_redemption_id
      AND status = 'settlement_pending';

    RETURN 'exhausted';
  END IF;

  UPDATE activation_settlement_transaction
  SET
    status = 'retrying',
    last_error_code = v_err,
    submission_attempt = v_new_attempt,
    tx_hash = NULL,
    privy_transaction_id = NULL,
    submitted_at = NULL
  WHERE id = p_settlement_id;

  RETURN 'retry_scheduled';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION record_activation_settlement_failure_atomic IS
  'IRL-60: After a failed settlement attempt, either schedule retry (retrying) or exhaust (failed + redemption).';

DROP FUNCTION IF EXISTS fail_activation_settlement_atomic(UUID, TEXT);

-- ---------------------------------------------------------------------------
-- promote_activation_settlement_retrying_to_queued: cron batch (backoff from queued_at + submission_attempt)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION promote_activation_settlement_retrying_to_queued()
RETURNS INTEGER AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  WITH due AS (
    SELECT id
    FROM activation_settlement_transaction
    WHERE status = 'retrying'
      AND queued_at IS NOT NULL
      AND NOW() >= queued_at
        + (
            LEAST(
              30 * POWER(2::numeric, GREATEST(submission_attempt - 1, 0)),
              7200
            ) * INTERVAL '1 second'
          )
  )
  UPDATE activation_settlement_transaction st
  SET status = 'queued'
  FROM due
  WHERE st.id = due.id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION promote_activation_settlement_retrying_to_queued IS
  'IRL-60: Moves retrying settlements whose backoff window elapsed back to queued (backoff from queued_at).';

-- ---------------------------------------------------------------------------
-- mark_activation_settlement_submitted_atomic: queued → submitted, increment attempts
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION mark_activation_settlement_submitted_atomic(
  p_settlement_id UUID,
  p_tx_hash TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE activation_settlement_transaction
  SET
    status = 'submitted',
    tx_hash = trim(p_tx_hash),
    submitted_at = NOW(),
    submission_attempt = submission_attempt + 1
  WHERE id = p_settlement_id
    AND status = 'queued';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mark_activation_settlement_submitted_atomic IS
  'IRL-60: Idempotent queued→submitted with submission_attempt increment (Stellar rail).';

-- ---------------------------------------------------------------------------
-- admin_reset_activation_settlement_for_retry_atomic
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_reset_activation_settlement_for_retry_atomic(
  p_settlement_id UUID,
  p_activation_id UUID
) RETURNS TEXT AS $$
DECLARE
  v_redemption_id UUID;
  v_rows INTEGER;
BEGIN
  SELECT st.redemption_id
  INTO v_redemption_id
  FROM activation_settlement_transaction st
  INNER JOIN activation_redemption ar ON ar.id = st.redemption_id
  WHERE st.id = p_settlement_id
    AND st.activation_id = p_activation_id
    AND st.status = 'failed'
    AND ar.status = 'settlement_failed'
  FOR UPDATE OF st, ar;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SETTLEMENT_NOT_ELIGIBLE_FOR_RETRY';
  END IF;

  UPDATE activation_settlement_transaction
  SET
    status = 'queued',
    last_error_code = NULL,
    tx_hash = NULL,
    privy_transaction_id = NULL,
    submission_attempt = 0,
    queued_at = NOW(),
    submitted_at = NULL,
    confirmed_at = NULL
  WHERE id = p_settlement_id
    AND activation_id = p_activation_id
    AND status = 'failed';

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RAISE EXCEPTION 'SETTLEMENT_NOT_ELIGIBLE_FOR_RETRY';
  END IF;

  UPDATE activation_redemption
  SET status = 'settlement_pending', updated_at = NOW()
  WHERE id = v_redemption_id
    AND status = 'settlement_failed';

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RAISE EXCEPTION 'REDEMPTION_NOT_ELIGIBLE_FOR_RETRY';
  END IF;

  RETURN 'reset';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION admin_reset_activation_settlement_for_retry_atomic IS
  'IRL-60: Ops manual retry — failed settlement row back to queued with fresh queued_at; redemption to settlement_pending.';
