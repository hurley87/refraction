-- Instagram handle for profile social links (dashboard, menus, public profile).
ALTER TABLE players ADD COLUMN IF NOT EXISTS instagram_handle VARCHAR(50);
