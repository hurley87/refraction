-- Safe Database Functions Migration
-- These functions are safe to create - they won't affect existing code until
-- the TypeScript is updated to use them.

-- =============================================================================
-- Function: increment_player_points (by wallet address)
-- Purpose: Atomically increment a player's points (fixes race condition)
-- =============================================================================
CREATE OR REPLACE FUNCTION increment_player_points(
  p_wallet_address TEXT,
  p_points INTEGER
) RETURNS INTEGER AS $$
DECLARE
  new_total INTEGER;
BEGIN
  UPDATE players
  SET total_points = COALESCE(total_points, 0) + p_points,
      updated_at = NOW()
  WHERE wallet_address = p_wallet_address
  RETURNING total_points INTO new_total;
  
  RETURN new_total;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_player_points(TEXT, INTEGER) IS 
'Atomically increment a player''s total points by wallet address. Returns the new total.';


-- =============================================================================
-- Function: increment_player_points_by_id (by player ID)
-- Purpose: Atomically increment a player's points (fixes race condition)
-- =============================================================================
CREATE OR REPLACE FUNCTION increment_player_points_by_id(
  p_player_id BIGINT,
  p_points INTEGER
) RETURNS TABLE(id BIGINT, total_points INTEGER, wallet_address TEXT) AS $$
BEGIN
  RETURN QUERY
  UPDATE players
  SET total_points = COALESCE(players.total_points, 0) + p_points,
      updated_at = NOW()
  WHERE players.id = p_player_id
  RETURNING players.id, players.total_points, players.wallet_address;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_player_points_by_id IS 
'Atomically increment a player''s total points by player ID. Returns id, total_points, and wallet_address.';


-- =============================================================================
-- Function: get_player_rank
-- Purpose: Efficiently calculate a player's rank without fetching all players
-- =============================================================================
CREATE OR REPLACE FUNCTION get_player_rank(p_wallet_address TEXT)
RETURNS TABLE(rank BIGINT, total_points INTEGER) AS $$
  SELECT ranked.rank, ranked.total_points FROM (
    SELECT
      p.wallet_address,
      p.total_points,
      RANK() OVER (ORDER BY p.total_points DESC) as rank
    FROM players p
    WHERE p.total_points > 0
  ) ranked
  WHERE ranked.wallet_address = p_wallet_address;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_player_rank IS 
'Get a player''s rank and total points using window function. Returns empty if player not found or has 0 points.';


-- =============================================================================
-- Function: get_location_lists_with_counts
-- Purpose: Get all location lists with their location counts in one query
-- =============================================================================
CREATE OR REPLACE FUNCTION get_location_lists_with_counts()
RETURNS TABLE(
  id UUID,
  title TEXT,
  slug TEXT,
  description TEXT,
  accent_color TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  location_count BIGINT
) AS $$
  SELECT
    ll.id,
    ll.title,
    ll.slug,
    ll.description,
    ll.accent_color,
    ll.is_active,
    ll.created_at,
    ll.updated_at,
    COUNT(llm.id) as location_count
  FROM location_lists ll
  LEFT JOIN location_list_members llm ON ll.id = llm.list_id
  GROUP BY ll.id
  ORDER BY ll.created_at DESC;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_location_lists_with_counts IS 
'Get all location lists with their location counts in a single efficient query.';


-- =============================================================================
-- Function: create_or_get_location
-- Purpose: Atomically create or get a location by place_id (fixes race condition)
-- =============================================================================
CREATE OR REPLACE FUNCTION create_or_get_location(
  p_place_id TEXT,
  p_name TEXT,
  p_display_name TEXT,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_points_value INTEGER DEFAULT 100
) RETURNS TABLE(
  id UUID,
  place_id TEXT,
  name TEXT,
  display_name TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  points_value INTEGER,
  created_at TIMESTAMPTZ,
  is_new BOOLEAN
) AS $$
DECLARE
  v_location RECORD;
  v_is_new BOOLEAN := false;
BEGIN
  -- Try to find existing location
  SELECT l.* INTO v_location
  FROM locations l
  WHERE l.place_id = p_place_id;
  
  -- If not found, insert new one
  IF v_location IS NULL THEN
    INSERT INTO locations (place_id, name, display_name, latitude, longitude, points_value)
    VALUES (p_place_id, p_name, p_display_name, p_latitude, p_longitude, p_points_value)
    ON CONFLICT (place_id) DO UPDATE SET place_id = EXCLUDED.place_id
    RETURNING * INTO v_location;
    v_is_new := true;
  END IF;
  
  RETURN QUERY SELECT 
    v_location.id,
    v_location.place_id,
    v_location.name,
    v_location.display_name,
    v_location.latitude,
    v_location.longitude,
    v_location.points_value,
    v_location.created_at,
    v_is_new;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_or_get_location IS 
'Atomically create a new location or return existing one by place_id. Returns is_new flag.';


-- =============================================================================
-- Enable pg_stat_statements for query monitoring
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

COMMENT ON EXTENSION pg_stat_statements IS 
'Tracks execution statistics for all SQL statements. Use for query performance monitoring.';
