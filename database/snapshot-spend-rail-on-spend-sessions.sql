-- IRL-9: Snapshot spend_rail and rail_user_wallet_address on spend_sessions.
-- spend_rail matches parent experience at insert; CHECK + BEFORE UPDATE keep it immutable.
-- Depends on: spend_experiences.spend_rail (IRL-7), spend_sessions base table.

ALTER TABLE spend_sessions
  ADD COLUMN IF NOT EXISTS spend_rail TEXT;

ALTER TABLE spend_sessions
  ADD COLUMN IF NOT EXISTS rail_user_wallet_address TEXT;

UPDATE spend_sessions ss
SET spend_rail = se.spend_rail
FROM spend_experiences se
WHERE ss.spend_experience_id = se.id
  AND ss.spend_rail IS NULL;

UPDATE spend_sessions
SET spend_rail = 'base_usdc'
WHERE spend_rail IS NULL;

-- Historical spend pilot: Base-only; rail user wallet matches verified EVM wallet_address
UPDATE spend_sessions
SET rail_user_wallet_address = wallet_address
WHERE rail_user_wallet_address IS NULL;

ALTER TABLE spend_sessions
  ALTER COLUMN spend_rail SET NOT NULL;

ALTER TABLE spend_sessions
  ALTER COLUMN rail_user_wallet_address SET NOT NULL;

ALTER TABLE spend_sessions DROP CONSTRAINT IF EXISTS spend_sessions_spend_rail_check;
ALTER TABLE spend_sessions ADD CONSTRAINT spend_sessions_spend_rail_check
  CHECK (spend_rail IN ('base_usdc', 'stellar_usdc'));

COMMENT ON COLUMN spend_sessions.spend_rail IS
  'Spend rail copied from spend_experiences at session creation (base_usdc | stellar_usdc). Immutable after insert.';

COMMENT ON COLUMN spend_sessions.rail_user_wallet_address IS
  'Rail-specific user wallet snapshotted at session creation (EVM for base_usdc; Stellar G-address for stellar_usdc).';

CREATE OR REPLACE FUNCTION enforce_spend_sessions_spend_rail_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.spend_rail IS DISTINCT FROM OLD.spend_rail THEN
    RAISE EXCEPTION
      'spend_rail cannot be changed after the spend session is created (was %, attempted %)',
      OLD.spend_rail,
      NEW.spend_rail;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS spend_sessions_spend_rail_immutable ON spend_sessions;
CREATE TRIGGER spend_sessions_spend_rail_immutable
  BEFORE UPDATE ON spend_sessions
  FOR EACH ROW
  EXECUTE FUNCTION enforce_spend_sessions_spend_rail_immutable();
