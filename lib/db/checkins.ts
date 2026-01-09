import { supabase } from "./client";
import type { PlayerLocationCheckin } from "../types";

/**
 * Check if a user has already checked in to a specific location
 */
export const checkUserLocationCheckin = async (
  playerId: number,
  locationId: number,
) => {
  const { data, error } = await supabase
    .from("player_location_checkins")
    .select("*")
    .eq("player_id", playerId)
    .eq("location_id", locationId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
};

/**
 * Create a new location check-in record
 */
export const createLocationCheckin = async (
  checkin: Omit<PlayerLocationCheckin, "id" | "created_at">,
) => {
  const { data, error } = await supabase
    .from("player_location_checkins")
    .insert(checkin)
    .select()
    .single();

  if (error) throw error;
  return data;
};
