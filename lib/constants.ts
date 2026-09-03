/**
 * Centralized constants used across the application.
 * Keep these in one place so changes propagate automatically.
 */

// Checkin system constants
export const DAILY_CHECKIN_POINTS = 100;
export const DAILY_CHECKPOINT_LIMIT = 10;

/** One-time IRL points for completing WalletCon Cannes claim login check-in */
export const WALLETCON_CANNES_CHECKIN_POINTS = 100;
export const WALLETCON_CANNES_CHECKIN_ACTIVITY_TYPE =
  'walletcon_cannes_checkin';
/** One-time IRL points for successfully minting the WalletCon Cannes NFT */
export const WALLETCON_CANNES_MINT_POINTS = 100;
export const WALLETCON_CANNES_MINT_ACTIVITY_TYPE = 'walletcon_cannes_mint';

// Database field limits
export const MAX_VARCHAR_LENGTH = 255;

/** Matches `locations.description VARCHAR(500)` — see `database/add-description-to-locations.sql`. */
export const MAX_LOCATION_DESCRIPTION_LENGTH = 500;

/** Matches `player_custom_lists.description VARCHAR(500)`. */
export const MAX_PLAYER_LIST_DESCRIPTION_LENGTH = 500;

/**
 * 2× export for the reward details modal hero (`393×212` CSS, `object-cover`).
 * Aspect is ~1.85:1 (393:212).
 */
export const PERK_HERO_IMAGE_DISPLAY_WIDTH = 393;
export const PERK_HERO_IMAGE_DISPLAY_HEIGHT = 212;
export const PERK_HERO_IMAGE_RECOMMENDED_WIDTH = 786;
export const PERK_HERO_IMAGE_RECOMMENDED_HEIGHT = 424;
export const PERK_HERO_IMAGE_RECOMMENDED_ASPECT = '1.85:1';

/**
 * 2× export for the rewards overview thumbnail (`107×107` CSS, `object-cover`).
 */
export const PERK_THUMBNAIL_IMAGE_DISPLAY_SIZE = 107;
export const PERK_THUMBNAIL_IMAGE_RECOMMENDED_WIDTH = 214;
export const PERK_THUMBNAIL_IMAGE_RECOMMENDED_HEIGHT = 214;
export const PERK_THUMBNAIL_IMAGE_RECOMMENDED_ASPECT = '1:1';

// Location system constants
export const MAX_LOCATIONS_PER_WEEK = 300;

/**
 * Max rows per request for admin location dropdown options (`listLocationOptions`).
 * Align with PostgREST `max_rows` (Supabase Dashboard → Project Settings → API).
 */
export const LOCATION_OPTIONS_MAX_ROWS = 1000;

// Supabase/PostgreSQL error codes
export const SUPABASE_ERROR_CODES = {
  NOT_FOUND: 'PGRST116',
} as const;
