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
  city,
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
      | 'city'
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
 * Permanently delete a location by ID (admin use).
 * @returns true if a row was deleted, false if no matching location
 */
export const deleteLocationById = async (
  locationId: number
): Promise<boolean> => {
  const { data, error } = await supabase
    .from('locations')
    .delete()
    .eq('id', locationId)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  return data != null;
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

export type CityMetric = {
  city: string;
  total_spots: number;
  visible_spots: number;
  latest_spot_at: string | null;
};

type CityMetricLocationRow = {
  city: string | null;
  is_visible: boolean | null;
  created_at: string | null;
};

const isMissingCityMetricsRpc = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? (error as { code?: string }).code : undefined;
  const message =
    'message' in error ? (error as { message?: string }).message : undefined;

  return (
    code === 'PGRST202' ||
    Boolean(message?.toLowerCase().includes('get_city_metrics'))
  );
};

const buildCityMetricsFromLocations = (
  rows: CityMetricLocationRow[]
): CityMetric[] => {
  const metricsByCity = new Map<string, CityMetric>();

  for (const row of rows) {
    const normalizedCity = row.city?.trim() ? row.city.trim() : 'Unknown';
    const existing = metricsByCity.get(normalizedCity) ?? {
      city: normalizedCity,
      total_spots: 0,
      visible_spots: 0,
      latest_spot_at: null,
    };

    existing.total_spots += 1;
    if (row.is_visible) {
      existing.visible_spots += 1;
    }

    if (
      row.created_at &&
      (!existing.latest_spot_at || row.created_at > existing.latest_spot_at)
    ) {
      existing.latest_spot_at = row.created_at;
    }

    metricsByCity.set(normalizedCity, existing);
  }

  return Array.from(metricsByCity.values()).sort(
    (a, b) => b.visible_spots - a.visible_spots || a.city.localeCompare(b.city)
  );
};

/**
 * Aggregate spot counts by city for the admin metrics dashboard.
 * Uses a raw RPC call since Supabase JS doesn't support GROUP BY natively.
 */
export const getCityMetrics = async (): Promise<CityMetric[]> => {
  const { data, error } = await supabase.rpc('get_city_metrics');
  if (!error) {
    return (data || []) as CityMetric[];
  }

  if (!isMissingCityMetricsRpc(error)) {
    throw error;
  }

  console.warn(
    '[getCityMetrics] get_city_metrics RPC missing; using fallback aggregation query.'
  );

  const { data: locationRows, error: locationError } = await supabase
    .from('locations')
    .select('city, is_visible, created_at');

  if (locationError) {
    throw locationError;
  }

  return buildCityMetricsFromLocations(
    (locationRows ?? []) as CityMetricLocationRow[]
  );
};
