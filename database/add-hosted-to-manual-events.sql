-- Add a `hosted` flag to manual_events so we can mark events that are hosted
-- by IRL (as opposed to events we merely list/promote).
--
-- The column is NOT NULL with a default of false, so every existing row is
-- backfilled to false automatically and new rows default to false unless set.

ALTER TABLE manual_events
ADD COLUMN IF NOT EXISTS hosted BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN manual_events.hosted IS 'True when the event is hosted by IRL; false for events we only list/promote.';
