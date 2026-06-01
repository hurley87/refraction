CREATE TABLE IF NOT EXISTS manual_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL DEFAULT '',
  date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  city TEXT NOT NULL,
  maps_link TEXT NOT NULL DEFAULT '',
  rsvp_link TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN manual_events.date IS 'Event start date. Single-day when end_date is null.';
COMMENT ON COLUMN manual_events.end_date IS 'Optional event end date for multi-day events; must be on or after date when set.';

CREATE INDEX IF NOT EXISTS idx_manual_events_date ON manual_events (date DESC);
