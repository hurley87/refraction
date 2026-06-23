import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetPlayerByWallet = vi.fn();
const mockListFavoritePlaceIdsByPlayer = vi.fn();

vi.mock('@/lib/db/players', () => ({
  getPlayerByWallet: (...args: unknown[]) => mockGetPlayerByWallet(...args),
  createOrUpdatePlayer: vi.fn(),
}));

vi.mock('@/lib/db/favorites', () => ({
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
  listFavoritePlaceIdsByPlayer: (...args: unknown[]) =>
    mockListFavoritePlaceIdsByPlayer(...args),
  listFavoriteLocationsByPlayer: vi.fn(),
}));

vi.mock('@/lib/db/client', () => ({
  supabase: { from: vi.fn() },
}));

import { GET } from '../route';

function createRequest(searchParams: Record<string, string>): Request {
  const url = new URL('http://localhost:3000/api/location-favorite');
  Object.entries(searchParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return new Request(url.toString(), { method: 'GET' });
}

describe('GET /api/location-favorite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty placeIds when player is missing', async () => {
    mockGetPlayerByWallet.mockResolvedValue(null);

    const response = await GET(
      createRequest({
        walletAddress: '0x1234567890123456789012345678901234567890',
      })
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.placeIds).toEqual([]);
  });

  it('returns favorited placeIds for a player', async () => {
    mockGetPlayerByWallet.mockResolvedValue({ id: 42 });
    mockListFavoritePlaceIdsByPlayer.mockResolvedValue(['place-a', 'place-b']);

    const response = await GET(
      createRequest({
        walletAddress: '0x1234567890123456789012345678901234567890',
      })
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.placeIds).toEqual(['place-a', 'place-b']);
    expect(mockListFavoritePlaceIdsByPlayer).toHaveBeenCalledWith(42);
  });
});
