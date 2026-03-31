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

// Database field limits
export const MAX_VARCHAR_LENGTH = 255;

// Location system constants
export const MAX_LOCATIONS_PER_WEEK = 300;

// Supabase/PostgreSQL error codes
export const SUPABASE_ERROR_CODES = {
  NOT_FOUND: 'PGRST116',
} as const;
