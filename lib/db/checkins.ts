import { supabase } from "./client";
import type { PlayerLocationCheckin, Checkin } from "../types";

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

/**
 * Get checkins by wallet address and checkpoint name (legacy checkins table)
 */
export const getCheckinByAddressAndCheckpoint = async (
  address: string,
  checkpoint: string,
): Promise<Checkin[]> => {
  const { data, error } = await supabase
    .from("checkins")
    .select("*")
    .eq("address", address)
    .eq("checkpoint", checkpoint);

  if (error) throw error;
  return data || [];
};

/**
 * Get checkin by wallet address (legacy checkins table)
 */
export const getCheckinByAddress = async (
  address: string,
): Promise<Checkin[]> => {
  const { data, error } = await supabase
    .from("checkins")
    .select("*")
    .eq("address", address);

  if (error) throw error;
  return data || [];
};

/**
 * Insert a new checkin record (legacy checkins table)
 */
export const insertCheckin = async (
  checkin: Omit<Checkin, "id" | "created_at">,
): Promise<Checkin> => {
  const { data, error } = await supabase
    .from("checkins")
    .insert(checkin)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Upsert a checkpoint checkin (legacy checkins table)
 * Creates a new checkin or updates existing one
 */
export const upsertCheckpoint = async (
  address: string,
  email: string | undefined,
  checkpoint: string,
): Promise<Checkin> => {
  // Check if already exists
  const existing = await getCheckinByAddressAndCheckpoint(address, checkpoint);
  if (existing.length > 0) {
    throw new Error("Already checked in");
  }

  // Insert new checkin
  return insertCheckin({
    address,
    email: email || "",
    checkpoint,
  });
};
