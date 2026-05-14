-- Admin-configurable title highlight phrases (city guides + editorials).
-- Run on existing databases after guides-schema.sql.

ALTER TABLE guides
  ADD COLUMN IF NOT EXISTS title_highlight_words TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN guides.title_highlight_words IS
  'Words or phrases in the article title to render with IRL yellow highlight; empty falls back to last word.';
