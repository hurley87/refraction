-- Feature one manual event on the homepage IRL Tour section.
ALTER TABLE manual_events
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN manual_events.is_featured IS
  'When true, this event is shown on the homepage Upcoming Events section. Only one should be featured at a time (enforced in app layer).';

CREATE INDEX IF NOT EXISTS idx_manual_events_is_featured
ON manual_events (is_featured)
WHERE is_featured = true;
