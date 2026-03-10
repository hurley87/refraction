-- Atomic spend redemption RPC
-- Fixes race condition by deducting points + creating redemption in one transaction.

CREATE OR REPLACE FUNCTION redeem_spend_item_once_atomic(
  p_spend_item_id UUID,
  p_wallet_address TEXT
) RETURNS TABLE (
  redemption_id UUID,
  player_id BIGINT,
  player_total_points INTEGER
) AS $$
DECLARE
  v_player_id BIGINT;
  v_player_total_points INTEGER;
  v_points_cost INTEGER;
  v_is_active BOOLEAN;
  v_redemption_id UUID;
BEGIN
  -- Lock the player row so concurrent redemptions cannot double-spend points.
  SELECT id, COALESCE(total_points, 0)
  INTO v_player_id, v_player_total_points
  FROM players
  WHERE wallet_address = p_wallet_address
  FOR UPDATE;

  IF v_player_id IS NULL THEN
    RAISE EXCEPTION 'Player not found';
  END IF;

  SELECT points_cost, is_active
  INTO v_points_cost, v_is_active
  FROM spend_items
  WHERE id = p_spend_item_id;

  IF v_points_cost IS NULL OR v_is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'This item is no longer available';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM spend_redemptions
    WHERE spend_item_id = p_spend_item_id
      AND user_wallet_address = p_wallet_address
  ) THEN
    RAISE EXCEPTION 'You already redeemed this item';
  END IF;

  IF v_player_total_points < v_points_cost THEN
    RAISE EXCEPTION 'Insufficient points';
  END IF;

  UPDATE players
  SET total_points = COALESCE(total_points, 0) - v_points_cost,
      updated_at = NOW()
  WHERE id = v_player_id
  RETURNING total_points INTO v_player_total_points;

  INSERT INTO spend_redemptions (
    spend_item_id,
    user_wallet_address,
    points_spent,
    is_fulfilled,
    fulfilled_at,
    verified_by
  )
  VALUES (
    p_spend_item_id,
    p_wallet_address,
    v_points_cost,
    true,
    NOW(),
    'user'
  )
  RETURNING id INTO v_redemption_id;

  RETURN QUERY SELECT v_redemption_id, v_player_id, v_player_total_points;

EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'You already redeemed this item';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION redeem_spend_item_once_atomic(UUID, TEXT) IS
'Atomically redeems a spend item once: validates state, deducts points, and inserts a fulfilled redemption in one transaction.';
