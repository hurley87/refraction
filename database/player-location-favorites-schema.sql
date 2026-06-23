-- Per-player favorite locations (toggleable join between players and locations).
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS player_location_favorites (
  id BIGSERIAL PRIMARY KEY,
  player_id BIGINT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (player_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_player_id
ON player_location_favorites(player_id);

CREATE INDEX IF NOT EXISTS idx_favorites_location_id
ON player_location_favorites(location_id);

COMMENT ON TABLE player_location_favorites IS 'User-saved favorite map locations';
