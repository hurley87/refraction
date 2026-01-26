-- Indexes Migration
-- Run during low-traffic period as indexes will briefly lock tables during creation
-- Can be run as a single batch in Supabase SQL Editor

-- Enable pg_trgm extension for text search (safe, no data changes)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =============================================================================
-- Players table (CRITICAL - used in every request)
-- =============================================================================

-- Index for EVM wallet lookups
CREATE INDEX IF NOT EXISTS idx_players_wallet_address 
ON players(wallet_address);

-- Index for Solana wallet lookups
CREATE INDEX IF NOT EXISTS idx_players_solana_wallet 
ON players(solana_wallet_address);

-- Index for Stellar wallet lookups
CREATE INDEX IF NOT EXISTS idx_players_stellar_wallet 
ON players(stellar_wallet_address);

-- Index for email lookups (used for account linking)
CREATE INDEX IF NOT EXISTS idx_players_email 
ON players(email);

-- Index for leaderboard queries (total_points DESC)
CREATE INDEX IF NOT EXISTS idx_players_total_points 
ON players(total_points DESC);

-- =============================================================================
-- Check-ins table
-- =============================================================================

-- Composite index for duplicate check-in detection (player_id, location_id)
CREATE INDEX IF NOT EXISTS idx_checkins_player_location 
ON player_location_checkins(player_id, location_id);

-- Index for check-in history queries (ordered by time)
CREATE INDEX IF NOT EXISTS idx_checkins_checkin_at 
ON player_location_checkins(checkin_at DESC);

-- Index for player's check-in count queries
CREATE INDEX IF NOT EXISTS idx_checkins_player_id 
ON player_location_checkins(player_id);

-- =============================================================================
-- Locations table
-- =============================================================================

-- Index for Google Place ID lookups (upsert operations)
CREATE INDEX IF NOT EXISTS idx_locations_place_id 
ON locations(place_id);

-- Trigram index for fuzzy text search on location names
CREATE INDEX IF NOT EXISTS idx_locations_name_trgm 
ON locations USING gin(name gin_trgm_ops);

-- Partial index for visible locations only
CREATE INDEX IF NOT EXISTS idx_locations_visible 
ON locations(id) WHERE is_visible = true;

-- =============================================================================
-- Perks and redemptions
-- =============================================================================

-- Partial index for available (unclaimed) discount codes
CREATE INDEX IF NOT EXISTS idx_perk_codes_available 
ON perk_discount_codes(perk_id, is_claimed) WHERE is_claimed = false;

-- Composite index for user redemption lookups
CREATE INDEX IF NOT EXISTS idx_redemptions_user_perk 
ON user_perk_redemptions(user_wallet_address, perk_id);

-- Partial index for active perks only
CREATE INDEX IF NOT EXISTS idx_perks_active 
ON perks(points_threshold) WHERE is_active = true;

-- =============================================================================
-- Points activities
-- =============================================================================

-- Composite index for user activity lookups by type and date
CREATE INDEX IF NOT EXISTS idx_points_activities_user_type_created 
ON points_activities(user_wallet_address, activity_type, created_at DESC);

-- =============================================================================
-- Location lists
-- =============================================================================

-- Index for location list membership queries
CREATE INDEX IF NOT EXISTS idx_location_list_members_list_id 
ON location_list_members(list_id);

-- Index for finding which lists a location belongs to
CREATE INDEX IF NOT EXISTS idx_location_list_members_location_id 
ON location_list_members(location_id);
