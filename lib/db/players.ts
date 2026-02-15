import { supabase } from './client';
import type { Player } from '../types';

type PlayerLookupField =
  | 'wallet_address'
  | 'solana_wallet_address'
  | 'stellar_wallet_address'
  | 'aptos_wallet_address'
  | 'email';

// Select only the columns we need for Player type
const PLAYER_COLUMNS = `
  id,
  wallet_address,
  solana_wallet_address,
  stellar_wallet_address,
  stellar_wallet_id,
  aptos_wallet_address,
  aptos_wallet_id,
  email,
  username,
  total_points,
  created_at,
  updated_at
`;

/**
 * Generic helper to get player by any lookup field
 * @param field - The field to search by
 * @param value - The value to search for
 * @returns Player data or null if not found
 */
async function getPlayerByField(
  field: PlayerLookupField,
  value: string
): Promise<Player | null> {
  const { data, error } = await supabase
    .from('players')
    .select(PLAYER_COLUMNS)
    .eq(field, value)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
  return data;
}

/**
 * Create or update a player by wallet address.
 * If player exists, updates email and username if provided.
 */
export const createOrUpdatePlayer = async (
  player: Omit<Player, 'id' | 'created_at' | 'updated_at'>
) => {
  const { data: existingPlayer } = await supabase
    .from('players')
    .select(PLAYER_COLUMNS)
    .eq('wallet_address', player.wallet_address)
    .single();

  if (existingPlayer) {
    const { data, error } = await supabase
      .from('players')
      .update({
        email: player.email || existingPlayer.email,
        username: player.username || existingPlayer.username,
        updated_at: new Date().toISOString(),
      })
      .eq('wallet_address', player.wallet_address)
      .select(PLAYER_COLUMNS)
      .single();

    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('players')
      .insert(player)
      .select(PLAYER_COLUMNS)
      .single();

    if (error) throw error;
    return data;
  }
};

/**
 * Get player by EVM wallet address
 */
export const getPlayerByWallet = async (walletAddress: string) => {
  return getPlayerByField('wallet_address', walletAddress);
};

/**
 * Get player by Solana wallet address
 */
export const getPlayerBySolanaWallet = async (solanaWalletAddress: string) => {
  return getPlayerByField('solana_wallet_address', solanaWalletAddress);
};

/**
 * Get player by Stellar wallet address
 */
export const getPlayerByStellarWallet = async (
  stellarWalletAddress: string
) => {
  return getPlayerByField('stellar_wallet_address', stellarWalletAddress);
};

/**
 * Get player by Aptos wallet address
 */
export const getPlayerByAptosWallet = async (aptosWalletAddress: string) => {
  return getPlayerByField('aptos_wallet_address', aptosWalletAddress);
};

/**
 * Get player by email address
 */
export const getPlayerByEmail = async (email: string) => {
  return getPlayerByField('email', email);
};

/**
 * Get multiple players by email addresses in a single query.
 * Returns only players that match — callers should diff against
 * the input list to find unmatched emails.
 */
export const getPlayersByEmails = async (
  emails: string[]
): Promise<Player[]> => {
  if (emails.length === 0) return [];
  const { data, error } = await supabase
    .from('players')
    .select(PLAYER_COLUMNS)
    .in('email', emails);
  if (error) throw error;
  return data ?? [];
};

/**
 * Generic helper to create or update a player for alternative chain checkins.
 * Links by email if the player already exists (from other chain checkins).
 */
async function createOrUpdatePlayerForChain(
  walletField:
    | 'solana_wallet_address'
    | 'stellar_wallet_address'
    | 'aptos_wallet_address',
  walletAddress: string,
  email?: string,
  additionalFields?: Record<string, string>
) {
  // First, try to find an existing player by chain wallet
  const existingByChain = await getPlayerByField(walletField, walletAddress);
  if (existingByChain) {
    // Update email/additional fields if provided and not already set
    const updates: Record<string, string> = {};
    if (email && !existingByChain.email) updates.email = email;
    if (additionalFields) {
      Object.entries(additionalFields).forEach(([key, value]) => {
        if (!(existingByChain as any)[key]) {
          updates[key] = value;
        }
      });
    }

    if (Object.keys(updates).length > 0) {
      const { data, error } = await supabase
        .from('players')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingByChain.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    return existingByChain;
  }

  // If email provided, try to find existing player by email (link accounts)
  if (email) {
    const existingByEmail = await getPlayerByEmail(email);
    if (existingByEmail) {
      // Link chain wallet to existing player
      const updateData: Record<string, string> = {
        [walletField]: walletAddress,
        updated_at: new Date().toISOString(),
      };
      if (additionalFields) {
        Object.assign(updateData, additionalFields);
      }

      const { data, error } = await supabase
        .from('players')
        .update(updateData)
        .eq('id', existingByEmail.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  }

  // Create new player with chain wallet only
  // Note: wallet_address may have EVM format constraint, so leave it null for chain-only players
  const insertData: Record<string, string | number | undefined> = {
    [walletField]: walletAddress,
    email: email || undefined,
    total_points: 0,
  };
  if (additionalFields) {
    Object.assign(insertData, additionalFields);
  }

  const { data, error } = await supabase
    .from('players')
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create or update a player for Solana checkins.
 * Links by email if the player already exists (from EVM checkins).
 */
export const createOrUpdatePlayerForSolana = async (
  solanaWalletAddress: string,
  email?: string
) => {
  return createOrUpdatePlayerForChain(
    'solana_wallet_address',
    solanaWalletAddress,
    email
  );
};

/**
 * Create or update a player for Stellar checkins.
 * Links by email if the player already exists (from EVM or Solana checkins).
 */
export const createOrUpdatePlayerForStellar = async (
  stellarWalletAddress: string,
  email?: string,
  stellarWalletId?: string
) => {
  const additionalFields = stellarWalletId
    ? { stellar_wallet_id: stellarWalletId }
    : undefined;
  return createOrUpdatePlayerForChain(
    'stellar_wallet_address',
    stellarWalletAddress,
    email,
    additionalFields
  );
};

/**
 * Create or update a player for Aptos checkins.
 * Links by email if the player already exists (from EVM, Solana, or Stellar checkins).
 */
export const createOrUpdatePlayerForAptos = async (
  aptosWalletAddress: string,
  email?: string,
  aptosWalletId?: string
) => {
  const additionalFields = aptosWalletId
    ? { aptos_wallet_id: aptosWalletId }
    : undefined;
  return createOrUpdatePlayerForChain(
    'aptos_wallet_address',
    aptosWalletAddress,
    email,
    additionalFields
  );
};

/**
 * Update player's total points by adding to current amount.
 * Uses atomic database function to prevent race conditions.
 *
 * Note: Requires the `increment_player_points_by_id` database function.
 * Falls back to non-atomic update if function doesn't exist.
 */
export const updatePlayerPoints = async (
  playerId: number,
  pointsToAdd: number
) => {
  // Try atomic RPC function first (prevents race conditions)
  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    'increment_player_points_by_id',
    { p_player_id: playerId, p_points: pointsToAdd }
  );

  // If RPC succeeded, fetch the full player record
  if (!rpcError && rpcResult && rpcResult.length > 0) {
    const { data, error } = await supabase
      .from('players')
      .select(PLAYER_COLUMNS)
      .eq('id', playerId)
      .single();

    if (error) throw error;
    return data;
  }

  // Fallback: non-atomic update (race condition possible, but maintains backward compatibility)
  // This branch is used if the RPC function hasn't been deployed yet
  const { data: currentPlayer, error: fetchError } = await supabase
    .from('players')
    .select('total_points')
    .eq('id', playerId)
    .single();

  if (fetchError) throw fetchError;

  const newTotalPoints = (currentPlayer.total_points || 0) + pointsToAdd;

  const { data, error } = await supabase
    .from('players')
    .update({
      total_points: newTotalPoints,
      updated_at: new Date().toISOString(),
    })
    .eq('id', playerId)
    .select(PLAYER_COLUMNS)
    .single();

  if (error) throw error;
  return data;
};
