-- Player-created custom lists of favorite locations ("Your lists").
-- Locations are added from the map card SAVE TO LIST flow.
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS player_custom_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id BIGINT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  thumbnail_url TEXT,
  is_private BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_custom_lists_player_id
ON player_custom_lists(player_id);

CREATE TABLE IF NOT EXISTS player_custom_list_items (
  id BIGSERIAL PRIMARY KEY,
  list_id UUID NOT NULL REFERENCES player_custom_lists(id) ON DELETE CASCADE,
  location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (list_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_player_custom_list_items_list_id
ON player_custom_list_items(list_id);

CREATE INDEX IF NOT EXISTS idx_player_custom_list_items_location_id
ON player_custom_list_items(location_id);

COMMENT ON TABLE player_custom_lists IS 'User-created custom lists of map locations';
COMMENT ON TABLE player_custom_list_items IS 'Locations saved into a player custom list';
