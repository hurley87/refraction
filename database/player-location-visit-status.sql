-- Visit status lives on the player's relationship to a place, not on a list.
-- Existing check-in rows are "been". Favorites with no check-in become "want to try".
-- A favorite for a place the player already checked into stays "been".
-- Safe to run multiple times. Run after player-list-item-visit-status.sql.

ALTER TABLE player_location_checkins
  ADD COLUMN IF NOT EXISTS visit_status TEXT;

UPDATE player_location_checkins
SET visit_status = 'been'
WHERE visit_status IS NULL;

ALTER TABLE player_location_checkins
  ALTER COLUMN visit_status SET DEFAULT 'been';

ALTER TABLE player_location_checkins
  ALTER COLUMN visit_status SET NOT NULL;

ALTER TABLE player_location_checkins
  DROP CONSTRAINT IF EXISTS player_location_checkins_visit_status_check;

ALTER TABLE player_location_checkins
  ADD CONSTRAINT player_location_checkins_visit_status_check
  CHECK (visit_status IN ('want_to_try', 'been'));

COMMENT ON COLUMN player_location_checkins.visit_status IS
  'want_to_try or been. One row per player and location. Check-ins are been.';

-- Favorites that are not already a check-in become want-to-try rows.
-- points_earned stays 0 so this merge does not grant check-in points.
DO $$
BEGIN
  IF to_regclass('public.player_location_favorites') IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO player_location_checkins (
    player_id,
    location_id,
    points_earned,
    visit_status,
    checkin_at
  )
  SELECT
    favorites.player_id,
    favorites.location_id,
    0,
    'want_to_try',
    favorites.created_at
  FROM player_location_favorites AS favorites
  WHERE NOT EXISTS (
    SELECT 1
    FROM player_location_checkins AS checkins
    WHERE checkins.player_id = favorites.player_id
      AND checkins.location_id = favorites.location_id
  );
END $$;

-- List membership no longer stores visit status.
ALTER TABLE player_custom_list_items
  DROP CONSTRAINT IF EXISTS player_custom_list_items_visit_status_check;

ALTER TABLE player_custom_list_items
  DROP COLUMN IF EXISTS visit_status;

ALTER TABLE player_custom_list_items
  DROP COLUMN IF EXISTS comment;

DROP TABLE IF EXISTS player_location_favorites;

-- Leaderboard check-in counts are visits, not want-to-try saves.
CREATE OR REPLACE FUNCTION get_leaderboard_optimized(
  page_limit integer DEFAULT 50,
  page_offset integer DEFAULT 0
)
RETURNS TABLE (
  player_id integer,
  wallet_address text,
  username text,
  email text,
  total_points integer,
  total_checkins bigint,
  rank integer
) AS $$
BEGIN
  RETURN QUERY
  WITH ranked_players AS (
    SELECT
      p.id,
      p.wallet_address,
      p.username,
      p.email,
      COALESCE(p.total_points, 0) as total_points,
      COALESCE(COUNT(plc.id), 0) as total_checkins,
      DENSE_RANK() OVER (ORDER BY COALESCE(p.total_points, 0) DESC) as rank
    FROM players p
    LEFT JOIN player_location_checkins plc
      ON p.id = plc.player_id
      AND plc.visit_status = 'been'
    GROUP BY p.id, p.wallet_address, p.username, p.email, p.total_points
  )
  SELECT
    ranked_players.id::integer as player_id,
    ranked_players.wallet_address::text,
    ranked_players.username::text,
    ranked_players.email::text,
    ranked_players.total_points::integer,
    ranked_players.total_checkins::bigint,
    ranked_players.rank::integer
  FROM ranked_players
  ORDER BY ranked_players.rank ASC, ranked_players.id ASC
  LIMIT page_limit
  OFFSET page_offset;
END;
$$ LANGUAGE plpgsql STABLE;
