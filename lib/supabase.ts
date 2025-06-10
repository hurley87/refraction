import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Types for our number assignment system
export type NumberAssignment = {
  id: number;
  user_address: string;
  assigned_number: number;
  created_at: string;
};

export type Notification = {
  id: number;
  user_address: string;
  created_at: string;
};

export type WebhookNotification = {
  fid: number;
  url?: string;
  token?: string;
};

export type Checkin = {
  id?: number;
  address: string;
  email: string;
  created_at?: string;
};

export const insertNotification = async (notification: WebhookNotification) => {
  const { data, error } = await supabase
    .from("irlnotifications")
    .insert(notification);
  if (error) {
    throw error;
  }
  return data;
};

export const insertCheckin = async (checkin: Checkin) => {
  const { data, error } = await supabase.from("irlcheckins").insert(checkin);

  if (error) {
    throw error;
  }

  return data;
};

export const getCheckinByAddress = async (address: string) => {
  try {
    const { data, error } = await supabase
      .from("irlcheckins")
      .select("*")
      .eq("address", address);

    console.log("data", data);

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
};

// New types for the game location system
export type Player = {
  id?: number;
  wallet_address: string;
  email?: string;
  username?: string;
  total_points: number;
  created_at?: string;
  updated_at?: string;
};

export type Location = {
  id?: number;
  name: string;
  display_name: string;
  latitude: number;
  longitude: number;
  place_id: string;
  points_value: number;
  type?: string;
  context?: string;
  created_at?: string;
};

export type PlayerLocationCheckin = {
  id?: number;
  player_id: number;
  location_id: number;
  points_earned: number;
  checkin_at?: string;
  created_at?: string;
};

export type LeaderboardEntry = {
  player_id: number;
  wallet_address: string;
  username?: string;
  email?: string;
  total_points: number;
  total_checkins: number;
  rank: number;
};

// Player functions
export const createOrUpdatePlayer = async (
  player: Omit<Player, "id" | "created_at" | "updated_at">
) => {
  const { data: existingPlayer } = await supabase
    .from("players")
    .select("*")
    .eq("wallet_address", player.wallet_address)
    .single();

  if (existingPlayer) {
    const { data, error } = await supabase
      .from("players")
      .update({
        email: player.email || existingPlayer.email,
        username: player.username || existingPlayer.username,
        updated_at: new Date().toISOString(),
      })
      .eq("wallet_address", player.wallet_address)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from("players")
      .insert(player)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

export const getPlayerByWallet = async (walletAddress: string) => {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("wallet_address", walletAddress)
    .single();

  if (error && error.code !== "PGRST116") throw error; // PGRST116 = not found
  return data;
};

// Location functions
export const createOrGetLocation = async (
  locationData: Omit<Location, "id" | "created_at">
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

// Player location checkin functions
export const checkUserLocationCheckin = async (
  playerId: number,
  locationId: number
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

export const createLocationCheckin = async (
  checkin: Omit<PlayerLocationCheckin, "id" | "created_at">
) => {
  const { data, error } = await supabase
    .from("player_location_checkins")
    .insert(checkin)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updatePlayerPoints = async (
  playerId: number,
  pointsToAdd: number
) => {
  // First get current points
  const { data: currentPlayer, error: fetchError } = await supabase
    .from("players")
    .select("total_points")
    .eq("id", playerId)
    .single();

  if (fetchError) throw fetchError;

  const newTotalPoints = (currentPlayer.total_points || 0) + pointsToAdd;

  const { data, error } = await supabase
    .from("players")
    .update({
      total_points: newTotalPoints,
      updated_at: new Date().toISOString(),
    })
    .eq("id", playerId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getLeaderboard = async (limit: number = 10) => {
  const { data: players, error } = await supabase
    .from("players")
    .select("id, wallet_address, username, email, total_points")
    .order("total_points", { ascending: false })
    .limit(limit);

  if (error) throw error;

  // Get checkin counts for each player
  const leaderboard: LeaderboardEntry[] = await Promise.all(
    players.map(async (player, index) => {
      const { count } = await supabase
        .from("player_location_checkins")
        .select("*", { count: "exact", head: true })
        .eq("player_id", player.id);

      return {
        player_id: player.id,
        wallet_address: player.wallet_address,
        username: player.username,
        email: player.email,
        total_points: player.total_points,
        total_checkins: count || 0,
        rank: index + 1,
      };
    })
  );

  return leaderboard;
};

export const getPlayerStats = async (playerId: number) => {
  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("*")
    .eq("id", playerId)
    .single();

  if (playerError) throw playerError;

  const { data: checkins, error: checkinsError } = await supabase
    .from("player_location_checkins")
    .select(
      `
      *,
      locations (
        name,
        display_name,
        latitude,
        longitude
      )
    `
    )
    .eq("player_id", playerId)
    .order("created_at", { ascending: false });

  if (checkinsError) throw checkinsError;

  return {
    player,
    checkins,
    totalCheckins: checkins.length,
    totalPoints: player.total_points,
  };
};
