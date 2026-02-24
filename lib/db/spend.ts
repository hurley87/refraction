import { supabase } from './client';
import type { SpendItem } from '../types';
import { getPlayerByWallet, updatePlayerPoints } from './players';

const SPEND_ITEM_COLUMNS = `
  id,
  name,
  description,
  image_url,
  points_cost,
  is_active,
  created_at,
  updated_at
`;

const SPEND_REDEMPTION_COLUMNS = `
  id,
  spend_item_id,
  user_wallet_address,
  points_spent,
  is_fulfilled,
  created_at,
  fulfilled_at
`;

/**
 * Create a new spend item
 */
export const createSpendItem = async (
  item: Omit<SpendItem, 'id' | 'created_at' | 'updated_at'>
) => {
  const { data, error } = await supabase
    .from('spend_items')
    .insert(item)
    .select(SPEND_ITEM_COLUMNS)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Update an existing spend item
 */
export const updateSpendItem = async (
  id: string,
  updates: Partial<Omit<SpendItem, 'id' | 'created_at'>>
) => {
  const { data, error } = await supabase
    .from('spend_items')
    .update(updates)
    .eq('id', id)
    .select(SPEND_ITEM_COLUMNS)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Delete a spend item
 */
export const deleteSpendItem = async (id: string) => {
  const { error } = await supabase.from('spend_items').delete().eq('id', id);
  if (error) throw error;
};

/**
 * Get all spend items, optionally filtered to active only
 */
export const getSpendItems = async (activeOnly: boolean = true) => {
  let query = supabase
    .from('spend_items')
    .select(SPEND_ITEM_COLUMNS)
    .order('created_at', { ascending: false });

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

/**
 * Get a spend item by ID
 */
export const getSpendItemById = async (id: string) => {
  const { data, error } = await supabase
    .from('spend_items')
    .select(SPEND_ITEM_COLUMNS)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Spend points on an item. Validates the item is active and user has sufficient points.
 * Uses deduct-then-verify pattern to prevent race conditions:
 * 1. Deduct points atomically
 * 2. Check if resulting balance went negative (concurrent spend)
 * 3. If negative, re-add points and reject
 * 4. Insert redemption record (compensate on failure)
 */
export const spendPoints = async (spendItemId: string, walletAddress: string) => {
  // Validate item exists and is active
  const item = await getSpendItemById(spendItemId);
  if (!item.is_active) {
    throw new Error('This item is no longer available');
  }

  // Validate player exists
  const player = await getPlayerByWallet(walletAddress);
  if (!player) {
    throw new Error('Player not found');
  }

  // Quick pre-check (non-authoritative, avoids unnecessary deduct/re-add for obvious cases)
  if (player.total_points < item.points_cost) {
    throw new Error('Insufficient points');
  }

  // Atomically deduct points, then verify the balance didn't go negative
  const updatedPlayer = await updatePlayerPoints(player.id!, -item.points_cost);
  if (updatedPlayer.total_points < 0) {
    // Race condition: concurrent spend drained balance. Re-add and reject.
    await updatePlayerPoints(player.id!, item.points_cost);
    throw new Error('Insufficient points');
  }

  // Insert redemption record
  const { data, error } = await supabase
    .from('spend_redemptions')
    .insert({
      spend_item_id: spendItemId,
      user_wallet_address: walletAddress,
      points_spent: item.points_cost,
    })
    .select(`${SPEND_REDEMPTION_COLUMNS}, spend_items (${SPEND_ITEM_COLUMNS})`)
    .single();

  if (error) {
    // Compensate: re-add points if redemption insert fails
    try {
      await updatePlayerPoints(player.id!, item.points_cost);
    } catch (compensateError) {
      console.error('CRITICAL: Failed to compensate points after redemption failure', compensateError);
    }
    throw error;
  }

  return data;
};

/**
 * Get all redemptions for a specific spend item (admin view)
 */
export const getSpendItemRedemptions = async (spendItemId: string) => {
  const { data, error } = await supabase
    .from('spend_redemptions')
    .select(SPEND_REDEMPTION_COLUMNS)
    .eq('spend_item_id', spendItemId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

/**
 * Get all unfulfilled redemptions (admin fulfillment queue)
 */
export const getUnfulfilledRedemptions = async () => {
  const { data, error } = await supabase
    .from('spend_redemptions')
    .select(`${SPEND_REDEMPTION_COLUMNS}, spend_items (${SPEND_ITEM_COLUMNS})`)
    .eq('is_fulfilled', false)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
};

/**
 * Mark a redemption as fulfilled. Only updates unfulfilled redemptions.
 */
export const fulfillRedemption = async (redemptionId: string) => {
  const { data, error } = await supabase
    .from('spend_redemptions')
    .update({
      is_fulfilled: true,
      fulfilled_at: new Date().toISOString(),
    })
    .eq('id', redemptionId)
    .eq('is_fulfilled', false)
    .select(SPEND_REDEMPTION_COLUMNS)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Redemption not found or already fulfilled');
    }
    throw error;
  }
  return data;
};

/**
 * Get all redemptions for a user
 */
export const getUserSpendRedemptions = async (walletAddress: string) => {
  const { data, error } = await supabase
    .from('spend_redemptions')
    .select(`${SPEND_REDEMPTION_COLUMNS}, spend_items (${SPEND_ITEM_COLUMNS})`)
    .eq('user_wallet_address', walletAddress)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};
