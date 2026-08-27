-- Optional blurb for player-created lists, shown on list detail and share pages.
-- Safe to run multiple times.

ALTER TABLE player_custom_lists
ADD COLUMN IF NOT EXISTS description VARCHAR(500);

COMMENT ON COLUMN player_custom_lists.description IS
  'Optional list blurb (up to 500 characters), shown on list detail and share pages.';
