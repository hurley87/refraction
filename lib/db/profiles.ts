import { supabase } from './client';
import type { UserProfile } from '../types';

// Select specific columns for profile queries (from players table)
const PROFILE_COLUMNS = `
  id,
  wallet_address,
  solana_wallet_address,
  stellar_wallet_address,
  stellar_wallet_id,
  aptos_wallet_address,
  aptos_wallet_id,
  email,
  username,
  name,
  twitter_handle,
  towns_handle,
  farcaster_handle,
  telegram_handle,
  profile_picture_url,
  total_points,
  created_at,
  updated_at
`;

/**
 * Create or update a user profile
 */
export const createOrUpdateUserProfile = async (
  profile: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>
) => {
  const { data: existingProfile } = await supabase
    .from('players')
    .select(PROFILE_COLUMNS)
    .eq('wallet_address', profile.wallet_address)
    .single();

  if (existingProfile) {
    const { data, error } = await supabase
      .from('players')
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
      .eq('wallet_address', profile.wallet_address)
      .select(PROFILE_COLUMNS)
      .single();

    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('players')
      .insert(profile)
      .select(PROFILE_COLUMNS)
      .single();

    if (error) throw error;
    return data;
  }
};

/**
 * Get user profile by wallet address
 */
export const getUserProfile = async (walletAddress: string) => {
  const { data, error } = await supabase
    .from('players')
    .select(PROFILE_COLUMNS)
    .eq('wallet_address', walletAddress)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
  return data;
};

/**
 * Update user profile fields
 */
export const updateUserProfile = async (
  walletAddress: string,
  updates: Partial<
    Omit<UserProfile, 'id' | 'wallet_address' | 'created_at' | 'updated_at'>
  >
) => {
  const { data, error } = await supabase
    .from('players')
    .update(updates)
    .eq('wallet_address', walletAddress)
    .select(PROFILE_COLUMNS)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Award points for profile field completion
 */
export const awardProfileFieldPoints = async (
  walletAddress: string,
  fieldType: string,
  fieldValue: string
) => {
  try {
    // Check if points have already been awarded for this field
    const { data: existingActivity } = await supabase
      .from('points_activities')
      .select('id')
      .eq('user_wallet_address', walletAddress)
      .eq('activity_type', fieldType)
      .limit(1);

    // If points already awarded for this field, don't award again
    if (existingActivity && existingActivity.length > 0) {
      return {
        success: false,
        reason: 'Points already awarded for this field',
      };
    }

    // Award 5 points for the field
    const { data, error } = await supabase
      .from('points_activities')
      .insert({
        user_wallet_address: walletAddress,
        activity_type: fieldType,
        points_earned: 5,
        description: `Added ${fieldType.replace(
          'profile_field_',
          ''
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
    return { success: false, error: error };
  }
};
