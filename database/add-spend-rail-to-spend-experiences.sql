-- IRL-7: Canonical immutable spend rail per spend experience (base_usdc | stellar_usdc).
--
-- Enforcement (no ENUM; plain TEXT + CHECK):
-- - CHECK spend_experiences_spend_rail_check rejects invalid values on INSERT/UPDATE
--   that touch spend_rail.
-- - BEFORE UPDATE trigger spend_experiences_spend_rail_immutable rejects changing
--   spend_rail on an existing row (OLD IS DISTINCT FROM NEW). Direct SQL that sets
--   a different rail raises a clear exception.
-- - In-repo tests cover Zod and admin PATCH; there is no SQL test runner here—verify
--   CHECK/trigger against a real Postgres instance using the issue checklist.

ALTER TABLE spend_experiences
  ADD COLUMN IF NOT EXISTS spend_rail TEXT NOT NULL DEFAULT 'base_usdc'
  CONSTRAINT spend_experiences_spend_rail_check
    CHECK (spend_rail IN ('base_usdc', 'stellar_usdc'));

-- Idempotent backfill: new installs get DEFAULT; any legacy NULL (should not occur)
-- is normalized to Base.
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
