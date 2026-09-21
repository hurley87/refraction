-- One-time profile rewards. The partial unique index makes each grant
-- idempotent without affecting repeatable activity types such as check-ins.
CREATE UNIQUE INDEX IF NOT EXISTS
  idx_points_activities_profile_reward_once
ON points_activities (user_wallet_address, activity_type)
WHERE activity_type IN (
  'profile_field_picture',
  'profile_field_name',
  'profile_field_bio',
  'profile_field_instagram',
  'profile_field_favorite_club',
  'profile_field_favorite_bar',
  'profile_field_favorite_restaurant',
  'profile_complete'
);

INSERT INTO points_activity_config (
  activity_type,
  name,
  description,
  icon,
  category,
  base_points,
  max_total_points,
  is_active
)
VALUES
  ('profile_field_picture', 'Add Profile Picture', 'Add a profile picture to your profile', '🖼️', 'onboarding', 100, 100, true),
  ('profile_field_name', 'Add Name', 'Add your display name to your profile', '👤', 'onboarding', 100, 100, true),
  ('profile_field_bio', 'Add Bio', 'Add a bio to your profile', '✍️', 'onboarding', 100, 100, true),
  ('profile_field_instagram', 'Add Instagram Handle', 'Add your Instagram handle to your profile', '📷', 'social', 100, 100, true),
  ('profile_field_favorite_club', 'Add Favorite Club', 'Add your favorite club to your profile', '🎵', 'onboarding', 100, 100, true),
  ('profile_field_favorite_bar', 'Add Favorite Bar', 'Add your favorite bar to your profile', '🍸', 'onboarding', 100, 100, true),
  ('profile_field_favorite_restaurant', 'Add Favorite Restaurant', 'Add your favorite restaurant to your profile', '🍽️', 'onboarding', 100, 100, true),
  ('profile_complete', 'Complete Profile', 'Fill all seven profile fields', '👤', 'onboarding', 300, 300, true)
ON CONFLICT (activity_type) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  base_points = EXCLUDED.base_points,
  max_total_points = EXCLUDED.max_total_points,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
