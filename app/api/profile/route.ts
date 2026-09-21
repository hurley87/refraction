import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
import {
  getUserProfile,
  getUserProfileByUsername,
  createOrUpdateUserProfile,
  awardProfileFieldPoints,
  hasProfileCompletionAward,
  isUsernameTakenByOther,
  isPostgresUniqueUsernameViolation,
} from '@/lib/db/profiles';
import type { ProfileFavoritePlace, UserProfile } from '@/lib/types';
import type { PointsActivityType } from '@/lib/points-activities';
import { apiSuccess, apiError } from '@/lib/api/response';
import { profileFavoritePlaceSchema } from '@/lib/schemas/player';
import { normalizeUsername, usernameSchema } from '@/lib/username';
import {
  isProfileComplete,
  isProfileCompletionFieldFilled,
  type ProfileCompletionField,
} from '@/lib/profile-completion';
import {
  resolveServerIdentity,
  trackProfileCompleted,
} from '@/lib/analytics/server';

const PROFILE_FIELD_ACTIVITY_MAP = {
  profile_picture_url: 'profile_field_picture',
  name: 'profile_field_name',
  bio: 'profile_field_bio',
  instagram_handle: 'profile_field_instagram',
  favorite_music_venue: 'profile_field_favorite_club',
  favorite_gallery: 'profile_field_favorite_bar',
  favorite_restaurant: 'profile_field_favorite_restaurant',
} satisfies Record<ProfileCompletionField, PointsActivityType>;

function parseFavoritePlaceField(
  value: unknown
):
  | { ok: true; value: ProfileFavoritePlace | null | undefined }
  | { ok: false; error: string } {
  if (value === undefined) return { ok: true, value: undefined };
  if (value === null) return { ok: true, value: null };
  const parsed = profileFavoritePlaceSchema.safeParse(value);
  if (!parsed.success) {
    return { ok: false, error: 'Invalid favorite place' };
  }
  return { ok: true, value: parsed.data };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet_address');
    const usernameParam = searchParams.get('username');

    console.log('walletAddress', walletAddress);

    if (usernameParam && !walletAddress) {
      const username = normalizeUsername(usernameParam);
      if (!username) {
        return apiError('Username is required', 400);
      }

      const profile = await getUserProfileByUsername(username);
      return apiSuccess({
        username: profile?.username ?? username,
        name: profile?.name ?? '',
        profile_picture_url: profile?.profile_picture_url ?? '',
        twitter_handle: profile?.twitter_handle ?? '',
      });
    }

    if (!walletAddress) {
      return apiError('Wallet address or username is required', 400);
    }

    const profile = await getUserProfile(walletAddress);

    console.log('profile', profile);

    if (!profile) {
      return apiSuccess({
        wallet_address: walletAddress,
        email: '',
        name: '',
        username: '',
        website: '',
        twitter_handle: '',
        towns_handle: '',
        farcaster_handle: '',
        telegram_handle: '',
        instagram_handle: '',
        profile_picture_url: '',
        city: '',
        country: '',
        country_id: null,
        geo_city_id: null,
        bio: '',
        favorite_music_venue: null,
        favorite_gallery: null,
        favorite_restaurant: null,
        profile_completion_awarded: false,
      });
    }

    return apiSuccess({
      ...profile,
      profile_completion_awarded:
        await hasProfileCompletionAward(walletAddress),
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return apiError('Failed to fetch profile', 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet_address, ...profileData } = body;

    if (!wallet_address) {
      return apiError('Wallet address is required', 400);
    }

    // Validate social handles
    const validatedData: Partial<UserProfile> = {};

    if (profileData.email) validatedData.email = profileData.email.trim();
    if (profileData.name) validatedData.name = profileData.name.trim();
    if (
      typeof profileData.username === 'string' &&
      profileData.username.trim() !== ''
    ) {
      const usernameResult = usernameSchema.safeParse(profileData.username);
      if (!usernameResult.success) {
        const message =
          usernameResult.error.issues[0]?.message ?? 'Invalid username';
        return apiError(message, 400);
      }
      const normalizedUsername = usernameResult.data;
      validatedData.username = normalizedUsername;
      const taken = await isUsernameTakenByOther(
        normalizedUsername,
        wallet_address
      );
      if (taken) {
        return apiError('Username is already taken', 409);
      }
    }
    if (profileData.website) validatedData.website = profileData.website.trim();

    // Social handles - remove @ symbols if present and validate
    if (profileData.twitter_handle) {
      validatedData.twitter_handle = profileData.twitter_handle
        .replace(/^@/, '')
        .trim();
    }
    if (profileData.towns_handle) {
      validatedData.towns_handle = profileData.towns_handle
        .replace(/^@/, '')
        .trim();
    }
    if (profileData.farcaster_handle) {
      validatedData.farcaster_handle = profileData.farcaster_handle
        .replace(/^@/, '')
        .trim();
    }
    if (profileData.telegram_handle) {
      validatedData.telegram_handle = profileData.telegram_handle
        .replace(/^@/, '')
        .trim();
    }
    if (profileData.instagram_handle) {
      validatedData.instagram_handle = profileData.instagram_handle
        .replace(/^@/, '')
        .trim();
    }
    if (profileData.profile_picture_url) {
      validatedData.profile_picture_url =
        profileData.profile_picture_url.trim();
    }

    if (typeof profileData.bio === 'string') {
      const t = profileData.bio.trim();
      validatedData.bio = t.length > 500 ? t.slice(0, 500) : t;
    }

    for (const key of [
      'favorite_music_venue',
      'favorite_gallery',
      'favorite_restaurant',
    ] as const) {
      if (!(key in profileData)) continue;
      const parsed = parseFavoritePlaceField(profileData[key]);
      if (!parsed.ok) {
        return apiError(parsed.error, 400);
      }
      if (parsed.value !== undefined) {
        validatedData[key] = parsed.value;
      }
    }

    // city/country free-text updates are deprecated — use POST /api/profile/location

    // Get the current profile to compare what's new
    const currentProfile = await getUserProfile(wallet_address);

    let updatedProfile;
    try {
      updatedProfile = await createOrUpdateUserProfile({
        wallet_address,
        ...validatedData,
      });
    } catch (err: unknown) {
      if (isPostgresUniqueUsernameViolation(err)) {
        return apiError('Username is already taken', 409);
      }
      throw err;
    }

    const pointsAwarded: Array<{
      field: string;
      points: number;
      activity: unknown;
    }> = [];

    for (const [fieldName, activityType] of Object.entries(
      PROFILE_FIELD_ACTIVITY_MAP
    ) as [ProfileCompletionField, PointsActivityType][]) {
      const newValue = validatedData[fieldName];
      const currentValue = currentProfile?.[fieldName];

      if (
        isProfileCompletionFieldFilled(fieldName, newValue) &&
        !isProfileCompletionFieldFilled(fieldName, currentValue)
      ) {
        const result = await awardProfileFieldPoints(
          wallet_address,
          activityType,
          newValue,
          100
        );

        if (result.success) {
          pointsAwarded.push({
            field: fieldName,
            points: 100,
            activity: result.activity,
          });
        }
      }
    }

    const justCompleted =
      isProfileComplete(updatedProfile) && !isProfileComplete(currentProfile);

    if (isProfileComplete(updatedProfile)) {
      const completionResult = await awardProfileFieldPoints(
        wallet_address,
        'profile_complete',
        '7/7',
        300,
        'Completed profile'
      );

      if (completionResult.success) {
        pointsAwarded.push({
          field: 'profile_complete',
          points: 300,
          activity: completionResult.activity,
        });
      }
    }

    if (justCompleted) {
      trackProfileCompleted(
        resolveServerIdentity({
          email: updatedProfile.email ?? currentProfile?.email,
          walletAddress: wallet_address,
        })
      );
    }

    return apiSuccess({
      profile: {
        ...updatedProfile,
        profile_completion_awarded:
          await hasProfileCompletionAward(wallet_address),
      },
      pointsAwarded,
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return apiError('Failed to update profile', 500);
  }
}
