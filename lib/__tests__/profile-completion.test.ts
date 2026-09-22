import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  clearProfileCompleteRewardsTipSeen,
  getMissingProfileCompletionLabels,
  getProfileCompleteRewardsTipStorageKey,
  getProfileCompletionCount,
  hasSeenProfileCompleteRewardsTip,
  isProfileComplete,
  isProfileCompletionFieldFilled,
  markProfileCompleteRewardsTipSeen,
  pointsAwardedFromProfileResponse,
  PROFILE_COMPLETE_REWARDS_TIP_STORAGE_KEY,
  withProfilePointsToast,
} from '@/lib/profile-completion';
import { getActivityConfig } from '@/lib/points-activities';

const favoritePlace = {
  place_id: 'mapbox.place',
  name: 'Favorite Place',
  address: '123 Main St',
  latitude: 1,
  longitude: 2,
};

describe('profile completion', () => {
  it('counts exactly the seven completion fields', () => {
    const profile = {
      profile_picture_url: 'https://example.com/avatar.jpg',
      name: 'Alex',
      bio: 'Member bio',
      instagram_handle: 'alex',
      favorite_music_venue: favoritePlace,
      favorite_gallery: favoritePlace,
      favorite_restaurant: favoritePlace,
      email: 'ignored@example.com',
      city: 'New York',
      website: 'https://example.com',
    };

    expect(getProfileCompletionCount(profile)).toBe(7);
    expect(isProfileComplete(profile)).toBe(true);
    expect(getMissingProfileCompletionLabels(profile)).toEqual([]);
  });

  it('does not count blank strings or favorite objects without a place_id', () => {
    expect(isProfileCompletionFieldFilled('bio', '   ')).toBe(false);
    expect(
      isProfileCompletionFieldFilled('favorite_gallery', { name: 'No ID' })
    ).toBe(false);
  });

  it('reports an incomplete profile', () => {
    expect(
      getProfileCompletionCount({
        name: 'Alex',
        instagram_handle: 'alex',
      })
    ).toBe(2);
    expect(
      getMissingProfileCompletionLabels({
        name: 'Alex',
        instagram_handle: 'alex',
      })
    ).toEqual([
      'Profile picture',
      'Bio',
      'Favorite Club',
      'Favorite Bar',
      'Favorite Restaurant',
    ]);
  });

  it('configures seven 100-point fields and a 300-point completion bonus', () => {
    const fieldActivities = [
      'profile_field_picture',
      'profile_field_name',
      'profile_field_bio',
      'profile_field_instagram',
      'profile_field_favorite_club',
      'profile_field_favorite_bar',
      'profile_field_favorite_restaurant',
    ] as const;

    for (const activity of fieldActivities) {
      expect(getActivityConfig(activity)?.base_points).toBe(100);
    }
    expect(getActivityConfig('profile_complete')?.base_points).toBe(300);
  });

  it('appends awarded points to a profile save toast', () => {
    expect(withProfilePointsToast('Profile picture updated', [])).toBe(
      'Profile picture updated'
    );
    expect(
      withProfilePointsToast('Profile picture updated', [{ points: 100 }])
    ).toBe('Profile picture updated — +100 IRL Points');
    expect(
      withProfilePointsToast('Profile updated', [
        { points: 100 },
        { points: 300 },
      ])
    ).toBe('Profile updated — +400 IRL Points');
    expect(
      pointsAwardedFromProfileResponse({
        data: { pointsAwarded: [{ field: 'name', points: 100 }] },
      })
    ).toEqual([{ field: 'name', points: 100 }]);
  });

  it('scopes the completed-profile rewards tip by wallet', () => {
    expect(getProfileCompleteRewardsTipStorageKey('0xABC')).toBe(
      `${PROFILE_COMPLETE_REWARDS_TIP_STORAGE_KEY}:0xabc`
    );
  });
});

describe('profile complete rewards tip storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('records that the member has seen the completed-profile tip', () => {
    expect(hasSeenProfileCompleteRewardsTip('0xabc')).toBe(false);
    markProfileCompleteRewardsTipSeen('0xABC');
    expect(hasSeenProfileCompleteRewardsTip('0xabc')).toBe(true);
  });

  it('can clear the completed-profile tip so it shows again after a reset', () => {
    markProfileCompleteRewardsTipSeen('0xabc');
    clearProfileCompleteRewardsTipSeen('0xABC');
    expect(hasSeenProfileCompleteRewardsTip('0xabc')).toBe(false);
  });
});
