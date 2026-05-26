-- Add optional description column to sponsored_activation table.
-- Allows admins to set a human-readable description displayed on the public
-- activation landing page (both authenticated and unauthenticated views).

ALTER TABLE sponsored_activation
    ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN sponsored_activation.description IS
    'Optional public-facing description shown on the activation landing page.';
