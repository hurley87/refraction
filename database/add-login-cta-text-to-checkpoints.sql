-- Migration: Add login_cta_text column to checkpoints table
-- Allows admins to customize the login button label on /c/[id] pages

ALTER TABLE checkpoints
ADD COLUMN IF NOT EXISTS login_cta_text TEXT;

COMMENT ON COLUMN checkpoints.login_cta_text IS 'Optional custom text for the login CTA button on /c/[id]; leave null for default label';
