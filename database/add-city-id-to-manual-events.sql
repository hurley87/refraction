-- Link manual_events to the canonical cities table so events can be filtered
-- by a stable city id/slug instead of free text.
--
-- Apply AFTER database/cities-schema.sql. The legacy `manual_events.city`
-- text column is kept as a denormalized display value (and for back-compat
-- with existing rendering); `city_id` is the new canonical reference.

ALTER TABLE manual_events
ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES cities (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_manual_events_city_id
  ON manual_events (city_id);

COMMENT ON COLUMN manual_events.city_id IS 'Canonical city reference (cities.id). The legacy `city` text column remains for display/back-compat.';

-- Backfill: create a canonical city for each distinct existing free-text value,
-- then link existing rows to it. Slugs are derived from the lowercased name.
INSERT INTO cities (name, slug)
SELECT DISTINCT
  TRIM(city) AS name,
  REGEXP_REPLACE(
    REGEXP_REPLACE(LOWER(TRIM(city)), '[^a-z0-9]+', '-', 'g'),
    '(^-+|-+$)', '', 'g'
  ) AS slug
FROM manual_events
WHERE city IS NOT NULL
  AND TRIM(city) <> ''
ON CONFLICT (slug) DO NOTHING;

UPDATE manual_events me
SET city_id = c.id
FROM cities c
WHERE me.city_id IS NULL
  AND me.city IS NOT NULL
  AND REGEXP_REPLACE(
        REGEXP_REPLACE(LOWER(TRIM(me.city)), '[^a-z0-9]+', '-', 'g'),
        '(^-+|-+$)', '', 'g'
      ) = c.slug;
