import { supabase } from './client';
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
 * Add a favorite for a player/location pair (idempotent).
 */
export const addFavorite = async (
  playerId: number,
  locationId: number
): Promise<void> => {
  const { error } = await supabase.from('player_location_favorites').insert({
    player_id: playerId,
    location_id: locationId,
  });

  if (error && error.code !== '23505') throw error;
};

/**
 * Remove a favorite for a player/location pair.
 */
export const removeFavorite = async (
  playerId: number,
  locationId: number
): Promise<void> => {
  const { error } = await supabase
    .from('player_location_favorites')
    .delete()
    .eq('player_id', playerId)
    .eq('location_id', locationId);

  if (error) throw error;
};

/**
 * List favorited place_ids for a player (lightweight map hydration).
 */
export const listFavoritePlaceIdsByPlayer = async (
  playerId: number
): Promise<string[]> => {
  const { data, error } = await supabase
    .from('player_location_favorites')
    .select('locations(place_id)')
    .eq('player_id', playerId)
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
 * List full location rows for a player's favorites (drawer/dashboard).
 */
export const listFavoriteLocationsByPlayer = async (
  playerId: number
): Promise<Location[]> => {
  const { data, error } = await supabase
    .from('player_location_favorites')
    .select(`created_at, locations(${LOCATION_COLUMNS})`)
    .eq('player_id', playerId)
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
