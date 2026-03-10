-- Migration: Add checkpoint_mode to checkpoints table
-- Allows unified /c/[id] pages to support both earning and spend-redemption flows

ALTER TABLE checkpoints
ADD COLUMN IF NOT EXISTS checkpoint_mode TEXT NOT NULL DEFAULT 'checkin'
CHECK (checkpoint_mode IN ('checkin', 'spend'));

COMMENT ON COLUMN checkpoints.checkpoint_mode IS 'Flow type for /c/[id]: checkin (earn points) or spend (redeem points once).';
