-- Migration: Add partner_image_url column to checkpoints table
-- This allows checkpoints to have an optional partner logo image

ALTER TABLE checkpoints
ADD COLUMN IF NOT EXISTS partner_image_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN checkpoints.partner_image_url IS 'Optional partner logo image URL stored in Supabase Storage';

