-- Canonical, admin-managed list of venue/perk categories used as a stable,
-- reusable dimension across the app (perks now; map/location filters later).
--
-- Perk "type" was previously a small hard-coded enum in the admin UI. This
-- table replaces that with a curated, slug-keyed set so categories can be
-- managed in one place and reused by other sections (e.g. the map).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_active_sort
  ON categories (is_active, sort_order, name);

COMMENT ON TABLE categories IS 'Canonical, admin-managed categories (venue/perk types) reused across perks and the map.';
COMMENT ON COLUMN categories.slug IS 'Stable, URL-safe identifier persisted on perks.type and used as the matching key.';

-- Seed the initial 16 categories (alphabetical). Re-runnable: existing slugs
-- are left untouched.
INSERT INTO categories (name, slug, sort_order)
VALUES
  ('Bar', 'bar', 0),
  ('Cafe', 'cafe', 1),
  ('Club', 'club', 2),
  ('Coffee', 'coffee', 3),
  ('Conference', 'conference', 4),
  ('Festival', 'festival', 5),
  ('Gallery', 'gallery', 6),
  ('Hotel', 'hotel', 7),
  ('In-Between', 'in-between', 8),
  ('Membership', 'membership', 9),
  ('Mobility', 'mobility', 10),
  ('Performance Venue', 'performance-venue', 11),
  ('Restaurant', 'restaurant', 12),
  ('Shop', 'shop', 13),
  ('Software', 'software', 14),
  ('Wellness', 'wellness', 15)
ON CONFLICT (slug) DO NOTHING;
