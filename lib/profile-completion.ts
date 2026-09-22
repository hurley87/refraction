import type { UserProfile } from '@/lib/types';
import {
  readLocalStorageItem,
  writeLocalStorageItem,
} from '@/lib/map/map-storage';

export const PROFILE_COMPLETION_FIELDS = [
  'profile_picture_url',
  'name',
  'bio',
  'instagram_handle',
  'favorite_music_venue',
  'favorite_gallery',
  'favorite_restaurant',
] as const;

export type ProfileCompletionField = (typeof PROFILE_COMPLETION_FIELDS)[number];

export const PROFILE_COMPLETION_FIELD_LABELS: Record<
  ProfileCompletionField,
  string
> = {
  profile_picture_url: 'Profile picture',
  name: 'Display name',
  bio: 'Bio',
  instagram_handle: 'Instagram handle',
  favorite_music_venue: 'Favorite Club',
  favorite_gallery: 'Favorite Bar',
  favorite_restaurant: 'Favorite Restaurant',
};

const FAVORITE_PLACE_FIELDS = new Set<ProfileCompletionField>([
  'favorite_music_venue',
  'favorite_gallery',
  'favorite_restaurant',
]);

export function isProfileCompletionFieldFilled(
  field: ProfileCompletionField,
  value: unknown
): boolean {
  if (FAVORITE_PLACE_FIELDS.has(field)) {
    if (typeof value !== 'object' || value === null) return false;
    const placeId = (value as { place_id?: unknown }).place_id;
    return typeof placeId === 'string' && placeId.trim().length > 0;
  }

  return typeof value === 'string' && value.trim().length > 0;
}

export function getProfileCompletionCount(
  profile: Partial<UserProfile> | null | undefined
): number {
  if (!profile) return 0;

  return PROFILE_COMPLETION_FIELDS.filter((field) =>
    isProfileCompletionFieldFilled(field, profile[field])
  ).length;
}

export function isProfileComplete(
  profile: Partial<UserProfile> | null | undefined
): boolean {
  return (
    getProfileCompletionCount(profile) === PROFILE_COMPLETION_FIELDS.length
  );
}

export function getMissingProfileCompletionLabels(
  profile: Partial<UserProfile> | null | undefined
): string[] {
  return PROFILE_COMPLETION_FIELDS.filter(
    (field) => !isProfileCompletionFieldFilled(field, profile?.[field])
  ).map((field) => PROFILE_COMPLETION_FIELD_LABELS[field]);
}

export function sumProfilePointsAwarded(
  awards?: Array<{ points?: number }> | null
): number {
  return (awards ?? []).reduce((sum, award) => sum + (award.points ?? 0), 0);
}

/** Appends awarded points to a profile-save toast, e.g. "Profile picture updated — +100 IRL Points". */
export function withProfilePointsToast(
  baseMessage: string,
  awards?: Array<{ points?: number }> | null
): string {
  const total = sumProfilePointsAwarded(awards);
  if (total <= 0) return baseMessage;
  return `${baseMessage} — +${total} IRL Points`;
}

export function pointsAwardedFromProfileResponse(
  body: unknown
): Array<{ field?: string; points: number }> {
  if (!body || typeof body !== 'object') return [];
  const payload =
    'data' in body && (body as { data?: unknown }).data != null
      ? (body as { data: unknown }).data
      : body;
  if (!payload || typeof payload !== 'object') return [];
  const awards = (payload as { pointsAwarded?: unknown }).pointsAwarded;
  if (!Array.isArray(awards)) return [];
  return awards.flatMap((award) => {
    if (
      typeof award !== 'object' ||
      award === null ||
      typeof (award as { points?: unknown }).points !== 'number'
    ) {
      return [];
    }
    const field = (award as { field?: unknown }).field;
    return [
      {
        points: (award as { points: number }).points,
        ...(typeof field === 'string' ? { field } : {}),
      },
    ];
  });
}

/** Shown once after the 1,000-point profile completion bonus is granted. */
export const PROFILE_COMPLETE_REWARDS_TIP_STORAGE_KEY =
  'irl-profile-complete-rewards-tip-seen-v2';

export function getProfileCompleteRewardsTipStorageKey(
  wallet?: string | null
): string {
  const normalized = wallet?.trim().toLowerCase();
  return normalized
    ? `${PROFILE_COMPLETE_REWARDS_TIP_STORAGE_KEY}:${normalized}`
    : PROFILE_COMPLETE_REWARDS_TIP_STORAGE_KEY;
}

export function hasSeenProfileCompleteRewardsTip(
  wallet?: string | null
): boolean {
  return (
    readLocalStorageItem(getProfileCompleteRewardsTipStorageKey(wallet)) === '1'
  );
}

export function markProfileCompleteRewardsTipSeen(
  wallet?: string | null
): void {
  writeLocalStorageItem(getProfileCompleteRewardsTipStorageKey(wallet), '1');
}

export function clearProfileCompleteRewardsTipSeen(
  wallet?: string | null
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(
      getProfileCompleteRewardsTipStorageKey(wallet)
    );
  } catch {
    // Storage may be blocked.
  }
}

/** True when a profile PUT response just granted the completion bonus. */
export function didAwardProfileCompletionBonus(
  awards?: Array<{ field?: string; points?: number }> | null
): boolean {
  return (awards ?? []).some((award) => award.field === 'profile_complete');
}
