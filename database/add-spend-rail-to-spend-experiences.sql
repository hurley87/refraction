-- IRL-7: Immutable spend_rail (base_usdc | stellar_usdc). TEXT + CHECK (no ENUM).
-- CHECK rejects invalid values; BEFORE UPDATE trigger blocks rail changes (IS DISTINCT FROM).
-- No SQL tests in-repo—verify CHECK/trigger on Postgres when rolling out.

ALTER TABLE spend_experiences
  ADD COLUMN IF NOT EXISTS spend_rail TEXT NOT NULL DEFAULT 'base_usdc'
  CONSTRAINT spend_experiences_spend_rail_check
    CHECK (spend_rail IN ('base_usdc', 'stellar_usdc'));

UPDATE spend_experiences
SET spend_rail = 'base_usdc'
WHERE spend_rail IS NULL;

COMMENT ON COLUMN spend_experiences.spend_rail IS
  'Payment rail for this experience (base_usdc | stellar_usdc). Immutable after insert.';

CREATE OR REPLACE FUNCTION enforce_spend_experiences_spend_rail_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.spend_rail IS DISTINCT FROM OLD.spend_rail THEN
    RAISE EXCEPTION
      'spend_rail cannot be changed after the spend experience is created (was %, attempted %)',
      OLD.spend_rail,
      NEW.spend_rail;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS spend_experiences_spend_rail_immutable ON spend_experiences;
CREATE TRIGGER spend_experiences_spend_rail_immutable
  BEFORE UPDATE ON spend_experiences
  FOR EACH ROW
  EXECUTE FUNCTION enforce_spend_experiences_spend_rail_immutable();
