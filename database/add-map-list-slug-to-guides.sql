-- City guide map image can deep-link to a curated location list.

ALTER TABLE guides
  ADD COLUMN IF NOT EXISTS map_list_slug TEXT;

COMMENT ON COLUMN guides.map_list_slug IS
  'City guide only: curated location_lists.slug. When set with map_image_url, the map image links to /map/lists/{slug}.';
