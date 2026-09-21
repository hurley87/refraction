import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PUT } from '../route';

vi.mock('@/lib/db/profiles', () => ({
  getUserProfile: vi.fn(),
  getUserProfileByUsername: vi.fn(),
  createOrUpdateUserProfile: vi.fn(),
  awardProfileFieldPoints: vi.fn(),
  hasProfileCompletionAward: vi.fn().mockResolvedValue(false),
  isUsernameTakenByOther: vi.fn().mockResolvedValue(false),
  isPostgresUniqueUsernameViolation: vi.fn(() => false),
}));

vi.mock('@/lib/analytics/server', () => ({
  trackProfileCompleted: vi.fn(),
  resolveServerIdentity: vi.fn(
    ({
      email,
      walletAddress,
    }: {
      email?: string | null;
      walletAddress?: string;
    }) => email || walletAddress
  ),
}));

import {
  awardProfileFieldPoints,
  createOrUpdateUserProfile,
  getUserProfile,
  getUserProfileByUsername,
  hasProfileCompletionAward,
  isUsernameTakenByOther,
} from '@/lib/db/profiles';
import { trackProfileCompleted } from '@/lib/analytics/server';

function createMockPutRequest(body: object): NextRequest {
  return new NextRequest('http://localhost:3000/api/profile', {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Profile API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/profile', () => {
    it('returns public profile fields for a username lookup', async () => {
      vi.mocked(getUserProfileByUsername).mockResolvedValueOnce({
        wallet_address: '0xabc',
        email: 'secret@example.com',
        username: 'malcolm_levy',
        name: 'Malcolm Levy',
        profile_picture_url: 'https://cdn.example/malcolm.jpg',
        twitter_handle: 'malcolm_levy',
      });

      const response = await GET(
        new NextRequest(
          'http://localhost:3000/api/profile?username=malcolm_levy'
        )
      );
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toEqual({
        username: 'malcolm_levy',
        name: 'Malcolm Levy',
        profile_picture_url: 'https://cdn.example/malcolm.jpg',
        twitter_handle: 'malcolm_levy',
      });
      expect(json.data.email).toBeUndefined();
    });

    it('reports the completion bonus as already granted', async () => {
      const walletAddress = '0x1234567890abcdef1234567890abcdef12345678';
      vi.mocked(getUserProfile).mockResolvedValueOnce({
        wallet_address: walletAddress,
        name: 'Alex',
      });
      vi.mocked(hasProfileCompletionAward).mockResolvedValueOnce(true);

      const response = await GET(
        new NextRequest(
          `http://localhost:3000/api/profile?wallet_address=${walletAddress}`
        )
      );
      const json = await response.json();

      expect(json.data.profile_completion_awarded).toBe(true);
    });
  });

  describe('PUT /api/profile', () => {
    it('returns 400 when username is a reserved system slug', async () => {
      for (const username of ['faq', 'admin']) {
        const response = await PUT(
          createMockPutRequest({
            wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
            username,
          })
        );
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.success).toBe(false);
        expect(json.error).toMatch(/reserved/i);
        expect(createOrUpdateUserProfile).not.toHaveBeenCalled();
        expect(isUsernameTakenByOther).not.toHaveBeenCalled();
      }
    });

    it('awards 100 points for each first-filled completion field and a 300 point completion bonus', async () => {
      const walletAddress = '0x1234567890abcdef1234567890abcdef12345678';
      const favoritePlace = {
        place_id: 'mapbox.place',
        name: 'Favorite Place',
        address: '123 Main St',
        latitude: 1,
        longitude: 2,
      };
      const completedProfile = {
        wallet_address: walletAddress,
        profile_picture_url: 'https://example.com/avatar.jpg',
        name: 'Alex',
        bio: 'Member bio',
        instagram_handle: 'alex',
        favorite_music_venue: favoritePlace,
        favorite_gallery: favoritePlace,
        favorite_restaurant: favoritePlace,
      };

      vi.mocked(getUserProfile).mockResolvedValueOnce({
        wallet_address: walletAddress,
      });
      vi.mocked(createOrUpdateUserProfile).mockResolvedValueOnce(
        completedProfile as unknown as Awaited<
          ReturnType<typeof createOrUpdateUserProfile>
        >
      );
      vi.mocked(awardProfileFieldPoints).mockImplementation(
        async (_wallet, activityType) => ({
          success: true,
          activity: { activity_type: activityType },
        })
      );

      const response = await PUT(createMockPutRequest(completedProfile));
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.pointsAwarded).toHaveLength(8);
      expect(
        json.data.pointsAwarded.reduce(
          (sum: number, award: { points: number }) => sum + award.points,
          0
        )
      ).toBe(1000);
      expect(awardProfileFieldPoints).toHaveBeenCalledWith(
        walletAddress,
        'profile_field_favorite_club',
        favoritePlace,
        100
      );
      expect(awardProfileFieldPoints).toHaveBeenLastCalledWith(
        walletAddress,
        'profile_complete',
        '7/7',
        300,
        'Completed profile'
      );
      expect(trackProfileCompleted).toHaveBeenCalledWith(walletAddress);
    });

    it('fires Mixpanel profile_completed when the profile first becomes complete', async () => {
      const walletAddress = '0x1234567890abcdef1234567890abcdef12345678';
      const favoritePlace = {
        place_id: 'mapbox.place',
        name: 'Favorite Place',
        address: '123 Main St',
        latitude: 1,
        longitude: 2,
      };
      const completedProfile = {
        wallet_address: walletAddress,
        email: 'alex@example.com',
        profile_picture_url: 'https://example.com/avatar.jpg',
        name: 'Alex',
        bio: 'Member bio',
        instagram_handle: 'alex',
        favorite_music_venue: favoritePlace,
        favorite_gallery: favoritePlace,
        favorite_restaurant: favoritePlace,
      };

      vi.mocked(getUserProfile).mockResolvedValueOnce({
        wallet_address: walletAddress,
        email: 'alex@example.com',
        profile_picture_url: completedProfile.profile_picture_url,
        name: completedProfile.name,
        bio: completedProfile.bio,
        instagram_handle: completedProfile.instagram_handle,
        favorite_music_venue: favoritePlace,
        favorite_gallery: favoritePlace,
      } as unknown as Awaited<ReturnType<typeof getUserProfile>>);
      vi.mocked(createOrUpdateUserProfile).mockResolvedValueOnce(
        completedProfile as unknown as Awaited<
          ReturnType<typeof createOrUpdateUserProfile>
        >
      );
      vi.mocked(awardProfileFieldPoints).mockResolvedValue({
        success: false,
        reason: 'Points already awarded for this field',
      });

      const response = await PUT(createMockPutRequest(completedProfile));

      expect(response.status).toBe(200);
      expect(trackProfileCompleted).toHaveBeenCalledWith('alex@example.com');
    });

    it('does not fire Mixpanel profile_completed when the profile was already complete', async () => {
      const walletAddress = '0x1234567890abcdef1234567890abcdef12345678';
      const favoritePlace = {
        place_id: 'mapbox.place',
        name: 'Favorite Place',
        address: '123 Main St',
        latitude: 1,
        longitude: 2,
      };
      const completedProfile = {
        wallet_address: walletAddress,
        profile_picture_url: 'https://example.com/avatar.jpg',
        name: 'Alex',
        bio: 'Updated bio',
        instagram_handle: 'alex',
        favorite_music_venue: favoritePlace,
        favorite_gallery: favoritePlace,
        favorite_restaurant: favoritePlace,
      };

      vi.mocked(getUserProfile).mockResolvedValueOnce(
        completedProfile as unknown as Awaited<
          ReturnType<typeof getUserProfile>
        >
      );
      vi.mocked(createOrUpdateUserProfile).mockResolvedValueOnce(
        completedProfile as unknown as Awaited<
          ReturnType<typeof createOrUpdateUserProfile>
        >
      );
      vi.mocked(awardProfileFieldPoints).mockResolvedValue({
        success: false,
        reason: 'Points already awarded for this field',
      });

      await PUT(createMockPutRequest(completedProfile));

      expect(trackProfileCompleted).not.toHaveBeenCalled();
    });

    it('does not award excluded profile fields', async () => {
      const walletAddress = '0x1234567890abcdef1234567890abcdef12345678';
      vi.mocked(getUserProfile).mockResolvedValueOnce({
        wallet_address: walletAddress,
      });
      vi.mocked(createOrUpdateUserProfile).mockResolvedValueOnce({
        wallet_address: walletAddress,
        website: 'https://example.com',
        twitter_handle: 'alex',
      } as unknown as Awaited<ReturnType<typeof createOrUpdateUserProfile>>);

      const response = await PUT(
        createMockPutRequest({
          wallet_address: walletAddress,
          website: 'https://example.com',
          twitter_handle: 'alex',
        })
      );

      expect(response.status).toBe(200);
      expect(awardProfileFieldPoints).not.toHaveBeenCalled();
      expect(trackProfileCompleted).not.toHaveBeenCalled();
    });
  });
});
