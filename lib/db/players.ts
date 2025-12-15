import { supabase } from "./client";
import type { Player } from "../types";

/**
 * Create or update a player by wallet address.
 * If player exists, updates email and username if provided.
 */
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

/**
 * Get player by EVM wallet address
 */
export const getPlayerByWallet = async (walletAddress: string) => {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("wallet_address", walletAddress)
    .single();

  if (error && error.code !== "PGRST116") throw error; // PGRST116 = not found
  return data;
};

/**
 * Get player by Solana wallet address
 */
export const getPlayerBySolanaWallet = async (solanaWalletAddress: string) => {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("solana_wallet_address", solanaWalletAddress)
    .single();

  if (error && error.code !== "PGRST116") throw error; // PGRST116 = not found
  return data;
};

/**
 * Get player by Stellar wallet address
 */
export const getPlayerByStellarWallet = async (
  stellarWalletAddress: string,
) => {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("stellar_wallet_address", stellarWalletAddress)
    .single();

  if (error && error.code !== "PGRST116") throw error; // PGRST116 = not found
  return data;
};

/**
 * Get player by email address
 */
export const getPlayerByEmail = async (email: string) => {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("email", email)
    .single();

  if (error && error.code !== "PGRST116") throw error; // PGRST116 = not found
  return data;
};

/**
 * Create or update a player for Solana checkins.
 * Links by email if the player already exists (from EVM checkins).
 */
export const createOrUpdatePlayerForSolana = async (
  solanaWalletAddress: string,
  email?: string,
) => {
  // First, try to find an existing player by Solana wallet
  const existingBySolana = await getPlayerBySolanaWallet(solanaWalletAddress);
  if (existingBySolana) {
    // Update email if provided and not already set
    if (email && !existingBySolana.email) {
      const { data, error } = await supabase
        .from("players")
        .update({
          email,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingBySolana.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    return existingBySolana;
  }

  // If email provided, try to find existing player by email (link accounts)
  if (email) {
    const existingByEmail = await getPlayerByEmail(email);
    if (existingByEmail) {
      // Link Solana wallet to existing player
      const { data, error } = await supabase
        .from("players")
        .update({
          solana_wallet_address: solanaWalletAddress,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingByEmail.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  }

  // Create new player with Solana wallet only
  // Note: wallet_address may have EVM format constraint, so leave it null for Solana-only players
  const { data, error } = await supabase
    .from("players")
    .insert({
      solana_wallet_address: solanaWalletAddress,
      email: email || undefined,
      total_points: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Create or update a player for Stellar checkins.
 * Links by email if the player already exists (from EVM or Solana checkins).
 */
export const createOrUpdatePlayerForStellar = async (
  stellarWalletAddress: string,
  email?: string,
  stellarWalletId?: string,
) => {
  // First, try to find an existing player by Stellar wallet
  const existingByStellar =
    await getPlayerByStellarWallet(stellarWalletAddress);
  if (existingByStellar) {
    // Update email/wallet ID if provided and not already set
    const updates: Record<string, string> = {};
    if (email && !existingByStellar.email) updates.email = email;
    if (stellarWalletId && !existingByStellar.stellar_wallet_id)
      updates.stellar_wallet_id = stellarWalletId;

    if (Object.keys(updates).length > 0) {
      const { data, error } = await supabase
        .from("players")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingByStellar.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    return existingByStellar;
  }

  // If email provided, try to find existing player by email (link accounts)
  if (email) {
    const existingByEmail = await getPlayerByEmail(email);
    if (existingByEmail) {
      // Link Stellar wallet to existing player
      const updateData: Record<string, string> = {
        stellar_wallet_address: stellarWalletAddress,
        updated_at: new Date().toISOString(),
      };
      if (stellarWalletId) updateData.stellar_wallet_id = stellarWalletId;

      const { data, error } = await supabase
        .from("players")
        .update(updateData)
        .eq("id", existingByEmail.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  }

  // Create new player with Stellar wallet only
  // Note: wallet_address may have EVM format constraint, so leave it null for Stellar-only players
  const insertData: Record<string, string | number | undefined> = {
    stellar_wallet_address: stellarWalletAddress,
    email: email || undefined,
    total_points: 0,
  };
  if (stellarWalletId) insertData.stellar_wallet_id = stellarWalletId;

  const { data, error } = await supabase
    .from("players")
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Update player's total points by adding to current amount
 */
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

