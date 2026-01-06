import { supabase } from "./client";
import type { Location, LocationOption } from "../types";

/**
 * Create a location or return existing one by place_id
 */
export const createOrGetLocation = async (
  locationData: Omit<Location, "id" | "created_at">,
) => {
  const { data: existingLocation } = await supabase
    .from("locations")
    .select("*")
    .eq("place_id", locationData.place_id)
    .single();

  if (existingLocation) {
    return existingLocation;
  }

  const { data, error } = await supabase
    .from("locations")
    .insert(locationData)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * List all locations ordered by creation date
 */
export const listAllLocations = async () => {
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
};

/**
 * List locations checked in by a wallet address
 */
export const listLocationsByWallet = async (walletAddress: string) => {
  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id")
    .eq("wallet_address", walletAddress)
    .single();

  if (playerError) return [];

  const { data, error } = await supabase
    .from("player_location_checkins")
    .select(
      `
      locations (
        id, name, display_name, latitude, longitude, place_id, points_value, type, context, created_at
      )
    `,
    )
    .eq("player_id", player.id);

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
      | "name"
      | "display_name"
      | "place_id"
      | "latitude"
      | "longitude"
      | "creator_wallet_address"
      | "creator_username"
      | "coin_image_url"
      | "type"
      | "event_url"
      | "is_visible"
    >
  >,
) => {
  const { data, error } = await supabase
    .from("locations")
    .update({
      ...updates,
    })
    .eq("id", locationId)
    .select()
    .single();

  if (error) throw error;
  return data as Location;
};

/**
 * List location options for search/dropdowns with optional search filter
 */
export const listLocationOptions = async (
  search?: string,
  limit: number = 250,
): Promise<LocationOption[]> => {
  let query = supabase
    .from("locations")
    .select("id, name, display_name, latitude, longitude, place_id")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (search && search.trim() !== "") {
    const sanitized = search.trim().replace(/%/g, "\\%").replace(/_/g, "\\_");
    query = query.or(
      `display_name.ilike.%${sanitized}%,name.ilike.%${sanitized}%`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as LocationOption[];
};

