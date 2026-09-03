import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';

vi.mock('@/lib/db/players', () => ({
  getPlayerByWallet: vi.fn(),
  createOrUpdatePlayer: vi.fn(),
}));

vi.mock('@/lib/db/player-custom-lists', () => ({
  createCustomList: vi.fn(),
  deleteCustomList: vi.fn(),
  listCustomListsByPlayer: vi.fn(),
  listCustomListsWithLocationsByPlayer: vi.fn(),
  updateCustomList: vi.fn(),
}));

vi.mock('@/lib/analytics', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/analytics')>('@/lib/analytics');
  return {
    ...actual,
    trackLocationListCreated: vi.fn(),
    resolveServerIdentity: actual.resolveServerIdentity,
  };
});

import { createOrUpdatePlayer } from '@/lib/db/players';
import { createCustomList } from '@/lib/db/player-custom-lists';
import { trackLocationListCreated } from '@/lib/analytics';

function createPostRequest(body: object): NextRequest {
  return new NextRequest('http://localhost:3000/api/player-lists', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/player-lists', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fires location_list_created after a successful create', async () => {
    vi.mocked(createOrUpdatePlayer).mockResolvedValueOnce({
      id: 42,
      wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
      email: 'list@example.com',
      total_points: 0,
    });
    vi.mocked(createCustomList).mockResolvedValueOnce({
      id: 'list-uuid-1',
      player_id: 42,
      title: 'Berlin bars',
      description: 'After-hours spots',
      thumbnail_url: 'https://example.com/thumb.jpg',
      is_private: false,
      slug: 'berlin-bars',
      created_at: '2026-09-03T00:00:00Z',
    });

    const response = await POST(
      createPostRequest({
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        title: 'Berlin bars',
        description: 'After-hours spots',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        isPrivate: false,
      })
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(trackLocationListCreated).toHaveBeenCalledWith('list@example.com', {
      list_id: 'list-uuid-1',
      is_private: false,
      has_thumbnail: true,
      has_description: true,
    });
  });

  it('does not fire location_list_created when create fails', async () => {
    vi.mocked(createOrUpdatePlayer).mockResolvedValueOnce({
      id: 42,
      wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
      total_points: 0,
    });
    vi.mocked(createCustomList).mockRejectedValueOnce(new Error('db down'));

    const response = await POST(
      createPostRequest({
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        title: 'Berlin bars',
        isPrivate: true,
      })
    );

    expect(response.status).toBe(500);
    expect(trackLocationListCreated).not.toHaveBeenCalled();
  });
});
