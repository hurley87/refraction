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
  fulfilled_at,
  verified_by
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
 * Create a pending redemption (no point deduction). User must call verifySpendRedemption
 * to deduct points and mark verified. Pending redemptions have no expiry.
 */
export const createPendingSpendRedemption = async (
  spendItemId: string,
  walletAddress: string
) => {
  const item = await getSpendItemById(spendItemId);
  if (!item.is_active) {
    throw new Error('This item is no longer available');
  }

  const player = await getPlayerByWallet(walletAddress);
  if (!player) {
    throw new Error('Player not found');
  }

  const { data, error } = await supabase
    .from('spend_redemptions')
    .insert({
      spend_item_id: spendItemId,
      user_wallet_address: walletAddress,
      points_spent: item.points_cost,
    })
    .select(`${SPEND_REDEMPTION_COLUMNS}, spend_items (${SPEND_ITEM_COLUMNS})`)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Verify a pending redemption: deduct points and mark fulfilled. Idempotent for
 * already-verified redemptions (returns error). Rejects if wrong user, item inactive, or insufficient balance.
 */
export const verifySpendRedemption = async (
  redemptionId: string,
  walletAddress: string
) => {
  const { data: redemption, error: fetchError } = await supabase
    .from('spend_redemptions')
    .select(`${SPEND_REDEMPTION_COLUMNS}, spend_items (${SPEND_ITEM_COLUMNS})`)
    .eq('id', redemptionId)
    .single();

  if (fetchError || !redemption) {
    throw new Error('Redemption not found');
  }
  if (redemption.user_wallet_address !== walletAddress) {
    throw new Error('Unauthorized');
  }
  if (redemption.is_fulfilled) {
    throw new Error('Redemption already verified');
  }

  const related = redemption.spend_items as
    | SpendItem
    | SpendItem[]
    | null
    | undefined;
  const item = Array.isArray(related) ? related[0] : related;
  if (!item?.is_active) {
    throw new Error('This item is no longer available');
  }

  const player = await getPlayerByWallet(walletAddress);
  if (!player) {
    throw new Error('Player not found');
  }
  if ((player.total_points ?? 0) < redemption.points_spent) {
    throw new Error('Insufficient points');
  }

  const updatedPlayer = await updatePlayerPoints(
    player.id!,
    -redemption.points_spent
  );
  if (updatedPlayer.total_points < 0) {
    await updatePlayerPoints(player.id!, redemption.points_spent);
    throw new Error('Insufficient points');
  }

  const { data: updated, error: updateError } = await supabase
    .from('spend_redemptions')
    .update({
      is_fulfilled: true,
      fulfilled_at: new Date().toISOString(),
      verified_by: 'user',
    })
    .eq('id', redemptionId)
    .eq('is_fulfilled', false)
    .select(`${SPEND_REDEMPTION_COLUMNS}, spend_items (${SPEND_ITEM_COLUMNS})`)
    .single();

  if (updateError) {
    if (updateError.code === 'PGRST116') {
      try {
        await updatePlayerPoints(player.id!, redemption.points_spent);
      } catch (e) {
        console.error(
          'CRITICAL: Failed to compensate points after concurrent verify',
          e
        );
      }
      throw new Error('Redemption already verified');
    }
    try {
      await updatePlayerPoints(player.id!, redemption.points_spent);
    } catch (e) {
      console.error(
        'CRITICAL: Failed to compensate points after verify update failure',
        e
      );
    }
    throw updateError;
  }
  return updated;
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
 * Mark a redemption as fulfilled by admin. Only updates unfulfilled redemptions.
 * Note: Admin fulfill does not deduct points (points are deducted on user verify).
 * For legacy/admin-fulfill flow, call this after manually handling fulfillment.
 */
export const fulfillRedemption = async (redemptionId: string) => {
  const { data, error } = await supabase
    .from('spend_redemptions')
    .update({
      is_fulfilled: true,
      fulfilled_at: new Date().toISOString(),
      verified_by: 'admin',
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
