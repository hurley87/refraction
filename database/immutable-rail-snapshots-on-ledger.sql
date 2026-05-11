-- IRL-6: Immutable rail execution snapshots on point_conversions, spend_transactions, treasury_transactions.
-- Depends on: spend_sessions.spend_rail (IRL-9), spend_experiences.spend_rail (IRL-7).
--
-- Backfill assumptions (Base-era historical rows):
--   * spend_rail / network / asset_symbol derived from spend_sessions or spend_experiences; default base_usdc / Base / USDC.
--   * explorer_tx_url for Base EVM hashes (0x + 64 hex) uses https://basescan.org/tx/{lower(hash)}.
--   * Stellar-era rows: explorer URL uses stellar.expert public when spend_rail is stellar_usdc and tx_hash is not EVM-shaped.

-- ---------------------------------------------------------------------------
-- point_conversions
-- ---------------------------------------------------------------------------
ALTER TABLE point_conversions
  ADD COLUMN IF NOT EXISTS spend_rail TEXT,
  ADD COLUMN IF NOT EXISTS network TEXT,
  ADD COLUMN IF NOT EXISTS asset_symbol TEXT,
  ADD COLUMN IF NOT EXISTS explorer_tx_url TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE point_conversions pc
SET
  spend_rail = COALESCE(ss.spend_rail, se.spend_rail, 'base_usdc'),
  network = CASE COALESCE(ss.spend_rail, se.spend_rail, 'base_usdc')
    WHEN 'stellar_usdc' THEN 'Stellar'
    ELSE 'Base'
  END,
  asset_symbol = 'USDC',
  explorer_tx_url = CASE
    WHEN pc.funding_tx_hash IS NULL OR pc.funding_tx_hash LIKE 'pending:%' THEN NULL
    WHEN COALESCE(ss.spend_rail, se.spend_rail, 'base_usdc') = 'base_usdc'
      AND pc.funding_tx_hash ~* '^0x[0-9a-f]{64}$'
      THEN 'https://basescan.org/tx/' || lower(pc.funding_tx_hash)
    WHEN COALESCE(ss.spend_rail, se.spend_rail, 'base_usdc') = 'stellar_usdc'
      AND pc.funding_tx_hash !~* '^0x[0-9a-f]{64}$'
      THEN 'https://stellar.expert/explorer/public/tx/' || trim(pc.funding_tx_hash)
    ELSE NULL
  END
FROM spend_sessions ss
LEFT JOIN spend_experiences se ON se.id = pc.spend_experience_id
WHERE pc.spend_session_id = ss.id
  AND (pc.spend_rail IS NULL OR pc.network IS NULL OR pc.asset_symbol IS NULL);

UPDATE point_conversions
SET
  spend_rail = 'base_usdc',
  network = 'Base',
  asset_symbol = 'USDC',
  explorer_tx_url = CASE
    WHEN funding_tx_hash IS NULL OR funding_tx_hash LIKE 'pending:%' THEN NULL
    WHEN funding_tx_hash ~* '^0x[0-9a-f]{64}$' THEN 'https://basescan.org/tx/' || lower(funding_tx_hash)
    ELSE NULL
  END
WHERE spend_rail IS NULL;

ALTER TABLE point_conversions
  ALTER COLUMN spend_rail SET NOT NULL,
  ALTER COLUMN network SET NOT NULL,
  ALTER COLUMN asset_symbol SET NOT NULL;

ALTER TABLE point_conversions DROP CONSTRAINT IF EXISTS point_conversions_spend_rail_check;
ALTER TABLE point_conversions ADD CONSTRAINT point_conversions_spend_rail_check
  CHECK (spend_rail IN ('base_usdc', 'stellar_usdc'));

COMMENT ON COLUMN point_conversions.spend_rail IS
  'Spend rail at conversion insert (base_usdc | stellar_usdc). Immutable after insert.';
COMMENT ON COLUMN point_conversions.network IS
  'Human-readable chain/network label snapshotted at insert. Immutable after insert.';
COMMENT ON COLUMN point_conversions.asset_symbol IS
  'Asset symbol (e.g. USDC) snapshotted at insert. Immutable after insert.';
COMMENT ON COLUMN point_conversions.explorer_tx_url IS
  'Canonical explorer URL for funding_tx_hash when known; set-once (nullable until first non-null).';
COMMENT ON COLUMN point_conversions.updated_at IS
  'Updated when mutable lifecycle fields change (status, confirmation, failure, hashes per rules).';

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
     OR OLD.idempotency_key IS DISTINCT FROM NEW.idempotency_key
  THEN
    RAISE EXCEPTION 'point_conversions: snapshot columns cannot be changed after insert';
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

DROP TRIGGER IF EXISTS point_conversions_ledger_mutability ON point_conversions;
CREATE TRIGGER point_conversions_ledger_mutability
  BEFORE UPDATE ON point_conversions
  FOR EACH ROW
  EXECUTE FUNCTION enforce_point_conversions_ledger_mutability();

-- ---------------------------------------------------------------------------
-- spend_transactions
-- ---------------------------------------------------------------------------
ALTER TABLE spend_transactions
  ADD COLUMN IF NOT EXISTS spend_rail TEXT,
  ADD COLUMN IF NOT EXISTS network TEXT,
  ADD COLUMN IF NOT EXISTS asset_symbol TEXT,
  ADD COLUMN IF NOT EXISTS explorer_tx_url TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE spend_transactions st
SET
  spend_rail = COALESCE(ss.spend_rail, se.spend_rail, 'base_usdc'),
  network = CASE COALESCE(ss.spend_rail, se.spend_rail, 'base_usdc')
    WHEN 'stellar_usdc' THEN 'Stellar'
    ELSE 'Base'
  END,
  asset_symbol = 'USDC',
  explorer_tx_url = CASE
    WHEN st.payment_tx_hash IS NULL THEN NULL
    WHEN COALESCE(ss.spend_rail, se.spend_rail, 'base_usdc') = 'base_usdc'
      AND st.payment_tx_hash ~* '^0x[0-9a-f]{64}$'
      THEN 'https://basescan.org/tx/' || lower(st.payment_tx_hash)
    WHEN COALESCE(ss.spend_rail, se.spend_rail, 'base_usdc') = 'stellar_usdc'
      AND st.payment_tx_hash !~* '^0x[0-9a-f]{64}$'
      THEN 'https://stellar.expert/explorer/public/tx/' || trim(st.payment_tx_hash)
    ELSE NULL
  END
FROM spend_sessions ss
LEFT JOIN spend_experiences se ON se.id = st.spend_experience_id
WHERE st.spend_session_id = ss.id
  AND (st.spend_rail IS NULL OR st.network IS NULL OR st.asset_symbol IS NULL);

UPDATE spend_transactions
SET
  spend_rail = 'base_usdc',
  network = 'Base',
  asset_symbol = 'USDC',
  explorer_tx_url = CASE
    WHEN payment_tx_hash IS NULL THEN NULL
    WHEN payment_tx_hash ~* '^0x[0-9a-f]{64}$' THEN 'https://basescan.org/tx/' || lower(payment_tx_hash)
    ELSE NULL
  END
WHERE spend_rail IS NULL;

ALTER TABLE spend_transactions
  ALTER COLUMN spend_rail SET NOT NULL,
  ALTER COLUMN network SET NOT NULL,
  ALTER COLUMN asset_symbol SET NOT NULL;

ALTER TABLE spend_transactions DROP CONSTRAINT IF EXISTS spend_transactions_spend_rail_check;
ALTER TABLE spend_transactions ADD CONSTRAINT spend_transactions_spend_rail_check
  CHECK (spend_rail IN ('base_usdc', 'stellar_usdc'));

COMMENT ON COLUMN spend_transactions.spend_rail IS
  'Spend rail at payment row insert (base_usdc | stellar_usdc). Immutable after insert.';
COMMENT ON COLUMN spend_transactions.network IS
  'Human-readable chain/network label snapshotted at insert. Immutable after insert.';
COMMENT ON COLUMN spend_transactions.asset_symbol IS
  'Asset symbol (e.g. USDC) snapshotted at insert. Immutable after insert.';
COMMENT ON COLUMN spend_transactions.explorer_tx_url IS
  'Canonical explorer URL for payment_tx_hash when known; set-once (nullable until first non-null).';
COMMENT ON COLUMN spend_transactions.updated_at IS
  'Updated when mutable lifecycle fields change.';

CREATE OR REPLACE FUNCTION enforce_spend_transactions_ledger_mutability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  hash_changed BOOLEAN := OLD.payment_tx_hash IS DISTINCT FROM NEW.payment_tx_hash;
  explorer_changed BOOLEAN := OLD.explorer_tx_url IS DISTINCT FROM NEW.explorer_tx_url;
BEGIN
  NEW.updated_at := NOW();

  IF OLD.id IS DISTINCT FROM NEW.id
     OR OLD.spend_experience_id IS DISTINCT FROM NEW.spend_experience_id
     OR OLD.spend_session_id IS DISTINCT FROM NEW.spend_session_id
     OR OLD.user_id IS DISTINCT FROM NEW.user_id
     OR OLD.usdc_amount IS DISTINCT FROM NEW.usdc_amount
     OR OLD.from_wallet_address IS DISTINCT FROM NEW.from_wallet_address
     OR OLD.to_wallet_address IS DISTINCT FROM NEW.to_wallet_address
     OR OLD.spend_rail IS DISTINCT FROM NEW.spend_rail
     OR OLD.network IS DISTINCT FROM NEW.network
     OR OLD.asset_symbol IS DISTINCT FROM NEW.asset_symbol
     OR OLD.created_at IS DISTINCT FROM NEW.created_at
     OR OLD.idempotency_key IS DISTINCT FROM NEW.idempotency_key
  THEN
    RAISE EXCEPTION 'spend_transactions: snapshot columns cannot be changed after insert';
  END IF;

  IF hash_changed THEN
    IF OLD.status = 'failed' OR OLD.status = 'pending' OR OLD.payment_tx_hash IS NULL THEN
      NULL;
    ELSIF OLD.payment_tx_hash LIKE 'pending:%' AND COALESCE(NEW.payment_tx_hash, '') NOT LIKE 'pending:%' THEN
      NULL;
    ELSIF OLD.payment_tx_hash LIKE 'pending:%' AND NEW.payment_tx_hash LIKE 'pending:%'
          AND OLD.payment_tx_hash IS DISTINCT FROM NEW.payment_tx_hash THEN
      RAISE EXCEPTION 'spend_transactions: payment pending reference cannot change';
    ELSIF NEW.payment_tx_hash IS DISTINCT FROM OLD.payment_tx_hash THEN
      RAISE EXCEPTION 'spend_transactions: payment_tx_hash cannot be overwritten';
    END IF;
  END IF;

  IF explorer_changed THEN
    IF OLD.explorer_tx_url IS NULL OR OLD.status = 'failed' THEN
      NULL;
    ELSIF OLD.explorer_tx_url IS DISTINCT FROM NEW.explorer_tx_url THEN
      RAISE EXCEPTION 'spend_transactions: explorer_tx_url cannot be changed after it is set';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS spend_transactions_ledger_mutability ON spend_transactions;
CREATE TRIGGER spend_transactions_ledger_mutability
  BEFORE UPDATE ON spend_transactions
  FOR EACH ROW
  EXECUTE FUNCTION enforce_spend_transactions_ledger_mutability();

-- ---------------------------------------------------------------------------
-- treasury_transactions
-- ---------------------------------------------------------------------------
ALTER TABLE treasury_transactions
  ADD COLUMN IF NOT EXISTS spend_rail TEXT,
  ADD COLUMN IF NOT EXISTS network TEXT,
  ADD COLUMN IF NOT EXISTS asset_symbol TEXT,
  ADD COLUMN IF NOT EXISTS explorer_tx_url TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE treasury_transactions tt
SET
  spend_rail = COALESCE(se.spend_rail, 'base_usdc'),
  network = CASE COALESCE(se.spend_rail, 'base_usdc')
    WHEN 'stellar_usdc' THEN 'Stellar'
    ELSE 'Base'
  END,
  asset_symbol = 'USDC',
  explorer_tx_url = CASE
    WHEN tt.tx_hash IS NULL THEN NULL
    WHEN COALESCE(se.spend_rail, 'base_usdc') = 'base_usdc' AND tt.tx_hash ~* '^0x[0-9a-f]{64}$' THEN
      'https://basescan.org/tx/' || lower(tt.tx_hash)
    WHEN COALESCE(se.spend_rail, 'base_usdc') = 'stellar_usdc' AND tt.tx_hash !~* '^0x[0-9a-f]{64}$' THEN
      'https://stellar.expert/explorer/public/tx/' || trim(tt.tx_hash)
    ELSE NULL
  END
FROM spend_experiences se
WHERE tt.spend_experience_id = se.id
  AND (tt.spend_rail IS NULL OR tt.network IS NULL OR tt.asset_symbol IS NULL);

UPDATE treasury_transactions
SET
  spend_rail = 'base_usdc',
  network = 'Base',
  asset_symbol = 'USDC',
  explorer_tx_url = CASE
    WHEN tx_hash IS NULL THEN NULL
    WHEN tx_hash ~* '^0x[0-9a-f]{64}$' THEN 'https://basescan.org/tx/' || lower(tx_hash)
    ELSE NULL
  END
WHERE spend_rail IS NULL;

ALTER TABLE treasury_transactions
  ALTER COLUMN spend_rail SET NOT NULL,
  ALTER COLUMN network SET NOT NULL,
  ALTER COLUMN asset_symbol SET NOT NULL;

ALTER TABLE treasury_transactions DROP CONSTRAINT IF EXISTS treasury_transactions_spend_rail_check;
ALTER TABLE treasury_transactions ADD CONSTRAINT treasury_transactions_spend_rail_check
  CHECK (spend_rail IN ('base_usdc', 'stellar_usdc'));

COMMENT ON COLUMN treasury_transactions.spend_rail IS
  'Spend rail for this ledger row (base_usdc | stellar_usdc). Immutable after insert.';
COMMENT ON COLUMN treasury_transactions.network IS
  'Human-readable chain/network label snapshotted at insert. Immutable after insert.';
COMMENT ON COLUMN treasury_transactions.asset_symbol IS
  'Asset symbol (e.g. USDC) snapshotted at insert. Immutable after insert.';
COMMENT ON COLUMN treasury_transactions.explorer_tx_url IS
  'Canonical explorer URL for tx_hash when known; set-once (nullable until first non-null).';
COMMENT ON COLUMN treasury_transactions.updated_at IS
  'Updated when mutable lifecycle fields change.';

CREATE OR REPLACE FUNCTION enforce_treasury_transactions_ledger_mutability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  hash_changed BOOLEAN := OLD.tx_hash IS DISTINCT FROM NEW.tx_hash;
  explorer_changed BOOLEAN := OLD.explorer_tx_url IS DISTINCT FROM NEW.explorer_tx_url;
BEGIN
  NEW.updated_at := NOW();

  IF OLD.id IS DISTINCT FROM NEW.id
     OR OLD.spend_experience_id IS DISTINCT FROM NEW.spend_experience_id
     OR OLD.transaction_type IS DISTINCT FROM NEW.transaction_type
     OR OLD.amount IS DISTINCT FROM NEW.amount
     OR OLD.from_wallet_address IS DISTINCT FROM NEW.from_wallet_address
     OR OLD.to_wallet_address IS DISTINCT FROM NEW.to_wallet_address
     OR OLD.spend_rail IS DISTINCT FROM NEW.spend_rail
     OR OLD.network IS DISTINCT FROM NEW.network
     OR OLD.asset_symbol IS DISTINCT FROM NEW.asset_symbol
     OR OLD.created_at IS DISTINCT FROM NEW.created_at
  THEN
    RAISE EXCEPTION 'treasury_transactions: snapshot columns cannot be changed after insert';
  END IF;

  IF hash_changed THEN
    IF OLD.tx_hash IS NULL THEN
      NULL;
    ELSIF OLD.tx_hash LIKE 'pending:%' AND COALESCE(NEW.tx_hash, '') NOT LIKE 'pending:%' THEN
      NULL;
    ELSIF OLD.tx_hash LIKE 'pending:%' AND NEW.tx_hash LIKE 'pending:%'
          AND OLD.tx_hash IS DISTINCT FROM NEW.tx_hash THEN
      RAISE EXCEPTION 'treasury_transactions: tx pending reference cannot change';
    ELSIF OLD.tx_hash LIKE 'pending:%' AND NEW.tx_hash IS NULL THEN
      RAISE EXCEPTION 'treasury_transactions: tx_hash cannot be cleared';
    ELSIF NEW.tx_hash IS DISTINCT FROM OLD.tx_hash THEN
      RAISE EXCEPTION 'treasury_transactions: tx_hash cannot be overwritten';
    END IF;
  END IF;

  IF explorer_changed THEN
    IF OLD.explorer_tx_url IS NULL THEN
      NULL;
    ELSIF OLD.explorer_tx_url IS DISTINCT FROM NEW.explorer_tx_url THEN
      RAISE EXCEPTION 'treasury_transactions: explorer_tx_url cannot be changed after it is set';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS treasury_transactions_ledger_mutability ON treasury_transactions;
CREATE TRIGGER treasury_transactions_ledger_mutability
  BEFORE UPDATE ON treasury_transactions
  FOR EACH ROW
  EXECUTE FUNCTION enforce_treasury_transactions_ledger_mutability();

-- ---------------------------------------------------------------------------
-- RPC: insert new snapshot columns on point_conversions (body matches
-- database/fix-spend-conversion-player-case-duplicates.sql).
-- ---------------------------------------------------------------------------
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
    WHERE lower(trim(wallet_address)) = lower(trim(v_session.wallet_address))
    ORDER BY
      (trim(wallet_address) = trim(p_wallet_address)) DESC,
      COALESCE(total_points, 0) DESC,
      (trim(wallet_address) = trim(v_session.wallet_address)) DESC,
      id ASC
    LIMIT 1;

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
  WHERE lower(trim(wallet_address)) = lower(trim(v_session.wallet_address))
    ORDER BY
      (trim(wallet_address) = trim(p_wallet_address)) DESC,
      COALESCE(total_points, 0) DESC,
      (trim(wallet_address) = trim(v_session.wallet_address)) DESC,
    id ASC
  LIMIT 1
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
    asset_symbol
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
    'USDC'
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
