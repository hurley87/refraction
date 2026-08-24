-- Previous slugs for player custom lists (301 from /map/{username}/{old-slug}).
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS player_custom_list_slug_redirects (
  id BIGSERIAL PRIMARY KEY,
  player_id BIGINT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  old_slug TEXT NOT NULL,
  list_id UUID NOT NULL REFERENCES player_custom_lists(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (player_id, old_slug)
);

CREATE INDEX IF NOT EXISTS idx_player_custom_list_slug_redirects_list_id
ON player_custom_list_slug_redirects (list_id);

COMMENT ON TABLE player_custom_list_slug_redirects IS
  'Maps retired list slugs to lists for permanent redirects after rename';
