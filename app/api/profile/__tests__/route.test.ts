import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PUT } from '../route';

vi.mock('@/lib/db/profiles', () => ({
  getUserProfile: vi.fn(),
  getUserProfileByUsername: vi.fn(),
  createOrUpdateUserProfile: vi.fn(),
  awardProfileFieldPoints: vi.fn(),
  isUsernameTakenByOther: vi.fn().mockResolvedValue(false),
  isPostgresUniqueUsernameViolation: vi.fn(() => false),
}));

import {
  createOrUpdateUserProfile,
  getUserProfileByUsername,
  isUsernameTakenByOther,
} from '@/lib/db/profiles';

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
  });
});
