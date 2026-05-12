CREATE TABLE IF NOT EXISTS manual_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL DEFAULT '',
  date TIMESTAMPTZ NOT NULL,
  city TEXT NOT NULL,
  maps_link TEXT NOT NULL DEFAULT '',
  rsvp_link TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manual_events_date ON manual_events (date DESC);
