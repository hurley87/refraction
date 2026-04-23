-- City guides & editorials CMS (Supabase / Postgres)
-- Apply in SQL editor or migration pipeline after `location_lists` exists.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('city_guide', 'editorial')),

  -- City guide title (CityGuideArticleTitle)
  title_prefix TEXT,
  city_name TEXT,
  -- Editorial title (EditorialArticleTitle)
  title_primary TEXT,
  title_secondary TEXT,

  hero_image_url TEXT NOT NULL DEFAULT '',
  hero_image_alt TEXT NOT NULL DEFAULT '',

  lead_headline TEXT,
  lead_paragraphs TEXT[] NOT NULL DEFAULT '{}',

  -- City guide only: venue list + static map rail
  location_list_id UUID REFERENCES location_lists (id) ON DELETE SET NULL,
  map_image_url TEXT,
  map_image_alt TEXT,

  -- Editorial only: block stream (validated in app via Zod)
  blocks JSONB,

  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,

  -- Hub / list card + featured hero
  card_preview TEXT,
  card_image_url TEXT,
  card_image_alt TEXT,
  featured_people TEXT[] NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guides_published_at ON guides (is_published, published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_guides_kind_published ON guides (kind, is_published);

CREATE TABLE IF NOT EXISTS guide_contributors (
  guide_id UUID NOT NULL REFERENCES guides (id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  name TEXT NOT NULL,
  bio TEXT,
  photo_url TEXT,
  photo_alt TEXT,
  instagram_href TEXT,
  PRIMARY KEY (guide_id, position),
  CONSTRAINT guide_contributors_position_non_negative CHECK (position >= 0)
);

CREATE TABLE IF NOT EXISTS guide_location_overrides (
  guide_id UUID NOT NULL REFERENCES guides (id) ON DELETE CASCADE,
  location_id INTEGER NOT NULL REFERENCES locations (id) ON DELETE CASCADE,
  contributor_name TEXT,
  PRIMARY KEY (guide_id, location_id)
);

COMMENT ON TABLE guides IS 'CMS articles: city guides (venue lists) and editorials (block body).';
COMMENT ON COLUMN guides.blocks IS 'Editorial only: JSON array of { type, ... } blocks; see lib/guides/block-schema.ts';
