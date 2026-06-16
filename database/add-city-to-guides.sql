-- Add a canonical-city tag to guides/editorials for filtering (mirrors the
-- approach used for perks). Distinct from `city_name`, which is the city
-- guide's title subject. Defaults to 'Global' (applies everywhere).
--
-- Values are chosen from the `cities` table in the admin UI, with 'Global' as
-- the default option.

ALTER TABLE guides
  ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT 'Global';

COMMENT ON COLUMN guides.city IS 'Canonical city tag (city name or ''Global''), chosen from the cities table; used for hub filtering.';
