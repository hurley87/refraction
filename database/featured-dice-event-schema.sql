-- Singleton row storing the admin-selected DICE event for the homepage Upcoming Events section.
-- Only one featured event (manual or DICE) should be active at a time; see lib/db helpers.

CREATE TABLE IF NOT EXISTS featured_dice_event (
  id BOOLEAN PRIMARY KEY DEFAULT true,
  dice_event_id TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT featured_dice_event_singleton CHECK (id = true)
);

COMMENT ON TABLE featured_dice_event IS 'At most one row (id = true). When set, homepage resolves this DICE event live via GraphQL.';
COMMENT ON COLUMN featured_dice_event.dice_event_id IS 'Base64-encoded DICE event id (e.g. RXZlbnQ6NjA0ODM=).';
