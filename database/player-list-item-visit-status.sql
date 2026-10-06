-- Superseded by database/player-location-visit-status.sql.
-- Visit status belongs on player_location_checkins, not on list items.
-- This file remains for databases that already applied it; the follow-up
-- migration drops these columns.

ALTER TABLE player_custom_list_items
  ADD COLUMN IF NOT EXISTS visit_status TEXT NOT NULL DEFAULT 'want_to_try';

ALTER TABLE player_custom_list_items
  ADD COLUMN IF NOT EXISTS comment TEXT;

ALTER TABLE player_custom_list_items
  DROP CONSTRAINT IF EXISTS player_custom_list_items_visit_status_check;

ALTER TABLE player_custom_list_items
  ADD CONSTRAINT player_custom_list_items_visit_status_check
  CHECK (visit_status IN ('want_to_try', 'been'));

COMMENT ON COLUMN player_custom_list_items.visit_status IS
  'want_to_try (default) or been. Set when the member saves the spot.';
COMMENT ON COLUMN player_custom_list_items.comment IS
  'Optional note. Only stored when visit_status is been.';

-- Check-ins from before this column mean the member has been there.
-- Only updates spots already saved on one of that player's lists.
UPDATE player_custom_list_items AS items
SET visit_status = 'been'
FROM player_custom_lists AS lists
WHERE items.list_id = lists.id
  AND items.visit_status IS DISTINCT FROM 'been'
  AND EXISTS (
    SELECT 1
    FROM player_location_checkins AS checkins
    WHERE checkins.player_id = lists.player_id
      AND checkins.location_id = items.location_id
  );
