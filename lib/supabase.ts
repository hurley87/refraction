import { createClient } from "@supabase/supabase-js";
import type { Tier } from "./types";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export const getTiers = async (): Promise<Tier[]> => {
  const { data, error } = await supabase
    .from("tiers")
    .select("*")
    .order("min_points", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Tier[];
};

export const resolveTierForPoints = (
  tiers: Tier[],
  totalPoints: number,
): Tier | null => {
  return (
    tiers.find(
      (tier) =>
        totalPoints >= tier.min_points &&
        (tier.max_points === null || totalPoints < tier.max_points),
    ) ?? null
  );
};

export const getTierForPoints = async (
  totalPoints: number,
): Promise<Tier | null> => {
  const tiers = await getTiers();
  return resolveTierForPoints(tiers, totalPoints);
};

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
  checkpoint: string;
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
  coin_address?: string;
  coin_symbol?: string;
  coin_name?: string;
  coin_image_url?: string | null;
  coin_transaction_hash?: string;
  creator_wallet_address?: string;
  creator_username?: string;
  created_at?: string;
};

export type PlayerLocationCheckin = {
  id?: number;
  player_id: number;
  location_id: number;
  points_earned: number;
  checkin_at?: string;
  created_at?: string;
  comment?: string | null;
  image_url?: string | null;
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

export type LocationList = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  accent_color?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type LocationListWithCount = LocationList & {
  location_count: number;
};

export type LocationListLocation = {
  membership_id: number;
  list_id: string;
  location_id: number;
  created_at: string;
  location: Location;
};

export type LocationOption = Pick<
  Location,
  "id" | "name" | "display_name" | "latitude" | "longitude" | "place_id"
>;

// Player functions
export const createOrUpdatePlayer = async (
  player: Omit<Player, "id" | "created_at" | "updated_at">,
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

// Player location checkin functions
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

export const updatePlayerPoints = async (
  playerId: number,
  pointsToAdd: number,
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

export const listAllLocations = async () => {
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
};

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

type LocationListInput = {
  title: string;
  slug: string;
  description?: string | null;
  accent_color?: string | null;
  is_active?: boolean;
};

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

export const deleteLocationList = async (id: string) => {
  const { error } = await supabase.from("location_lists").delete().eq("id", id);

  if (error) throw error;
};

const locationSelection =
  "id, name, display_name, latitude, longitude, place_id, points_value, type, context, coin_address, coin_symbol, coin_name, coin_image_url, creator_wallet_address, creator_username";

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

export const getLeaderboard = async (
  limit: number = 50,
  offset: number = 0,
) => {
  // Try optimized database function first
  const { data, error } = await supabase.rpc("get_leaderboard_optimized", {
    page_limit: limit,
    page_offset: offset,
  });

  if (!error && data) {
    return data as LeaderboardEntry[];
  }

  // Simple fallback query if RPC doesn't exist
  console.warn("RPC function not found, using fallback query");

  const { data: players, error: fallbackError } = await supabase
    .from("players")
    .select("id, wallet_address, username, email, total_points")
    .order("total_points", { ascending: false })
    .order("id", { ascending: true })
    .range(offset, offset + limit - 1);

  if (fallbackError) throw fallbackError;
  if (!players || players.length === 0) return [];

  // Get checkin counts in one batch query
  const playerIds = players.map((p) => p.id);
  const { data: checkinCounts } = await supabase
    .from("player_location_checkins")
    .select("player_id")
    .in("player_id", playerIds);

  // Map checkin counts
  const checkinMap = new Map<number, number>();
  checkinCounts?.forEach((checkin: any) => {
    checkinMap.set(
      checkin.player_id,
      (checkinMap.get(checkin.player_id) || 0) + 1,
    );
  });

  // Simple sequential ranking
  return players.map((player, index) => ({
    player_id: player.id,
    wallet_address: player.wallet_address,
    username: player.username,
    email: player.email,
    total_points: player.total_points,
    total_checkins: checkinMap.get(player.id) || 0,
    rank: offset + index + 1,
  }));
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
    `,
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

export type UserProfile = {
  id?: string;
  wallet_address: string;
  email?: string;
  name?: string;
  username?: string;
  website?: string;
  twitter_handle?: string;
  towns_handle?: string;
  farcaster_handle?: string;
  telegram_handle?: string;
  profile_picture_url?: string;
  created_at?: string;
  updated_at?: string;
};

// User Profile functions
export const createOrUpdateUserProfile = async (
  profile: Omit<UserProfile, "id" | "created_at" | "updated_at">,
) => {
  const { data: existingProfile } = await supabase
    .from("players")
    .select("*")
    .eq("wallet_address", profile.wallet_address)
    .single();

  if (existingProfile) {
    const { data, error } = await supabase
      .from("players")
      .update({
        email: profile.email || existingProfile.email,
        name: profile.name || existingProfile.name,
        username: profile.username || existingProfile.username,
        website: profile.website,
        twitter_handle: profile.twitter_handle,
        towns_handle: profile.towns_handle,
        farcaster_handle: profile.farcaster_handle,
        telegram_handle: profile.telegram_handle,
        profile_picture_url:
          profile.profile_picture_url || existingProfile.profile_picture_url,
      })
      .eq("wallet_address", profile.wallet_address)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from("players")
      .insert(profile)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

export const getUserProfile = async (walletAddress: string) => {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("wallet_address", walletAddress)
    .single();

  if (error && error.code !== "PGRST116") throw error; // PGRST116 = not found
  return data;
};

export const updateUserProfile = async (
  walletAddress: string,
  updates: Partial<
    Omit<UserProfile, "id" | "wallet_address" | "created_at" | "updated_at">
  >,
) => {
  const { data, error } = await supabase
    .from("players")
    .update(updates)
    .eq("wallet_address", walletAddress)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Award points for profile field completion
export const awardProfileFieldPoints = async (
  walletAddress: string,
  fieldType: string,
  fieldValue: string,
) => {
  try {
    // Check if points have already been awarded for this field
    const { data: existingActivity } = await supabase
      .from("points_activities")
      .select("id")
      .eq("user_wallet_address", walletAddress)
      .eq("activity_type", fieldType)
      .limit(1);

    // If points already awarded for this field, don't award again
    if (existingActivity && existingActivity.length > 0) {
      return {
        success: false,
        reason: "Points already awarded for this field",
      };
    }

    // Award 5 points for the field
    const { data, error } = await supabase
      .from("points_activities")
      .insert({
        user_wallet_address: walletAddress,
        activity_type: fieldType,
        points_earned: 5,
        description: `Added ${fieldType.replace(
          "profile_field_",
          "",
        )} to profile`,
        metadata: { field_value: fieldValue },
        processed: true,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { success: true, activity: data };
  } catch (error) {
    console.error("Error awarding profile field points:", error);
    return { success: false, error: error };
  }
};

// Perk types and functions
export type Perk = {
  id?: string;
  title: string;
  description: string;
  location?: string;
  points_threshold: number;
  website_url?: string;
  type: string;
  end_date?: string;
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
  thumbnail_url?: string;
  hero_image?: string;
};

export type PerkDiscountCode = {
  id?: string;
  perk_id: string;
  code: string;
  is_claimed?: boolean;
  claimed_by_wallet_address?: string;
  claimed_at?: string;
  created_at?: string;
  is_universal?: boolean;
};

export type UserPerkRedemption = {
  id?: string;
  perk_id: string;
  discount_code_id: string;
  user_wallet_address: string;
  redeemed_at?: string;
};

// Admin functions - check against Privy user email directly
export const ADMIN_EMAILS = [
  "dhurls99@gmail.com",
  "kaitlyn@refractionfestival.com",
  "jim@refractionfestival.com",
];

export const checkAdminPermission = (email: string | undefined) => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email);
};

// Perk CRUD functions
export const createPerk = async (
  perk: Omit<Perk, "id" | "created_at" | "updated_at">,
) => {
  const { data, error } = await supabase
    .from("perks")
    .insert(perk)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updatePerk = async (
  id: string,
  updates: Partial<Omit<Perk, "id" | "created_at">>,
) => {
  const { data, error } = await supabase
    .from("perks")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deletePerk = async (id: string) => {
  const { error } = await supabase.from("perks").delete().eq("id", id);

  if (error) throw error;
};

export const getAllPerks = async (activeOnly: boolean = true) => {
  let query = supabase
    .from("perks")
    .select("*")
    .order("created_at", { ascending: false });

  if (activeOnly) {
    query = query
      .eq("is_active", true)
      .or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const getPerkById = async (id: string) => {
  const { data, error } = await supabase
    .from("perks")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
};

export const getAvailablePerksForUser = async (walletAddress: string) => {
  // Get user's total points
  const userStats = await getPlayerByWallet(walletAddress);
  const userPoints = userStats?.total_points || 0;

  // Get all active perks that user can afford and haven't expired
  const { data: perks, error } = await supabase
    .from("perks")
    .select(
      `
      *,
      user_perk_redemptions!left(
        id,
        redeemed_at
      )
    `,
    )
    .eq("is_active", true)
    .lte("points_threshold", userPoints)
    .or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`);

  if (error) throw error;

  // Filter out already redeemed perks
  return (
    perks?.filter((perk) => {
      const redemption = perk.user_perk_redemptions.find(
        (r: any) => r.user_wallet_address === walletAddress,
      );
      return !redemption;
    }) || []
  );
};

export const redeemPerk = async (perkId: string, walletAddress: string) => {
  // Check if user has enough points
  const userStats = await getPlayerByWallet(walletAddress);
  const perk = await getPerkById(perkId);

  if (!userStats || userStats.total_points < perk.points_threshold) {
    throw new Error("Insufficient points to redeem this perk");
  }

  // Check if already redeemed
  const { data: existingRedemption } = await supabase
    .from("user_perk_redemptions")
    .select("id")
    .eq("perk_id", perkId)
    .eq("user_wallet_address", walletAddress)
    .single();

  if (existingRedemption) {
    throw new Error("Perk already redeemed");
  }

  // Find an available discount code
  const { data: availableCode, error: codeError } = await supabase
    .from("perk_discount_codes")
    .select("*")
    .eq("perk_id", perkId)
    .eq("is_claimed", false)
    .limit(1)
    .single();

  if (codeError || !availableCode) {
    throw new Error("No discount codes available for this perk");
  }

  // Create redemption record (this will trigger the database function to mark the code as claimed)
  const { data, error } = await supabase
    .from("user_perk_redemptions")
    .insert({
      perk_id: perkId,
      discount_code_id: availableCode.id,
      user_wallet_address: walletAddress,
    })
    .select(
      `
      *,
      perk_discount_codes (
        code
      )
    `,
    )
    .single();

  if (error) throw error;
  return data;
};

export const getUserPerkRedemptions = async (walletAddress: string) => {
  const { data, error } = await supabase
    .from("user_perk_redemptions")
    .select(
      `
      *,
      perks (
        title,
        description,
        type,
        website_url
      ),
      perk_discount_codes (
        code
      )
    `,
    )
    .eq("user_wallet_address", walletAddress)
    .order("redeemed_at", { ascending: false });

  if (error) throw error;
  return data;
};

// Discount code functions
export const createDiscountCodes = async (
  perkId: string,
  codes: string[],
  isUniversal: boolean = false,
) => {
  const discountCodes = codes.map((code) => ({
    perk_id: perkId,
    code: code.trim(),
    is_universal: isUniversal,
  }));

  const { data, error } = await supabase
    .from("perk_discount_codes")
    .insert(discountCodes)
    .select();

  if (error) throw error;
  return data;
};

export const getDiscountCodesByPerkId = async (perkId: string) => {
  const { data, error } = await supabase
    .from("perk_discount_codes")
    .select("*")
    .eq("perk_id", perkId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
};

export const deleteDiscountCode = async (codeId: string) => {
  const { error } = await supabase
    .from("perk_discount_codes")
    .delete()
    .eq("id", codeId);

  if (error) throw error;
};

export const getAvailableCodesCount = async (perkId: string) => {
  const { count, error } = await supabase
    .from("perk_discount_codes")
    .select("*", { count: "exact", head: true })
    .eq("perk_id", perkId)
    .eq("is_claimed", false);

  if (error) throw error;
  return count || 0;
};
