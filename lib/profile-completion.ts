import type { UserProfile } from '@/lib/types';

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
): Array<{ points: number }> {
  if (!body || typeof body !== 'object') return [];
  const payload =
    'data' in body && (body as { data?: unknown }).data != null
      ? (body as { data: unknown }).data
      : body;
  if (!payload || typeof payload !== 'object') return [];
  const awards = (payload as { pointsAwarded?: unknown }).pointsAwarded;
  if (!Array.isArray(awards)) return [];
  return awards.filter(
    (award): award is { points: number } =>
      typeof award === 'object' &&
      award !== null &&
      typeof (award as { points?: unknown }).points === 'number'
  );
}
