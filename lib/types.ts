// Shared types safe for both client and server. Do NOT import server clients here.

/**
 * User account with multi-chain wallet support (EVM, Solana, Stellar)
 */
export type Player = {
  id?: number;
  wallet_address: string;
  solana_wallet_address?: string;
  stellar_wallet_address?: string;
  stellar_wallet_id?: string;
  email?: string;
  username?: string;
  total_points: number;
  created_at?: string;
  updated_at?: string;
};

/**
 * Check-in location with coordinates and coin data
 */
export type Location = {
  id?: number;
  name: string;
  address?: string | null;
  description?: string | null;
  latitude: number;
  longitude: number;
  place_id: string;
  points_value: number;
  type?: string;
  event_url?: string | null;
  context?: string;
  coin_address?: string;
  coin_symbol?: string;
  coin_name?: string;
  coin_image_url?: string | null;
  coin_transaction_hash?: string;
  creator_wallet_address?: string;
  creator_username?: string;
  is_visible?: boolean;
  created_at?: string;
};

/**
 * Record of user check-in at a location
 */
export type PlayerLocationCheckin = {
  id?: number;
  player_id: number;
  location_id: number;
  points_earned: number;
  checkin_at?: string;
  created_at?: string;
  comment?: string | null;
  image_url?: string | null;
};

/**
 * Aggregated player stats for ranking
 */
export type LeaderboardEntry = {
  player_id: number;
  wallet_address: string;
  username?: string;
  email?: string;
  total_points: number;
  total_checkins: number;
  rank: number;
};

/**
 * Curated collection of locations
 */
export type LocationList = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  accent_color?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * Location list with location count
 */
export type LocationListWithCount = LocationList & {
  location_count: number;
};

/**
 * Location membership in a location list
 */
export type LocationListLocation = {
  membership_id: number;
  list_id: string;
  location_id: number;
  created_at: string;
  location: Location;
};

/**
 * Simplified location option for dropdowns/search
 */
export type LocationOption = Pick<
  Location,
  'id' | 'name' | 'latitude' | 'longitude' | 'place_id'
>;

/**
 * Redeemable reward with points threshold
 */
export type Perk = {
  id?: string;
  title: string;
  description: string;
  location?: string;
  points_threshold: number;
  website_url?: string;
  type: string;
  end_date?: string;
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
  thumbnail_url?: string;
  hero_image?: string;
};

/**
 * Discount codes associated with perks
 */
export type PerkDiscountCode = {
  id?: string;
  perk_id: string;
  code: string;
  is_claimed?: boolean;
  claimed_by_wallet_address?: string;
  claimed_at?: string;
  created_at?: string;
  is_universal?: boolean;
};

/**
 * Record of perk redemption by user
 */
export type UserPerkRedemption = {
  id?: string;
  perk_id: string;
  discount_code_id: string;
  user_wallet_address: string;
  redeemed_at?: string;
  perk_discount_codes?: { code: string };
};

/**
 * Points-based membership tier
 */
export type Tier = {
  id: string;
  title: string;
  min_points: number;
  max_points: number | null;
  description: string;
  created_at: string;
  updated_at: string;
};

/**
 * Extended profile with social handles
 */
export type UserProfile = {
  id?: string;
  wallet_address: string;
  email?: string;
  name?: string;
  username?: string;
  website?: string;
  twitter_handle?: string;
  towns_handle?: string;
  farcaster_handle?: string;
  telegram_handle?: string;
  profile_picture_url?: string;
  created_at?: string;
  updated_at?: string;
};

// Legacy types for number assignment system
export type NumberAssignment = {
  id: number;
  user_address: string;
  assigned_number: number;
  created_at: string;
};

export type Notification = {
  id: number;
  user_address: string;
  created_at: string;
};

/**
 * Unified checkpoint for /c/[id] URLs
 * Supports multiple chain types (EVM, Solana, Stellar)
 */
export type ChainType = 'evm' | 'solana' | 'stellar';

export type Checkpoint = {
  id: string;
  name: string;
  description?: string | null;
  chain_type: ChainType;
  points_value: number;
  is_active: boolean;
  created_by?: string | null;
  partner_image_url?: string | null;
  created_at?: string;
  updated_at?: string;
};
