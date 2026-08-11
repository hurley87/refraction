import { supabase } from './client';
import type {
  Location,
  PlayerCustomList,
  PlayerCustomListWithCount,
} from '../types';

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

/** A player custom list plus its full location rows (drawer "Your lists"). */
export type PlayerCustomListWithLocations = PlayerCustomListWithCount & {
  locations: Location[];
};

/**
 * Create a custom list for a player.
 */
export const createCustomList = async (
  playerId: number,
  input: { title: string; thumbnailUrl?: string | null; isPrivate: boolean }
): Promise<PlayerCustomList> => {
  const { data, error } = await supabase
    .from('player_custom_lists')
    .insert({
      player_id: playerId,
      title: input.title,
      thumbnail_url: input.thumbnailUrl ?? null,
      is_private: input.isPrivate,
    })
    .select()
    .single();

  if (error) throw error;
  return data as PlayerCustomList;
};

/**
 * List a player's custom lists with location counts. When `locationId` is
 * provided, each list also reports whether it already contains that location.
 */
export const listCustomListsByPlayer = async (
  playerId: number,
  locationId?: number | null
): Promise<PlayerCustomListWithCount[]> => {
  const { data, error } = await supabase
    .from('player_custom_lists')
    .select('*, player_custom_list_items(location_id)')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map(({ player_custom_list_items, ...list }) => {
    const items = (player_custom_list_items ?? []) as Array<{
      location_id: number;
    }>;
    return {
      ...(list as PlayerCustomList),
      location_count: items.length,
      contains_location:
        locationId != null
          ? items.some((item) => item.location_id === locationId)
          : undefined,
    };
  });
};

/**
 * List a player's custom lists including full location rows.
 */
export const listCustomListsWithLocationsByPlayer = async (
  playerId: number
): Promise<PlayerCustomListWithLocations[]> => {
  const { data, error } = await supabase
    .from('player_custom_lists')
    .select(
      `*, player_custom_list_items(location_id, locations(${LOCATION_COLUMNS}))`
    )
    .eq('player_id', playerId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map(({ player_custom_list_items, ...list }) => {
    const items = (player_custom_list_items ?? []) as Array<{
      location_id: number;
      locations: Location | Location[] | null;
    }>;
    const locations = items
      .map((item) =>
        Array.isArray(item.locations) ? item.locations[0] : item.locations
      )
      .filter((loc): loc is Location => loc != null);

    return {
      ...(list as PlayerCustomList),
      location_count: locations.length,
      locations,
    };
  });
};

/** Compact public-profile card for a non-private personal list. */
export type PublicPlayerListCard = {
  id: string;
  title: string;
  location_count: number;
  image_url: string | null;
  preview_place: {
    place_id: string;
    latitude: number;
    longitude: number;
  } | null;
};

/**
 * Public (non-private) custom lists for a profile, with thumbnail / first-spot image.
 */
export const listPublicCustomListsForProfile = async (
  playerId: number
): Promise<PublicPlayerListCard[]> => {
  const { data, error } = await supabase
    .from('player_custom_lists')
    .select(
      `*, player_custom_list_items(location_id, locations(${LOCATION_COLUMNS}))`
    )
    .eq('player_id', playerId)
    .eq('is_private', false)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map(({ player_custom_list_items, ...list }) => {
    const items = (player_custom_list_items ?? []) as Array<{
      location_id: number;
      locations: Location | Location[] | null;
    }>;
    const locations = items
      .map((item) =>
        Array.isArray(item.locations) ? item.locations[0] : item.locations
      )
      .filter((loc): loc is Location => loc != null);
    const first = locations[0];

    return {
      id: (list as PlayerCustomList).id,
      title: (list as PlayerCustomList).title,
      location_count: locations.length,
      image_url:
        (list as PlayerCustomList).thumbnail_url ||
        first?.coin_image_thumb_url ||
        first?.coin_image_url ||
        null,
      preview_place: first
        ? {
            place_id: first.place_id,
            latitude: first.latitude,
            longitude: first.longitude,
          }
        : null,
    };
  });
};

/**
 * Add a location to multiple lists owned by the player (idempotent).
 * Returns the number of lists the location now belongs to.
 */
export const addLocationToLists = async (
  playerId: number,
  locationId: number,
  listIds: string[]
): Promise<void> => {
  if (listIds.length === 0) return;

  // Only allow inserts into lists owned by this player.
  const { data: ownedLists, error: ownedError } = await supabase
    .from('player_custom_lists')
    .select('id')
    .eq('player_id', playerId)
    .in('id', listIds);

  if (ownedError) throw ownedError;

  const ownedIds = (ownedLists ?? []).map((row) => row.id as string);
  if (ownedIds.length === 0) return;

  const { error } = await supabase.from('player_custom_list_items').upsert(
    ownedIds.map((listId) => ({
      list_id: listId,
      location_id: locationId,
    })),
    { onConflict: 'list_id,location_id', ignoreDuplicates: true }
  );

  if (error) throw error;
};

/**
 * Update privacy for a custom list owned by the player.
 * Returns the updated list, or null when the list was not found / not owned.
 */
export const updateCustomListPrivacy = async (
  playerId: number,
  listId: string,
  isPrivate: boolean
): Promise<PlayerCustomList | null> => {
  const { data, error } = await supabase
    .from('player_custom_lists')
    .update({ is_private: isPrivate })
    .eq('id', listId)
    .eq('player_id', playerId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return (data as PlayerCustomList | null) ?? null;
};

/**
 * Delete a custom list owned by the player (items cascade).
 * Returns true when a list was actually deleted.
 */
export const deleteCustomList = async (
  playerId: number,
  listId: string
): Promise<boolean> => {
  const { data, error } = await supabase
    .from('player_custom_lists')
    .delete()
    .eq('id', listId)
    .eq('player_id', playerId)
    .select('id');

  if (error) throw error;
  return (data ?? []).length > 0;
};

/**
 * Count how many of the player's lists contain the given location.
 */
export const countListsContainingLocation = async (
  playerId: number,
  locationId: number
): Promise<number> => {
  const { data, error } = await supabase
    .from('player_custom_list_items')
    .select('id, player_custom_lists!inner(player_id)')
    .eq('location_id', locationId)
    .eq('player_custom_lists.player_id', playerId);

  if (error) throw error;
  return (data ?? []).length;
};
