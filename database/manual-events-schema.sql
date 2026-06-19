CREATE TABLE IF NOT EXISTS manual_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL DEFAULT '',
  date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  city TEXT NOT NULL,
  maps_link TEXT NOT NULL DEFAULT '',
  rsvp_link TEXT NOT NULL DEFAULT '',
  hosted BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN manual_events.date IS 'Event start date. Single-day when end_date is null.';
COMMENT ON COLUMN manual_events.end_date IS 'Optional event end date for multi-day events; must be on or after date when set.';
COMMENT ON COLUMN manual_events.hosted IS 'True when the event is hosted by IRL; false for events we only list/promote.';
COMMENT ON COLUMN manual_events.is_featured IS 'When true, shown on the homepage Upcoming Events section; only one should be featured at a time.';

CREATE INDEX IF NOT EXISTS idx_manual_events_date ON manual_events (date DESC);
CREATE INDEX IF NOT EXISTS idx_manual_events_is_featured ON manual_events (is_featured) WHERE is_featured = true;
