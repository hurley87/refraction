import { supabase } from './client';
import { setPlayerVisitStatus } from './checkins';
import type { Location } from '../types';

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
 * Save a place as want to try. An existing been row stays been.
 */
export const addFavorite = async (
  playerId: number,
  locationId: number
): Promise<void> => {
  await setPlayerVisitStatus(playerId, locationId, 'want_to_try');
};

/**
 * Remove a want-to-try save. A been visit is left in place.
 */
export const removeFavorite = async (
  playerId: number,
  locationId: number
): Promise<void> => {
  const { error } = await supabase
    .from('player_location_checkins')
    .delete()
    .eq('player_id', playerId)
    .eq('location_id', locationId)
    .eq('visit_status', 'want_to_try');

  if (error) throw error;
};

/**
 * List want-to-try place_ids for a player (lightweight map hydration).
 */
export const listFavoritePlaceIdsByPlayer = async (
  playerId: number
): Promise<string[]> => {
  const { data, error } = await supabase
    .from('player_location_checkins')
    .select('locations(place_id)')
    .eq('player_id', playerId)
    .eq('visit_status', 'want_to_try')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? [])
    .map((row) => {
      const loc = Array.isArray(row.locations)
        ? row.locations[0]
        : row.locations;
      return (loc as { place_id?: string } | null)?.place_id;
    })
    .filter((id): id is string => Boolean(id));
};

/**
 * List full location rows the player wants to try (drawer/dashboard).
 */
export const listFavoriteLocationsByPlayer = async (
  playerId: number
): Promise<Location[]> => {
  const { data, error } = await supabase
    .from('player_location_checkins')
    .select(`created_at, locations(${LOCATION_COLUMNS})`)
    .eq('player_id', playerId)
    .eq('visit_status', 'want_to_try')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? [])
    .map((row) => {
      const location = Array.isArray(row.locations)
        ? row.locations[0]
        : row.locations;
      // Embedded `category` is a single object at runtime (many-to-one join),
      // but supabase-js statically infers it as an array.
      return location as unknown as Location | null;
    })
    .filter((loc): loc is Location => loc != null);
};
