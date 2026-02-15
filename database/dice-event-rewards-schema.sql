-- Track DICE event rewards to enforce one-award-per-event.
-- UNIQUE on dice_event_id prevents double-awarding.

CREATE TABLE IF NOT EXISTS dice_event_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dice_event_id TEXT NOT NULL UNIQUE,
  dice_event_name TEXT,
  points_per_holder INTEGER NOT NULL,
  total_holders_found INTEGER NOT NULL,
  matched_players INTEGER NOT NULL,
  unmatched_holders INTEGER NOT NULL,
  total_points_awarded INTEGER NOT NULL,
  awarded_by_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dice_event_rewards_event_id ON dice_event_rewards (dice_event_id);
