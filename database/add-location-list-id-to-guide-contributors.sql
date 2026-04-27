-- Per-contributor venue lists for city guides (multiple lists when multiple contributors).
-- Run after guides-schema.sql / on existing databases.

ALTER TABLE guide_contributors
  ADD COLUMN IF NOT EXISTS location_list_id UUID REFERENCES location_lists (id) ON DELETE SET NULL;

COMMENT ON COLUMN guide_contributors.location_list_id IS
  'Optional venue list for this contributor; when set on any contributor, guide-level guides.location_list_id is ignored for public venue cards.';
