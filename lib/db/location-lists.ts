import { supabase } from "./client";
import type { LocationList, LocationListWithCount, LocationListLocation, Location } from "../types";

const locationSelection =
  "id, name, display_name, latitude, longitude, place_id, points_value, type, event_url, context, coin_address, coin_symbol, coin_name, coin_image_url, creator_wallet_address, creator_username";

type LocationListInput = {
  title: string;
  slug: string;
  description?: string | null;
  accent_color?: string | null;
  is_active?: boolean;
};

/**
 * Get all location lists with location counts
 */
export const getLocationLists = async (): Promise<LocationListWithCount[]> => {
  const { data: lists, error: listsError } = await supabase
    .from("location_lists")
    .select("*")
    .order("created_at", { ascending: false });

  if (listsError) throw listsError;

  const { data: memberships, error: membershipsError } = await supabase
    .from("location_list_members")
    .select("list_id");

  if (membershipsError) throw membershipsError;

  const counts = (memberships || []).reduce<Record<string, number>>(
    (acc, member: { list_id: string }) => {
      acc[member.list_id] = (acc[member.list_id] || 0) + 1;
      return acc;
    },
    {},
  );

  const typedLists = (lists || []) as LocationList[];

  return typedLists.map((list) => ({
    ...list,
    location_count: counts[list.id] || 0,
  }));
};

/**
 * Create a new location list
 */
export const createLocationList = async (
  payload: LocationListInput,
): Promise<LocationList> => {
  const { data, error } = await supabase
    .from("location_lists")
    .insert({
      title: payload.title,
      slug: payload.slug,
      description: payload.description ?? null,
      accent_color: payload.accent_color ?? null,
      is_active: payload.is_active ?? true,
    })
    .select()
    .single();

  if (error) throw error;
  return data as LocationList;
};

/**
 * Update an existing location list
 */
export const updateLocationList = async (
  id: string,
  updates: Partial<LocationListInput>,
): Promise<LocationList> => {
  const { data, error } = await supabase
    .from("location_lists")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as LocationList;
};

/**
 * Delete a location list
 */
export const deleteLocationList = async (id: string) => {
  const { error } = await supabase.from("location_lists").delete().eq("id", id);

  if (error) throw error;
};

/**
 * Get all locations in a specific list
 */
export const getLocationsForList = async (
  listId: string,
): Promise<LocationListLocation[]> => {
  const { data, error } = await supabase
    .from("location_list_members")
    .select(
      `
        id,
        list_id,
        location_id,
        created_at,
        locations (
          ${locationSelection}
        )
      `,
    )
    .eq("list_id", listId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || [])
    .filter((row): row is any => Boolean(row.locations))
    .map((row: any) => {
      // Supabase returns nested relations as arrays, extract the first element
      const location = Array.isArray(row.locations)
        ? row.locations[0]
        : row.locations;
      return {
        membership_id: row.id,
        list_id: row.list_id,
        location_id: row.location_id,
        created_at: row.created_at,
        location: location as Location,
      } as LocationListLocation;
    });
};

/**
 * Add a location to a list
 */
export const addLocationToList = async (
  listId: string,
  locationId: number,
): Promise<LocationListLocation> => {
  const { data, error } = await supabase
    .from("location_list_members")
    .insert({
      list_id: listId,
      location_id: locationId,
    })
    .select(
      `
        id,
        list_id,
        location_id,
        created_at,
        locations (
          ${locationSelection}
        )
      `,
    )
    .single();

  if (error) throw error;
  if (!data?.locations) {
    throw new Error("Location missing for membership record");
  }

  // Supabase returns nested relations as arrays, extract the first element
  const location = Array.isArray(data.locations)
    ? data.locations[0]
    : data.locations;

  if (!location) {
    throw new Error("Location missing for membership record");
  }

  return {
    membership_id: data.id,
    list_id: data.list_id,
    location_id: data.location_id,
    created_at: data.created_at,
    location: location as Location,
  } as LocationListLocation;
};

/**
 * Remove a location from a list
 */
export const removeLocationFromList = async (
  listId: string,
  locationId: number,
) => {
  const { error } = await supabase
    .from("location_list_members")
    .delete()
    .eq("list_id", listId)
    .eq("location_id", locationId);

  if (error) throw error;
};

