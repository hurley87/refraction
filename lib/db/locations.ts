import { supabase } from './client';
import type { Location, LocationOption } from '../types';

// Select specific columns for location queries
const LOCATION_COLUMNS = `
  id,
  name,
  address,
  description,
  latitude,
  longitude,
  place_id,
  points_value,
  type,
  event_url,
  context,
  coin_address,
  coin_symbol,
  coin_name,
  coin_image_url,
  coin_transaction_hash,
  creator_wallet_address,
  creator_username,
  is_visible,
  created_at
`;

/**
 * Create a location or return existing one by place_id.
 * Uses upsert to prevent race conditions when multiple requests
 * try to create the same location simultaneously.
 */
export const createOrGetLocation = async (
  locationData: Omit<Location, 'id' | 'created_at'>
) => {
  // First try to find existing location
  const { data: existingLocation } = await supabase
    .from('locations')
    .select(LOCATION_COLUMNS)
    .eq('place_id', locationData.place_id)
    .single();

  if (existingLocation) {
    return existingLocation;
  }

  // Use upsert to handle race conditions - if another request created
  // the location between our select and insert, this will just return it
  const { data, error } = await supabase
    .from('locations')
    .upsert(locationData, {
      onConflict: 'place_id',
    })
    .select(LOCATION_COLUMNS)
    .single();

  if (error) throw error;
  return data;
};

/**
 * List all locations ordered by creation date
 */
export const listAllLocations = async () => {
  const { data, error } = await supabase
    .from('locations')
    .select(LOCATION_COLUMNS)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

/**
 * List locations checked in by a wallet address
 */
export const listLocationsByWallet = async (walletAddress: string) => {
  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('id')
    .eq('wallet_address', walletAddress)
    .single();

  if (playerError) return [];

  const { data, error } = await supabase
    .from('player_location_checkins')
    .select(
      `
      locations (
        id, name, address, latitude, longitude, place_id, points_value, type, context, created_at
      )
    `
    )
    .eq('player_id', player.id);

  if (error) throw error;
  return (data || []).map((row: any) => row.locations).filter(Boolean);
};

/**
 * Update location by ID
 */
export const updateLocationById = async (
  locationId: number,
  updates: Partial<
    Pick<
      Location,
      | 'name'
      | 'address'
      | 'place_id'
      | 'latitude'
      | 'longitude'
      | 'creator_wallet_address'
      | 'creator_username'
      | 'coin_image_url'
      | 'type'
      | 'event_url'
      | 'is_visible'
    >
  >
) => {
  const { data, error } = await supabase
    .from('locations')
    .update({
      ...updates,
    })
    .eq('id', locationId)
    .select(LOCATION_COLUMNS)
    .single();

  if (error) throw error;
  return data as Location;
};

/**
 * List location options for search/dropdowns with optional search filter
 */
export const listLocationOptions = async (
  search?: string,
  limit: number = 250
): Promise<LocationOption[]> => {
  let query = supabase
    .from('locations')
    .select('id, name, address, latitude, longitude, place_id')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (search && search.trim() !== '') {
    const sanitized = search.trim().replace(/%/g, '\\%').replace(/_/g, '\\_');
    query = query.ilike('name', `%${sanitized}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as LocationOption[];
};
