import { supabase } from './client';
import type {
  Location,
  PlayerCustomList,
  PlayerCustomListWithCount,
} from '../types';
import {
  allocateUniquePlayerListSlug,
  ensurePlayerCustomListSlug,
  rotatePlayerListSlugForTitle,
} from '@/lib/player-lists/list-slug';
import { normalizeUsername } from '@/lib/username';

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

/** Owner metadata for a public custom list shown in the map drawer. */
export type PublicCustomListOwner = {
  wallet_address: string;
  username: string | null;
  name: string | null;
  profile_picture_url: string | null;
  twitter_handle: string | null;
};

export type PublicCustomListWithLocations = PlayerCustomListWithLocations & {
  owner: PublicCustomListOwner;
};

export type PublicListShareLookup =
  | { kind: 'list'; list: PublicCustomListWithLocations }
  | { kind: 'redirect'; username: string; listSlug: string };

type PlayerProfileRow = {
  id?: number;
  wallet_address: string;
  username: string | null;
  name: string | null;
  profile_picture_url: string | null;
  twitter_handle: string | null;
};

function locationsFromListItems(player_custom_list_items: unknown): Location[] {
  const items = (player_custom_list_items ?? []) as Array<{
    location_id: number;
    locations: Location | Location[] | null;
  }>;
  return items
    .map((item) =>
      Array.isArray(item.locations) ? item.locations[0] : item.locations
    )
    .filter((loc): loc is Location => loc != null);
}

function ownerFromPlayer(player: PlayerProfileRow): PublicCustomListOwner {
  return {
    wallet_address: player.wallet_address,
    username: player.username ?? null,
    name: player.name ?? null,
    profile_picture_url: player.profile_picture_url ?? null,
    twitter_handle: player.twitter_handle ?? null,
  };
}

async function loadPlayerProfile(
  playerId: number
): Promise<PlayerProfileRow | null> {
  const { data: player, error } = await supabase
    .from('players')
    .select(
      'wallet_address, username, name, profile_picture_url, twitter_handle'
    )
    .eq('id', playerId)
    .maybeSingle();

  if (error) throw error;
  if (!player?.wallet_address) return null;
  return player as PlayerProfileRow;
}

async function publicListFromRow(
  list: PlayerCustomList,
  player_custom_list_items: unknown,
  player: PlayerProfileRow,
  playerId: number
): Promise<PublicCustomListWithLocations> {
  const locations = locationsFromListItems(player_custom_list_items);
  let slug = list.slug?.trim() || null;
  if (!slug) {
    slug = await ensurePlayerCustomListSlug(playerId, list.id, list.title);
  }

  return {
    ...list,
    slug,
    location_count: locations.length,
    locations,
    owner: ownerFromPlayer(player),
  };
}

/**
 * Create a custom list for a player.
 */
export const createCustomList = async (
  playerId: number,
  input: {
    title: string;
    description?: string | null;
    thumbnailUrl?: string | null;
    isPrivate: boolean;
  }
): Promise<PlayerCustomList> => {
  const slug = await allocateUniquePlayerListSlug(playerId, input.title);

  const { data, error } = await supabase
    .from('player_custom_lists')
    .insert({
      player_id: playerId,
      title: input.title,
      description: input.description?.trim() || null,
      thumbnail_url: input.thumbnailUrl ?? null,
      is_private: input.isPrivate,
      slug,
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
  slug: string;
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
 * A single public (non-private) custom list with full location rows.
 * Returns null when the list is missing, private, or has no player.
 */
export const getPublicCustomListWithLocations = async (
  listId: string
): Promise<PublicCustomListWithLocations | null> => {
  const { data, error } = await supabase
    .from('player_custom_lists')
    .select(
      `*, player_custom_list_items(location_id, locations(${LOCATION_COLUMNS}))`
    )
    .eq('id', listId)
    .eq('is_private', false)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const { player_custom_list_items, ...list } = data;
  const playerId = (list as PlayerCustomList).player_id;
  const player = await loadPlayerProfile(playerId);
  if (!player) return null;

  return publicListFromRow(
    list as PlayerCustomList,
    player_custom_list_items,
    player,
    playerId
  );
};

/**
 * Resolve a shareable public list by profile username and list slug.
 * Returns a 301 target when an retired slug is requested.
 * Private and missing lists resolve to null (404 on public routes).
 */
export async function resolvePublicListShareLookup(
  username: string,
  listSlug: string
): Promise<PublicListShareLookup | null> {
  const normalizedUsername = normalizeUsername(username);
  const normalizedSlug = listSlug.trim().toLowerCase();
  if (!normalizedUsername || !normalizedSlug) return null;

  const { data: player, error: playerError } = await supabase
    .from('players')
    .select(
      'id, wallet_address, username, name, profile_picture_url, twitter_handle'
    )
    .eq('username', normalizedUsername)
    .maybeSingle();

  if (playerError) throw playerError;
  if (!player?.id || !player.wallet_address) return null;

  const playerRow = player as PlayerProfileRow & { id: number };

  const { data: byCurrentSlug, error: slugError } = await supabase
    .from('player_custom_lists')
    .select(
      `*, player_custom_list_items(location_id, locations(${LOCATION_COLUMNS}))`
    )
    .eq('player_id', player.id)
    .eq('slug', normalizedSlug)
    .maybeSingle();

  if (slugError) throw slugError;

  if (byCurrentSlug) {
    const { player_custom_list_items, ...list } = byCurrentSlug;
    if ((list as PlayerCustomList).is_private) return null;
    const full = await publicListFromRow(
      list as PlayerCustomList,
      player_custom_list_items,
      playerRow,
      player.id
    );
    return { kind: 'list', list: full };
  }

  const { data: redirect, error: redirectError } = await supabase
    .from('player_custom_list_slug_redirects')
    .select('list_id')
    .eq('player_id', player.id)
    .eq('old_slug', normalizedSlug)
    .maybeSingle();

  if (redirectError) throw redirectError;
  if (!redirect?.list_id) return null;

  const { data: redirectedList, error: listError } = await supabase
    .from('player_custom_lists')
    .select(
      `*, player_custom_list_items(location_id, locations(${LOCATION_COLUMNS}))`
    )
    .eq('id', redirect.list_id)
    .eq('player_id', player.id)
    .maybeSingle();

  if (listError) throw listError;
  if (!redirectedList) return null;

  const { player_custom_list_items, ...list } = redirectedList;
  if ((list as PlayerCustomList).is_private) return null;

  const currentSlug =
    (list as PlayerCustomList).slug?.trim().toLowerCase() ||
    (await ensurePlayerCustomListSlug(
      player.id,
      (list as PlayerCustomList).id,
      (list as PlayerCustomList).title
    ));

  if (currentSlug === normalizedSlug) {
    const full = await publicListFromRow(
      list as PlayerCustomList,
      player_custom_list_items,
      playerRow,
      player.id
    );
    return { kind: 'list', list: full };
  }

  return {
    kind: 'redirect',
    username: normalizedUsername,
    listSlug: currentSlug,
  };
}

/**
 * Resolve a shareable public list by profile username and list slug.
 */
export const getPublicCustomListByUsernameAndSlug = async (
  username: string,
  listSlug: string
): Promise<PublicCustomListWithLocations | null> => {
  const resolved = await resolvePublicListShareLookup(username, listSlug);
  return resolved?.kind === 'list' ? resolved.list : null;
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

  const cards = await Promise.all(
    (data ?? []).map(async ({ player_custom_list_items, ...list }) => {
      const row = list as PlayerCustomList;
      const locations = locationsFromListItems(player_custom_list_items);
      const first = locations[0];
      const slug =
        row.slug?.trim() ||
        (await ensurePlayerCustomListSlug(playerId, row.id, row.title));

      return {
        id: row.id,
        slug,
        title: row.title,
        location_count: locations.length,
        image_url:
          row.thumbnail_url ||
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
    })
  );

  return cards;
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
 * Update title and/or privacy for a custom list owned by the player.
 * Title changes rotate the share slug and record a permanent redirect.
 */
export async function updateCustomList(
  playerId: number,
  listId: string,
  input: { title?: string; description?: string | null; isPrivate?: boolean }
): Promise<PlayerCustomList | null> {
  const { data: existing, error: fetchError } = await supabase
    .from('player_custom_lists')
    .select('*')
    .eq('id', listId)
    .eq('player_id', playerId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!existing) return null;

  const existingList = existing as PlayerCustomList;
  const updates: {
    title?: string;
    description?: string | null;
    is_private?: boolean;
  } = {};
  const trimmedTitle = input.title?.trim();

  if (input.isPrivate !== undefined) {
    updates.is_private = input.isPrivate;
  }
  if (trimmedTitle !== undefined) {
    updates.title = trimmedTitle;
  }
  if (input.description !== undefined) {
    updates.description = input.description?.trim() || null;
  }

  if (Object.keys(updates).length === 0) {
    return existingList;
  }

  const { data, error } = await supabase
    .from('player_custom_lists')
    .update(updates)
    .eq('id', listId)
    .eq('player_id', playerId)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  let list = data as PlayerCustomList;

  if (trimmedTitle !== undefined && trimmedTitle !== existingList.title) {
    const slug = await rotatePlayerListSlugForTitle(
      playerId,
      listId,
      existingList.slug,
      trimmedTitle
    );
    list = { ...list, slug };
  } else if (input.isPrivate === false) {
    const slug = await ensurePlayerCustomListSlug(playerId, listId, list.title);
    list = { ...list, slug };
  }

  return list;
}

/**
 * Update privacy for a custom list owned by the player.
 * Returns the updated list, or null when the list was not found / not owned.
 */
export const updateCustomListPrivacy = async (
  playerId: number,
  listId: string,
  isPrivate: boolean
): Promise<PlayerCustomList | null> =>
  updateCustomList(playerId, listId, { isPrivate });

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
