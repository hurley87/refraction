ALTER TABLE guide_contributors
  ADD COLUMN IF NOT EXISTS player_id INTEGER
  REFERENCES players (id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_guide_contributors_player_id
  ON guide_contributors (player_id)
  WHERE player_id IS NOT NULL;

COMMENT ON COLUMN guide_contributors.player_id IS
  'Optional players.id link. Public contributor details use the linked player profile when available.';
