import { supabase } from './client';
import { LOCATION_OPTIONS_MAX_ROWS } from '../constants';
import type { Location, LocationOption } from '../types';
import { haversineDistanceMeters } from '../utils/location-autofill';

/** Same radius the map uses when Mapbox place_id ≠ IRL place_id. */
const NEARBY_PLACE_MATCH_MAX_METERS = 120;

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: string }).code === '23505';

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
  category_id,
  category:categories(id, name, slug),
  event_url,
  context,
  city,
  coin_address,
  coin_symbol,
  coin_name,
  coin_image_url,
  coin_image_thumb_url,
  coin_transaction_hash,
  creator_wallet_address,
  creator_username,
  is_visible,
  created_at
`;

/**
 * Look up an IRL location by Mapbox / Google place_id (may be null).
 */
export const getLocationByPlaceId = async (placeId: string) => {
  const id = placeId.trim();
  if (!id) return null;

  const { data, error } = await supabase
    .from('locations')
    .select(LOCATION_COLUMNS)
    .eq('place_id', id)
    .maybeSingle();

  if (error) throw error;
  return data as Location | null;
};

function normalizePlaceName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Score how well a candidate IRL name matches a Mapbox search name.
 * Higher is better; 0 means not a usable match (avoids snapping to a neighbor POI).
 */
function placeNameMatchScore(
  searchName: string,
  candidateName: string
): number {
  const a = normalizePlaceName(searchName);
  const b = normalizePlaceName(candidateName);
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (a.includes(b) || b.includes(a)) return 80;

  const aTokens = new Set(a.split(' ').filter(Boolean));
  const bTokens = new Set(b.split(' ').filter(Boolean));
  if (aTokens.size === 0 || bTokens.size === 0) return 0;

  let overlap = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) overlap += 1;
  }
  const ratio = overlap / Math.max(aTokens.size, bTokens.size);
  // Require most tokens to overlap so "Standard Time" ≠ "Blood Brothers"
  if (ratio >= 0.67 && overlap >= 2) return Math.round(ratio * 60);
  if (ratio === 1) return 70;
  return 0;
}

/**
 * Resolve an IRL location for a Mapbox search pick: exact place_id, else a nearby
 * pin within ~120m whose name matches the search result (not merely nearest).
 */
export const resolveLocationForSearchPick = async (input: {
  placeId: string;
  latitude: number;
  longitude: number;
  name?: string | null;
  maxMeters?: number;
}): Promise<Location | null> => {
  const byId = await getLocationByPlaceId(input.placeId);
  if (byId) return byId;

  const searchName = input.name?.trim();
  if (!searchName) return null;

  const maxMeters = input.maxMeters ?? NEARBY_PLACE_MATCH_MAX_METERS;
  // ~0.002° ≈ 220m — bounding box before haversine filter
  const delta = 0.002;
  const { data, error } = await supabase
    .from('locations')
    .select(LOCATION_COLUMNS)
    .eq('is_visible', true)
    .gte('latitude', input.latitude - delta)
    .lte('latitude', input.latitude + delta)
    .gte('longitude', input.longitude - delta)
    .lte('longitude', input.longitude + delta)
    .limit(50);

  if (error) throw error;
  if (!data?.length) return null;

  let best: Location | null = null;
  let bestScore = 0;
  let bestD = Infinity;

  for (const row of data as Location[]) {
    const d = haversineDistanceMeters(
      input.latitude,
      input.longitude,
      row.latitude,
      row.longitude
    );
    if (d > maxMeters) continue;

    const score = placeNameMatchScore(searchName, row.name);
    if (score <= 0) continue;

    if (score > bestScore || (score === bestScore && d < bestD)) {
      best = row;
      bestScore = score;
      bestD = d;
    }
  }

  return best;
};

/**
 * Create a location or return existing one by place_id.
 * On unique conflict (concurrent creators), returns the existing row without
 * updating it — `upsert` would overwrite fields like `is_visible` and
 * `creator_wallet_address`, breaking moderation and the hidden-location gate.
 */
export const createOrGetLocation = async (
  locationData: Omit<Location, 'id' | 'created_at' | 'category'>
) => {
  const { data: existingLocation, error: selectError } = await supabase
    .from('locations')
    .select(LOCATION_COLUMNS)
    .eq('place_id', locationData.place_id)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existingLocation) {
    return existingLocation;
  }

  const { data: inserted, error: insertError } = await supabase
    .from('locations')
    .insert(locationData)
    .select(LOCATION_COLUMNS)
    .single();

  if (!insertError) {
    return inserted;
  }

  if (isUniqueViolation(insertError)) {
    const { data: afterRace, error: fetchError } = await supabase
      .from('locations')
      .select(LOCATION_COLUMNS)
      .eq('place_id', locationData.place_id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (afterRace) return afterRace;
  }

  throw insertError;
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
        id, name, address, latitude, longitude, place_id, points_value, category_id, category:categories(id, name, slug), context, created_at
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
      | 'coin_image_thumb_url'
      | 'category_id'
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
  // Embedded `category` is a single object at runtime (many-to-one join),
  // but supabase-js statically infers it as an array.
  return data as unknown as Location;
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

const LOCATION_OPTION_COLUMNS =
  'id, name, address, latitude, longitude, place_id';

function mergeLocationOptionsByIdNameFirst(
  primary: LocationOption[],
  secondary: LocationOption[],
  max: number
): LocationOption[] {
  const seen = new Set<number>();
  const out: LocationOption[] = [];

  for (const row of primary) {
    const id = row.id;
    if (typeof id !== 'number') continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(row);
    if (out.length >= max) return out;
  }

  for (const row of secondary) {
    const id = row.id;
    if (typeof id !== 'number') continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(row);
    if (out.length >= max) return out;
  }

  return out;
}

/**
 * List location options for search/dropdowns with optional search filter.
 * Without a search term, returns the newest locations (by `created_at`).
 * With a search term, matches `name` OR `address` (case-insensitive).
 */
export const listLocationOptions = async (
  search?: string,
  limit: number = LOCATION_OPTIONS_MAX_ROWS
): Promise<LocationOption[]> => {
  const lim = Math.min(Math.max(limit, 1), LOCATION_OPTIONS_MAX_ROWS);

  const trimmed = search?.trim() ?? '';

  if (trimmed === '') {
    const { data, error } = await supabase
      .from('locations')
      .select(LOCATION_OPTION_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(lim);

    if (error) throw error;
    return (data || []) as LocationOption[];
  }

  const sanitized = trimmed.replace(/%/g, '\\%').replace(/_/g, '\\_');
  const pattern = `%${sanitized}%`;

  const nameQuery = supabase
    .from('locations')
    .select(LOCATION_OPTION_COLUMNS)
    .ilike('name', pattern)
    .order('created_at', { ascending: false })
    .limit(lim);

  const addressQuery = supabase
    .from('locations')
    .select(LOCATION_OPTION_COLUMNS)
    .ilike('address', pattern)
    .order('created_at', { ascending: false })
    .limit(lim);

  const [
    { data: nameRows, error: nameErr },
    { data: addrRows, error: addrErr },
  ] = await Promise.all([nameQuery, addressQuery]);

  if (nameErr) throw nameErr;
  if (addrErr) throw addrErr;

  return mergeLocationOptionsByIdNameFirst(
    (nameRows || []) as LocationOption[],
    (addrRows || []) as LocationOption[],
    lim
  );
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
