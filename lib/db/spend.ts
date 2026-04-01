import { supabase } from './client';
import type { Checkpoint, SpendItem } from '../types';
import { getPlayerByWallet, updatePlayerPoints } from './players';
import {
  trackSpendRedemptionStarted,
  trackSpendRedemptionCompleted,
} from '../analytics/server';

function spendItemFromJoin(
  related: SpendItem | SpendItem[] | null | undefined
): SpendItem | null {
  if (!related) return null;
  return Array.isArray(related) ? related[0] ?? null : related;
}

const SPEND_ITEM_COLUMNS = `
  id,
  checkpoint_id,
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
 * Get a spend item linked to a checkpoint
 */
export const getSpendItemByCheckpointId = async (checkpointId: string) => {
  const { data, error } = await supabase
    .from('spend_items')
    .select(SPEND_ITEM_COLUMNS)
    .eq('checkpoint_id', checkpointId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  return data;
};

/**
 * Ensure spend item state matches a checkpoint.
 * - spend checkpoint => create/update linked spend item
 * - checkin checkpoint => delete linked spend item if it exists
 */
export const syncSpendItemForCheckpoint = async (
  checkpoint: Pick<
    Checkpoint,
    | 'id'
    | 'name'
    | 'description'
    | 'points_value'
    | 'is_active'
    | 'partner_image_url'
    | 'checkpoint_mode'
  >
) => {
  const existing = await getSpendItemByCheckpointId(checkpoint.id);

  if (checkpoint.checkpoint_mode !== 'spend') {
    if (existing?.id) {
      // Preserve historical redemptions: deleting a spend item cascades into
      // spend_redemptions and erases fulfillment/points audit history.
      return updateSpendItem(existing.id, { is_active: false });
    }
    return null;
  }

  const payload = {
    checkpoint_id: checkpoint.id,
    name: checkpoint.name,
    description: checkpoint.description || null,
    image_url: checkpoint.partner_image_url || null,
    points_cost: checkpoint.points_value,
    is_active: checkpoint.is_active,
  };

  if (existing?.id) {
    return updateSpendItem(existing.id, payload);
  }

  return createSpendItem(payload);
};

const getLatestSpendRedemptionForUser = async (
  spendItemId: string,
  walletAddress: string
) => {
  const { data, error } = await supabase
    .from('spend_redemptions')
    .select(SPEND_REDEMPTION_COLUMNS)
    .eq('spend_item_id', spendItemId)
    .eq('user_wallet_address', walletAddress)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw error;
  return data?.[0] ?? null;
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

  const existingRedemption = await getLatestSpendRedemptionForUser(
    spendItemId,
    walletAddress
  );
  if (existingRedemption) {
    throw new Error('You already redeemed this item');
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

  const joinedItem = spendItemFromJoin(
    data.spend_items as SpendItem | SpendItem[] | null | undefined
  );
  if (data.id && data.user_wallet_address) {
    trackSpendRedemptionStarted(data.user_wallet_address, {
      spend_item_id: data.spend_item_id,
      spend_item_name: joinedItem?.name ?? '',
      points_committed: data.points_spent,
      redemption_id: data.id,
      checkpoint_id: joinedItem?.checkpoint_id ?? null,
      flow: 'pending_create',
    });
  }

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

  const item = spendItemFromJoin(
    redemption.spend_items as SpendItem | SpendItem[] | null | undefined
  );
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

  const fulfilledItem = spendItemFromJoin(
    updated.spend_items as SpendItem | SpendItem[] | null | undefined
  );
  trackSpendRedemptionCompleted(walletAddress, {
    spend_item_id: updated.spend_item_id,
    spend_item_name: fulfilledItem?.name ?? '',
    points_spent: updated.points_spent,
    redemption_id: updated.id!,
    checkpoint_id: fulfilledItem?.checkpoint_id ?? null,
    flow: 'pending_verify',
    verified_by: 'user',
  });

  return updated;
};

/**
 * Get a user's redemption for a spend item (if any)
 */
export const getUserRedemptionForSpendItem = async (
  spendItemId: string,
  walletAddress: string
) => {
  const { data, error } = await supabase
    .from('spend_redemptions')
    .select(`${SPEND_REDEMPTION_COLUMNS}, spend_items (${SPEND_ITEM_COLUMNS})`)
    .eq('spend_item_id', spendItemId)
    .eq('user_wallet_address', walletAddress)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw error;
  return data?.[0] ?? null;
};

/**
 * Redeem once: deduct points and create a fulfilled redemption in one flow.
 */
export const redeemSpendItemOnce = async (
  spendItemId: string,
  walletAddress: string
) => {
  const redeemViaLegacyFlow = async () => {
    const item = await getSpendItemById(spendItemId);
    if (!item?.is_active) {
      throw new Error('This item is no longer available');
    }

    const player = await getPlayerByWallet(walletAddress);
    if (!player?.id) {
      throw new Error('Player not found');
    }

    const existingRedemption = await getLatestSpendRedemptionForUser(
      spendItemId,
      walletAddress
    );
    if (existingRedemption) {
      throw new Error('You already redeemed this item');
    }

    if ((player.total_points ?? 0) < item.points_cost) {
      throw new Error('Insufficient points');
    }

    const updatedPlayer = await updatePlayerPoints(player.id, -item.points_cost);
    if (updatedPlayer.total_points < 0) {
      await updatePlayerPoints(player.id, item.points_cost);
      throw new Error('Insufficient points');
    }

    const { data: redemption, error: insertError } = await supabase
      .from('spend_redemptions')
      .insert({
        spend_item_id: spendItemId,
        user_wallet_address: walletAddress,
        points_spent: item.points_cost,
        is_fulfilled: true,
        fulfilled_at: new Date().toISOString(),
        verified_by: 'user',
      })
      .select(`${SPEND_REDEMPTION_COLUMNS}, spend_items (${SPEND_ITEM_COLUMNS})`)
      .single();

    if (insertError) {
      try {
        await updatePlayerPoints(player.id, item.points_cost);
      } catch (compensateError) {
        console.error(
          'CRITICAL: Failed to compensate points after redemption insert failure',
          compensateError
        );
      }

      if (insertError.code === '23505') {
        throw new Error('You already redeemed this item');
      }
      throw insertError;
    }

    if (redemption.id) {
      trackSpendRedemptionCompleted(walletAddress, {
        spend_item_id: redemption.spend_item_id,
        spend_item_name:
          spendItemFromJoin(
            redemption.spend_items as SpendItem | SpendItem[] | null | undefined
          )?.name ?? item.name,
        points_spent: redemption.points_spent,
        redemption_id: redemption.id,
        checkpoint_id: item.checkpoint_id ?? null,
        flow: 'checkpoint_instant',
        verified_by: 'user',
      });
    }

    return { redemption, player: updatedPlayer };
  };

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    'redeem_spend_item_once_atomic',
    {
      p_spend_item_id: spendItemId,
      p_wallet_address: walletAddress,
    }
  );

  if (rpcError) {
    const rpcMessage = rpcError.message ?? '';
    const missingAtomicRpc =
      rpcError.code === 'PGRST202' ||
      rpcMessage.includes('redeem_spend_item_once_atomic');

    if (missingAtomicRpc) {
      return redeemViaLegacyFlow();
    }

    const knownError = [
      'You already redeemed this item',
      'Insufficient points',
      'Player not found',
      'This item is no longer available',
    ].find((message) => rpcMessage.includes(message));

    if (knownError) {
      throw new Error(knownError);
    }
    throw rpcError;
  }

  const rpcResult = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as
    | { redemption_id?: string }
    | null;

  if (!rpcResult?.redemption_id) {
    throw new Error('Failed to redeem');
  }

  const { data: redemption, error: redemptionError } = await supabase
    .from('spend_redemptions')
    .select(`${SPEND_REDEMPTION_COLUMNS}, spend_items (${SPEND_ITEM_COLUMNS})`)
    .eq('id', rpcResult.redemption_id)
    .single();

  if (redemptionError || !redemption) {
    throw redemptionError ?? new Error('Failed to redeem');
  }

  const player = await getPlayerByWallet(walletAddress);
  if (!player) {
    throw new Error('Player not found');
  }

  if (redemption.id) {
    const rpcItem = spendItemFromJoin(
      redemption.spend_items as SpendItem | SpendItem[] | null | undefined
    );
    trackSpendRedemptionCompleted(walletAddress, {
      spend_item_id: redemption.spend_item_id,
      spend_item_name: rpcItem?.name ?? '',
      points_spent: redemption.points_spent,
      redemption_id: redemption.id,
      checkpoint_id: rpcItem?.checkpoint_id ?? null,
      flow: 'checkpoint_instant',
      verified_by: 'user',
    });
  }

  return { redemption, player };
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
    .select(`${SPEND_REDEMPTION_COLUMNS}, spend_items (${SPEND_ITEM_COLUMNS})`)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Redemption not found or already fulfilled');
    }
    throw error;
  }

  const adminItem = spendItemFromJoin(
    data.spend_items as SpendItem | SpendItem[] | null | undefined
  );
  if (data.user_wallet_address && data.id) {
    trackSpendRedemptionCompleted(data.user_wallet_address, {
      spend_item_id: data.spend_item_id,
      spend_item_name: adminItem?.name ?? '',
      points_spent: data.points_spent,
      redemption_id: data.id,
      checkpoint_id: adminItem?.checkpoint_id ?? null,
      flow: 'admin_fulfill',
      verified_by: 'admin',
    });
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
