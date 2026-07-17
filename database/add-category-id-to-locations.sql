-- Migrate locations venue category from the free-text `type` column (slug
-- strings like 'cafe', with legacy typos like 'cafes') to a proper
-- `category_id UUID` foreign key into `categories`.
--
-- PHASE 1 is safe to run while the old app code is still live (it only adds
-- a column). Deploy the app code that reads `category_id`, then run PHASE 2
-- to drop the legacy `type` column.

-- ============================== PHASE 1 =====================================

-- 1) Add the FK column.
ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id);

-- 2) Backfill from existing slugs, normalizing known aliases
--    (e.g. 61 rows stored 'cafes' but the canonical slug is 'cafe').
UPDATE locations l
SET category_id = c.id
FROM categories c
WHERE l.category_id IS NULL
  AND l.type IS NOT NULL
  AND c.slug = CASE lower(trim(l.type))
    WHEN 'cafes' THEN 'cafe'
    WHEN 'coffee & cafés' THEN 'cafe'
    WHEN 'coffee & cafes' THEN 'cafe'
    ELSE lower(trim(l.type))
  END;

-- 3) Verify nothing unexpected is left unmapped ('location' was the old
--    free-text default and intentionally has no category).
--    Expected: 0 rows.
SELECT id, name, type
FROM locations
WHERE category_id IS NULL
  AND type IS NOT NULL
  AND lower(trim(type)) NOT IN ('', 'location');

-- 4) Index for filtering by category.
CREATE INDEX IF NOT EXISTS idx_locations_category_id
  ON locations (category_id);

COMMENT ON COLUMN locations.category_id IS 'Venue category (FK to categories.id); replaces the legacy free-text type column.';

-- Make PostgREST pick up the new column/relationship immediately.
NOTIFY pgrst, 'reload schema';

-- ============================== PHASE 2 =====================================
-- Run ONLY after the app code that reads `category_id` is deployed
-- (the old code still selects `locations.type` and would break).

-- ALTER TABLE locations DROP COLUMN IF EXISTS type;
-- NOTIFY pgrst, 'reload schema';
