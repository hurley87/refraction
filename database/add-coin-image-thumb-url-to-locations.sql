-- Thumbnail URL for map pin locators (128px WebP generated at upload time).
ALTER TABLE locations ADD COLUMN IF NOT EXISTS coin_image_thumb_url text;
