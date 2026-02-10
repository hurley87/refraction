import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the supabase client - use any for complex mock chains
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFrom = vi.fn((): any => ({}));

vi.mock('@/lib/db/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

import {
  createOrUpdateUserProfile,
  getUserProfile,
  updateUserProfile,
  awardProfileFieldPoints,
} from '../profiles';

describe('Profiles Database Module', () => {
  const sampleProfile = {
    id: 1,
    wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
    solana_wallet_address: null,
    stellar_wallet_address: null,
    stellar_wallet_id: null,
    aptos_wallet_address: null,
    aptos_wallet_id: null,
    email: 'test@example.com',
    username: 'testuser',
    name: 'Test User',
    twitter_handle: '@testuser',
    towns_handle: null,
    farcaster_handle: null,
    telegram_handle: null,
    profile_picture_url: 'https://example.com/pic.jpg',
    total_points: 100,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserProfile', () => {
    it('should return profile when found', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: sampleProfile, error: null }),
          })),
        })),
      });

      const result = await getUserProfile('0x1234567890abcdef1234567890abcdef12345678');

      expect(result).toEqual(sampleProfile);
      expect(mockFrom).toHaveBeenCalledWith('players');
    });

    it('should return null when not found (PGRST116)', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'Not found' },
            }),
          })),
        })),
      });

      const result = await getUserProfile('0xnonexistent');

      expect(result).toBeNull();
    });

    it('should throw error for other database errors', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST500', message: 'Database error' },
            }),
          })),
        })),
      });

      await expect(getUserProfile('0x1234')).rejects.toEqual({
        code: 'PGRST500',
        message: 'Database error',
      });
    });
  });

  describe('createOrUpdateUserProfile', () => {
    it('should update existing profile when found', async () => {
      const updatedProfile = { ...sampleProfile, name: 'Updated Name' };

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: select existing profile
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: sampleProfile, error: null }),
              })),
            })),
          };
        }
        // Second call: update profile
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: updatedProfile, error: null }),
              })),
            })),
          })),
        };
      });

      const result = await createOrUpdateUserProfile({
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        name: 'Updated Name',
        email: 'test@example.com',
      });

      expect(result).toEqual(updatedProfile);
    });

    it('should create new profile when not found', async () => {
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: select returns no existing profile
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
          };
        }
        // Second call: insert new profile
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: sampleProfile, error: null }),
            })),
          })),
        };
      });

      const result = await createOrUpdateUserProfile({
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        name: 'Test User',
        email: 'test@example.com',
      });

      expect(result).toEqual(sampleProfile);
    });

    it('should throw error on update failure', async () => {
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: sampleProfile, error: null }),
              })),
            })),
          };
        }
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'PGRST500', message: 'Update failed' },
                }),
              })),
            })),
          })),
        };
      });

      await expect(
        createOrUpdateUserProfile({
          wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
          name: 'Updated Name',
        })
      ).rejects.toEqual({ code: 'PGRST500', message: 'Update failed' });
    });

    it('should throw error on insert failure', async () => {
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              })),
            })),
          };
        }
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST500', message: 'Insert failed' },
              }),
            })),
          })),
        };
      });

      await expect(
        createOrUpdateUserProfile({
          wallet_address: '0xnewwallet',
          name: 'New User',
        })
      ).rejects.toEqual({ code: 'PGRST500', message: 'Insert failed' });
    });
  });

  describe('updateUserProfile', () => {
    it('should update profile fields and return updated profile', async () => {
      const updatedProfile = { ...sampleProfile, twitter_handle: '@newhandle' };

      mockFrom.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: updatedProfile, error: null }),
            })),
          })),
        })),
      });

      const result = await updateUserProfile(
        '0x1234567890abcdef1234567890abcdef12345678',
        { twitter_handle: '@newhandle' }
      );

      expect(result).toEqual(updatedProfile);
      expect(result.twitter_handle).toBe('@newhandle');
      expect(mockFrom).toHaveBeenCalledWith('players');
    });

    it('should throw error on update failure', async () => {
      mockFrom.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST500', message: 'Update failed' },
              }),
            })),
          })),
        })),
      });

      await expect(
        updateUserProfile('0x1234', { name: 'New Name' })
      ).rejects.toEqual({ code: 'PGRST500', message: 'Update failed' });
    });
  });

  describe('awardProfileFieldPoints', () => {
    it('should award points when field not previously rewarded', async () => {
      const mockActivity = {
        id: 'activity-1',
        user_wallet_address: '0x1234',
        activity_type: 'profile_field_twitter',
        points_earned: 5,
      };

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: check existing activity - returns empty
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                })),
              })),
            })),
          };
        }
        // Second call: insert new activity
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: mockActivity, error: null }),
            })),
          })),
        };
      });

      const result = await awardProfileFieldPoints(
        '0x1234',
        'profile_field_twitter',
        '@testuser'
      );

      expect(result).toEqual({ success: true, activity: mockActivity });
    });

    it('should not award points when field was already rewarded', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({
                data: [{ id: 'existing-activity' }],
                error: null,
              }),
            })),
          })),
        })),
      });

      const result = await awardProfileFieldPoints(
        '0x1234',
        'profile_field_twitter',
        '@testuser'
      );

      expect(result).toEqual({
        success: false,
        reason: 'Points already awarded for this field',
      });
    });

    it('should return error result on insert failure', async () => {
      const insertError = { code: 'PGRST500', message: 'Insert failed' };

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                })),
              })),
            })),
          };
        }
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: insertError,
              }),
            })),
          })),
        };
      });

      const result = await awardProfileFieldPoints(
        '0x1234',
        'profile_field_twitter',
        '@testuser'
      );

      expect(result.success).toBe(false);
      expect(result.error).toEqual(insertError);
    });
  });
});
