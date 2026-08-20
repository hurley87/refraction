-- Configurable logged-out location gate for city guides.

ALTER TABLE guides
  ADD COLUMN IF NOT EXISTS unauthenticated_visible_location_count INTEGER,
  ADD COLUMN IF NOT EXISTS gated_location_teaser_summary TEXT;

ALTER TABLE guides
  DROP CONSTRAINT IF EXISTS guides_unauthenticated_visible_location_count_non_negative;

ALTER TABLE guides
  ADD CONSTRAINT guides_unauthenticated_visible_location_count_non_negative
  CHECK (
    unauthenticated_visible_location_count IS NULL
    OR unauthenticated_visible_location_count >= 0
  );

COMMENT ON COLUMN guides.unauthenticated_visible_location_count IS
  'City guide only: number of ordered locations visible before the logged-out member gate. NULL disables gating.';

COMMENT ON COLUMN guides.gated_location_teaser_summary IS
  'City guide only: admin-authored teaser for the hidden locations shown in the member gate.';
