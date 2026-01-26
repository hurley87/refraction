import { supabase } from './client';
import type { Perk } from '../types';
import { getPlayerByWallet } from './players';

// Select specific columns for perk queries
const PERK_COLUMNS = `
  id,
  title,
  description,
  location,
  points_threshold,
  website_url,
  type,
  end_date,
  created_at,
  updated_at,
  is_active,
  thumbnail_url,
  hero_image
`;

// Select specific columns for discount code queries
const DISCOUNT_CODE_COLUMNS = `
  id,
  perk_id,
  code,
  is_claimed,
  claimed_by_wallet_address,
  claimed_at,
  created_at,
  is_universal
`;

/**
 * Create a new perk
 */
export const createPerk = async (
  perk: Omit<Perk, 'id' | 'created_at' | 'updated_at'>
) => {
  const { data, error } = await supabase
    .from('perks')
    .insert(perk)
    .select(PERK_COLUMNS)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Update an existing perk
 */
export const updatePerk = async (
  id: string,
  updates: Partial<Omit<Perk, 'id' | 'created_at'>>
) => {
  const { data, error } = await supabase
    .from('perks')
    .update(updates)
    .eq('id', id)
    .select(PERK_COLUMNS)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Delete a perk
 */
export const deletePerk = async (id: string) => {
  const { error } = await supabase.from('perks').delete().eq('id', id);

  if (error) throw error;
};

/**
 * Get all perks, optionally filtered to active only
 */
export const getAllPerks = async (activeOnly: boolean = true) => {
  let query = supabase
    .from('perks')
    .select(PERK_COLUMNS)
    .order('created_at', { ascending: false });

  if (activeOnly) {
    query = query
      .eq('is_active', true)
      .or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

/**
 * Get a perk by ID
 */
export const getPerkById = async (id: string) => {
  const { data, error } = await supabase
    .from('perks')
    .select(PERK_COLUMNS)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Get available perks for a user (affordable and not yet redeemed)
 */
export const getAvailablePerksForUser = async (walletAddress: string) => {
  // Get user's total points
  const userStats = await getPlayerByWallet(walletAddress);
  const userPoints = userStats?.total_points || 0;

  // Get all active perks that user can afford and haven't expired
  const { data: perks, error } = await supabase
    .from('perks')
    .select(
      `
      ${PERK_COLUMNS},
      user_perk_redemptions!left(
        id,
        redeemed_at
      )
    `
    )
    .eq('is_active', true)
    .lte('points_threshold', userPoints)
    .or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`);

  if (error) throw error;

  // Filter out already redeemed perks
  return (
    perks?.filter((perk) => {
      const redemption = perk.user_perk_redemptions.find(
        (r: any) => r.user_wallet_address === walletAddress
      );
      return !redemption;
    }) || []
  );
};

/**
 * Redeem a perk for a user
 */
export const redeemPerk = async (perkId: string, walletAddress: string) => {
  // Check if user has enough points
  const userStats = await getPlayerByWallet(walletAddress);
  const perk = await getPerkById(perkId);

  if (!userStats || userStats.total_points < perk.points_threshold) {
    throw new Error('Insufficient points to redeem this perk');
  }

  // Check if already redeemed
  const { data: existingRedemption } = await supabase
    .from('user_perk_redemptions')
    .select('id')
    .eq('perk_id', perkId)
    .eq('user_wallet_address', walletAddress)
    .single();

  if (existingRedemption) {
    throw new Error('Perk already redeemed');
  }

  // Find an available discount code
  const { data: availableCode, error: codeError } = await supabase
    .from('perk_discount_codes')
    .select(DISCOUNT_CODE_COLUMNS)
    .eq('perk_id', perkId)
    .eq('is_claimed', false)
    .limit(1)
    .single();

  if (codeError || !availableCode) {
    throw new Error('No discount codes available for this perk');
  }

  // Create redemption record (this will trigger the database function to mark the code as claimed)
  const { data, error } = await supabase
    .from('user_perk_redemptions')
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
    `
    )
    .single();

  if (error) throw error;
  return data;
};

/**
 * Get all perk redemptions for a user
 */
export const getUserPerkRedemptions = async (walletAddress: string) => {
  const { data, error } = await supabase
    .from('user_perk_redemptions')
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
    `
    )
    .eq('user_wallet_address', walletAddress)
    .order('redeemed_at', { ascending: false });

  if (error) throw error;
  return data;
};

/**
 * Create multiple discount codes for a perk
 */
export const createDiscountCodes = async (
  perkId: string,
  codes: string[],
  isUniversal: boolean = false
) => {
  const discountCodes = codes.map((code) => ({
    perk_id: perkId,
    code: code.trim(),
    is_universal: isUniversal,
  }));

  const { data, error } = await supabase
    .from('perk_discount_codes')
    .insert(discountCodes)
    .select();

  if (error) throw error;
  return data;
};

/**
 * Get all discount codes for a perk
 */
export const getDiscountCodesByPerkId = async (perkId: string) => {
  const { data, error } = await supabase
    .from('perk_discount_codes')
    .select(DISCOUNT_CODE_COLUMNS)
    .eq('perk_id', perkId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

/**
 * Delete a discount code
 */
export const deleteDiscountCode = async (codeId: string) => {
  const { error } = await supabase
    .from('perk_discount_codes')
    .delete()
    .eq('id', codeId);

  if (error) throw error;
};

/**
 * Get count of available (unclaimed) discount codes for a perk
 */
export const getAvailableCodesCount = async (perkId: string) => {
  const { count, error } = await supabase
    .from('perk_discount_codes')
    .select('*', { count: 'exact', head: true })
    .eq('perk_id', perkId)
    .eq('is_claimed', false);

  if (error) throw error;
  return count || 0;
};
