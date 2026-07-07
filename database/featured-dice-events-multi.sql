-- Allow up to 3 homepage featured events (DICE + manual combined; cap enforced in app layer).
-- Replaces singleton featured_dice_event with a multi-row table.

CREATE TABLE IF NOT EXISTS featured_dice_events (
  dice_event_id TEXT PRIMARY KEY,
  featured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE featured_dice_events IS
  'DICE events featured on the homepage Upcoming Events section. Up to 3 total across DICE + manual (enforced in app layer).';
COMMENT ON COLUMN featured_dice_events.dice_event_id IS
  'Base64-encoded DICE event id (e.g. RXZlbnQ6NjA0ODM=).';

-- Migrate existing singleton row if the old table exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'featured_dice_event'
  ) THEN
    INSERT INTO featured_dice_events (dice_event_id, featured_at)
    SELECT dice_event_id, updated_at
    FROM featured_dice_event
    ON CONFLICT (dice_event_id) DO NOTHING;

    DROP TABLE featured_dice_event;
  END IF;
END $$;

COMMENT ON COLUMN manual_events.is_featured IS
  'When true, shown on the homepage Upcoming Events section. Up to 3 total across DICE + manual (enforced in app layer).';
