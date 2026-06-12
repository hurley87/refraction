-- Canonical, admin-managed list of cities used as a stable dimension for
-- filtering (events now, city-guides hub and player profiles later).
--
-- Free-text city values live in several places (manual_events.city, DICE
-- venue.city, locations.city, guides.city_name). Those cannot be reliably
-- grouped, so this table provides a curated set with a stable `slug` filter
-- key and an `aliases` array used to map external/free-text strings (e.g.
-- DICE "NYC") onto the canonical city.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  country TEXT,
  -- Alternate spellings/abbreviations matched (case-insensitively) against
  -- free-text city strings to resolve them to this canonical city.
  aliases TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cities_active_sort
  ON cities (is_active, sort_order, name);

COMMENT ON TABLE cities IS 'Canonical, admin-managed cities used as a filter dimension across events, guides, and profiles.';
COMMENT ON COLUMN cities.slug IS 'Stable, URL-safe identifier used as the filter key.';
COMMENT ON COLUMN cities.aliases IS 'Alternate names matched case-insensitively to resolve free-text/external city strings (e.g. DICE venue.city).';
