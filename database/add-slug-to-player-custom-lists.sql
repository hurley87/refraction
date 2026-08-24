-- URL slug for shareable public player custom lists (/map/{username}/{list-slug}).
-- Safe to run multiple times.

ALTER TABLE player_custom_lists
ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_player_custom_lists_player_id_slug_unique
ON player_custom_lists (player_id, slug)
WHERE slug IS NOT NULL;

COMMENT ON COLUMN player_custom_lists.slug IS
  'Lowercase hyphenated slug from list title; unique per player for /map/{username}/{list-slug}';
