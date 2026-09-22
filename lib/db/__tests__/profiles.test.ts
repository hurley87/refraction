import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the supabase client - use any for complex mock chains
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFrom = vi.fn((): any => ({}));

const mockRpc = vi.fn().mockResolvedValue({ data: 100, error: null });

vi.mock('@/lib/db/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    rpc: (fn: string, args: unknown) => mockRpc(fn, args),
  },
}));

import {
  createOrUpdateUserProfile,
  getUserProfile,
  updateUserProfile,
  awardProfileFieldPoints,
  ensureProfileCompletionAward,
  hasProfileCompletionAward,
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
    instagram_handle: null,
    profile_picture_url: 'https://example.com/pic.jpg',
    city: null,
    country: null,
    bio: null,
    favorite_music_venue: null,
    favorite_gallery: null,
    favorite_restaurant: null,
    total_points: 100,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ data: 100, error: null });
  });

  describe('getUserProfile', () => {
    it('should return profile when found', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi
              .fn()
              .mockResolvedValue({ data: sampleProfile, error: null }),
          })),
        })),
      });

      const result = await getUserProfile(
        '0x1234567890abcdef1234567890abcdef12345678'
      );

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
                single: vi
                  .fn()
                  .mockResolvedValue({ data: sampleProfile, error: null }),
              })),
            })),
          };
        }
        // Second call: update profile
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi
                  .fn()
                  .mockResolvedValue({ data: updatedProfile, error: null }),
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
              single: vi
                .fn()
                .mockResolvedValue({ data: sampleProfile, error: null }),
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
                single: vi
                  .fn()
                  .mockResolvedValue({ data: sampleProfile, error: null }),
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
              single: vi
                .fn()
                .mockResolvedValue({ data: updatedProfile, error: null }),
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
              single: vi
                .fn()
                .mockResolvedValue({ data: mockActivity, error: null }),
            })),
          })),
        };
      });

      const result = await awardProfileFieldPoints(
        '0x1234',
        'profile_field_twitter',
        '@testuser',
        100
      );

      expect(result).toEqual({ success: true, activity: mockActivity });
      expect(mockRpc).toHaveBeenCalledWith('increment_player_points', {
        p_wallet_address: '0x1234',
        p_points: 100,
      });
    });

    it('should remove the activity when the player score cannot be credited', async () => {
      const mockActivity = { id: 'activity-1' };
      const creditError = { code: '42883', message: 'function missing' };
      const deleteEq = vi.fn().mockResolvedValue({ error: null });

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
        if (callCount === 2) {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi
                  .fn()
                  .mockResolvedValue({ data: mockActivity, error: null }),
              })),
            })),
          };
        }
        return { delete: vi.fn(() => ({ eq: deleteEq })) };
      });
      mockRpc.mockResolvedValue({ data: null, error: creditError });

      const result = await awardProfileFieldPoints(
        '0x1234',
        'profile_field_bio',
        'A bio',
        100
      );

      expect(result.success).toBe(false);
      expect(result.error).toEqual(creditError);
      expect(deleteEq).toHaveBeenCalledWith('id', 'activity-1');
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

  describe('hasProfileCompletionAward', () => {
    it('matches profile_complete rows case-insensitively', async () => {
      const limit = vi.fn().mockResolvedValue({
        data: [
          {
            id: '1',
            user_wallet_address: '0xABCDEF1234567890ABCDEF1234567890ABCDEF12',
          },
        ],
        error: null,
      });
      const ilike = vi.fn(() => ({ limit }));
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ ilike })),
        })),
      });

      await expect(
        hasProfileCompletionAward('0xabcdef1234567890abcdef1234567890abcdef12')
      ).resolves.toBe(true);
      expect(ilike).toHaveBeenCalledWith(
        'user_wallet_address',
        '0xabcdef1234567890abcdef1234567890abcdef12'
      );
    });
  });

  describe('ensureProfileCompletionAward', () => {
    const completeProfile = {
      profile_picture_url: 'https://example.com/a.jpg',
      name: 'Alex',
      bio: 'Bio',
      instagram_handle: 'alex',
      favorite_music_venue: {
        place_id: 'p1',
        name: 'Club',
        address: '1 St',
        latitude: 1,
        longitude: 2,
      },
      favorite_gallery: {
        place_id: 'p2',
        name: 'Bar',
        address: '2 St',
        latitude: 1,
        longitude: 2,
      },
      favorite_restaurant: {
        place_id: 'p3',
        name: 'Food',
        address: '3 St',
        latitude: 1,
        longitude: 2,
      },
    };

    it('returns false when the profile is incomplete and no award exists', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            ilike: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
          })),
        })),
      });

      await expect(
        ensureProfileCompletionAward('0x1234', { name: 'Alex' })
      ).resolves.toBe(false);
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('grants the completion bonus when the profile is complete but unawarded', async () => {
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        // hasProfileCompletionAward (first check) — empty
        if (callCount === 1) {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                ilike: vi.fn(() => ({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                })),
              })),
            })),
          };
        }
        // awardProfileFieldPoints existing-check — empty
        if (callCount === 2) {
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
        // insert activity
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: 'new', activity_type: 'profile_complete' },
                error: null,
              }),
            })),
          })),
        };
      });

      await expect(
        ensureProfileCompletionAward('0x1234', completeProfile)
      ).resolves.toBe(true);
      expect(mockRpc).toHaveBeenCalled();
    });
  });
});
