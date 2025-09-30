-- Simplified leaderboard function - no complex ranking, just top players
-- This function aggregates checkin counts in a single efficient query

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_leaderboard_optimized(integer, integer);

-- Create simplified leaderboard function
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
  SELECT 
    p.id::integer,
    p.wallet_address,
    p.username,
    p.email,
    p.total_points::integer,
    COALESCE(COUNT(plc.id), 0) as checkin_count,
    (page_offset + ROW_NUMBER() OVER (ORDER BY p.total_points DESC, p.id ASC))::integer as player_rank
  FROM players p
  LEFT JOIN player_location_checkins plc ON p.id = plc.player_id
  GROUP BY p.id, p.wallet_address, p.username, p.email, p.total_points
  ORDER BY p.total_points DESC, p.id ASC
  LIMIT page_limit
  OFFSET page_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add helpful indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_players_total_points ON players(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_player_location_checkins_player_id ON player_location_checkins(player_id);

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_leaderboard_optimized(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_leaderboard_optimized(integer, integer) TO anon;
GRANT EXECUTE ON FUNCTION get_leaderboard_optimized(integer, integer) TO service_role;
