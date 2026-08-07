import { supabase } from './client';
import type { ProfileFavoritePlace, UserProfile } from '../types';
import { sameWalletAddress } from '../utils/wallets';
import { resolveLocationForSearchPick } from './locations';

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
  website,
  twitter_handle,
  towns_handle,
  farcaster_handle,
  telegram_handle,
  instagram_handle,
  profile_picture_url,
  city,
  country,
  country_id,
  geo_city_id,
  bio,
  favorite_music_venue,
  favorite_gallery,
  favorite_restaurant,
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
        instagram_handle: profile.instagram_handle,
        profile_picture_url:
          profile.profile_picture_url || existingProfile.profile_picture_url,
        city: profile.city !== undefined ? profile.city : existingProfile.city,
        country:
          profile.country !== undefined
            ? profile.country
            : existingProfile.country,
        bio: profile.bio !== undefined ? profile.bio : existingProfile.bio,
        favorite_music_venue:
          profile.favorite_music_venue !== undefined
            ? profile.favorite_music_venue
            : existingProfile.favorite_music_venue,
        favorite_gallery:
          profile.favorite_gallery !== undefined
            ? profile.favorite_gallery
            : existingProfile.favorite_gallery,
        favorite_restaurant:
          profile.favorite_restaurant !== undefined
            ? profile.favorite_restaurant
            : existingProfile.favorite_restaurant,
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

/** True when Supabase/Postgres reports a unique violation on `players.username`. */
export function isPostgresUniqueUsernameViolation(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const code = 'code' in err ? String((err as { code: unknown }).code) : '';
  if (code !== '23505') return false;
  const message =
    'message' in err ? String((err as { message: unknown }).message) : '';
  const details =
    'details' in err ? String((err as { details: unknown }).details) : '';
  const haystack = `${message} ${details}`.toLowerCase();
  return (
    haystack.includes('username') ||
    haystack.includes('idx_players_username_unique')
  );
}

/**
 * Returns true if another player already owns this username (exact match; store lowercase).
 */
export const isUsernameTakenByOther = async (
  normalizedUsername: string,
  excludeWalletAddress: string
): Promise<boolean> => {
  const key = normalizedUsername.trim().toLowerCase();
  if (!key) return false;

  const { data, error } = await supabase
    .from('players')
    .select('wallet_address')
    .eq('username', key)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  if (!data?.wallet_address) return false;

  return !sameWalletAddress(data.wallet_address, excludeWalletAddress);
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
  if (!data) return data;
  return enrichProfileGeoDisplayNames(data as UserProfile);
};

/**
 * Get user profile by public username (stored lowercase).
 */
export const getUserProfileByUsername = async (username: string) => {
  const key = username.trim().toLowerCase();
  if (!key) return null;

  const { data, error } = await supabase
    .from('players')
    .select(PROFILE_COLUMNS)
    .eq('username', key)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return null;
  return enrichProfileGeoDisplayNames(data as UserProfile);
};

async function enrichFavoritePlace(
  place: ProfileFavoritePlace | null | undefined
): Promise<ProfileFavoritePlace | null | undefined> {
  if (!place?.place_id) return place;
  if (place.image_url) return place;

  try {
    const irl = await resolveLocationForSearchPick({
      placeId: place.place_id,
      latitude: place.latitude,
      longitude: place.longitude,
      name: place.name,
    });
    if (!irl) return place;
    const imageUrl =
      irl.coin_image_thumb_url?.trim() || irl.coin_image_url?.trim() || null;
    return {
      ...place,
      place_id: irl.place_id || place.place_id,
      name: irl.name?.trim() || place.name,
      address: irl.address?.trim() || place.address,
      latitude: irl.latitude ?? place.latitude,
      longitude: irl.longitude ?? place.longitude,
      image_url: imageUrl,
      category: irl.category ?? place.category ?? null,
    };
  } catch {
    return place;
  }
}

/**
 * Prefer geo FK display names over legacy free-text city/country.
 * Also backfill favorite-place images from IRL locations when missing.
 */
async function enrichProfileGeoDisplayNames(
  profile: UserProfile
): Promise<UserProfile> {
  const next: UserProfile = { ...profile };

  if (profile.geo_city_id) {
    const { data: cityRow } = await supabase
      .from('geo_cities')
      .select('name')
      .eq('id', profile.geo_city_id)
      .maybeSingle();
    if (cityRow?.name) next.city = cityRow.name;
  }

  if (profile.country_id) {
    const { data: countryRow } = await supabase
      .from('countries')
      .select('name')
      .eq('id', profile.country_id)
      .maybeSingle();
    if (countryRow?.name) next.country = countryRow.name;
  }

  const [music, gallery, restaurant] = await Promise.all([
    enrichFavoritePlace(profile.favorite_music_venue),
    enrichFavoritePlace(profile.favorite_gallery),
    enrichFavoritePlace(profile.favorite_restaurant),
  ]);
  next.favorite_music_venue = music ?? null;
  next.favorite_gallery = gallery ?? null;
  next.favorite_restaurant = restaurant ?? null;

  return next;
}

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
 * Set player country/city FKs from a Mapbox selection and sync legacy text fields.
 */
export const updatePlayerGeoLocation = async (
  walletAddress: string,
  input: {
    countryId: string;
    geoCityId: string;
    cityName: string;
    countryName: string;
  }
) => {
  const { data, error } = await supabase
    .from('players')
    .update({
      country_id: input.countryId,
      geo_city_id: input.geoCityId,
      city: input.cityName.slice(0, 120),
      country: input.countryName.slice(0, 120),
      updated_at: new Date().toISOString(),
    })
    .eq('wallet_address', walletAddress)
    .select(PROFILE_COLUMNS)
    .single();

  if (error) throw error;
  return enrichProfileGeoDisplayNames(data as UserProfile);
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
