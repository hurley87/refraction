/**
 * Centralized constants used across the application.
 * Keep these in one place so changes propagate automatically.
 */

// Checkin system constants
export const DAILY_CHECKIN_POINTS = 100;
export const DAILY_CHECKPOINT_LIMIT = 10;

// Database field limits
export const MAX_VARCHAR_LENGTH = 255;

// Location system constants
export const MAX_LOCATIONS_PER_DAY = 30;

// Supabase/PostgreSQL error codes
export const SUPABASE_ERROR_CODES = {
  NOT_FOUND: "PGRST116",
} as const;
