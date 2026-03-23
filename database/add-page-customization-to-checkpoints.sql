-- Add page layout customization columns to checkpoints table
-- These allow CMS-driven styling of the /c/[id] pages

ALTER TABLE checkpoints ADD COLUMN IF NOT EXISTS background_gradient TEXT;
ALTER TABLE checkpoints ADD COLUMN IF NOT EXISTS font_family TEXT;
ALTER TABLE checkpoints ADD COLUMN IF NOT EXISTS font_color TEXT;
ALTER TABLE checkpoints ADD COLUMN IF NOT EXISTS footer_title TEXT;
ALTER TABLE checkpoints ADD COLUMN IF NOT EXISTS footer_description TEXT;
ALTER TABLE checkpoints ADD COLUMN IF NOT EXISTS cta_text TEXT;
ALTER TABLE checkpoints ADD COLUMN IF NOT EXISTS cta_url TEXT;
