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

// Legacy checkpoint checkin functions (deprecated - use location checkins)

/**
 * Get checkins by address
 * @deprecated Use location checkin system instead
 */
export const getCheckinByAddress = async (address: string) => {
  try {
    const { data, error } = await supabase
      .from("irlcheckins")
      .select("*")
      .eq("address", address);

    if (error) {
      throw error;
    }

    return data;
  } catch {
    return null;
  }
};

/**
 * Insert a legacy checkpoint checkin
 * @deprecated Use createLocationCheckin instead
 */
export const insertCheckin = async (checkin: Checkin) => {
  const { data, error } = await supabase.from("irlcheckins").insert(checkin);

  if (error) {
    throw error;
  }

  return data;
};

/**
 * Upsert checkpoint for an address
 * @deprecated Use location checkin system instead
 */
export const upsertCheckpoint = async (
  address: string,
  email: string,
  newCheckpoint: string,
) => {
  // First, get the existing record
  const existingCheckin = await getCheckinByAddress(address);

  if (existingCheckin && existingCheckin.length > 0) {
    // Parse existing checkpoints (assuming they're stored as comma-separated or single value)
    const currentCheckpoints = existingCheckin[0].checkpoint
      ? existingCheckin[0].checkpoint.split(",").map((c) => c.trim())
      : [];

    // Check if checkpoint already exists
    if (currentCheckpoints.includes(newCheckpoint)) {
      throw new Error(`Already checked in to ${newCheckpoint}`);
    }

    // Add new checkpoint
    currentCheckpoints.push(newCheckpoint);
    const updatedCheckpoints = currentCheckpoints.join(", ");

    // Update the existing record
    const { data, error } = await supabase
      .from("irlcheckins")
      .update({
        checkpoint: updatedCheckpoints,
        email: email || existingCheckin[0].email, // Keep existing email if no new one provided
      })
      .eq("address", address)
      .select();

    if (error) {
      throw error;
    }

    return data;
  } else {
    // Insert new record
    const { data, error } = await supabase
      .from("irlcheckins")
      .insert({
        address,
        email,
        checkpoint: newCheckpoint,
      })
      .select();

    if (error) {
      throw error;
    }

    return data;
  }
};

/**
 * Get checkins by address and checkpoint
 * @deprecated Use location checkin system instead
 */
export const getCheckinByAddressAndCheckpoint = async (
  address: string,
  checkpoint: string,
): Promise<Checkin[]> => {
  const { data, error } = await supabase
    .from("irlcheckins")
    .select("*")
    .eq("address", address);

  if (error) {
    throw error;
  }

  // Filter by checkpoint since checkpoints are now stored as comma-separated values
  const filteredData = data?.filter((checkin) => {
    if (!checkin.checkpoint) return false;
    const checkpoints = checkin.checkpoint.split(",").map((c) => c.trim());
    return checkpoints.includes(checkpoint);
  });

  return filteredData || [];
};
