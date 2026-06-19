import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
const mockGetPlayerIdByWalletAddress = vi.fn();

vi.mock('@/lib/db/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

vi.mock('@/lib/db/players', () => ({
  getPlayerIdByWalletAddress: (...args: unknown[]) =>
    mockGetPlayerIdByWalletAddress(...args),
}));

import { GET } from '../route';

function createRequest(searchParams: Record<string, string>): Request {
  const url = new URL('http://localhost:3000/api/location-comments');
  Object.entries(searchParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return new Request(url.toString(), { method: 'GET' });
}

type QueryResult = { data: unknown; error: unknown };

function createQueryChain(result: QueryResult) {
  const chain: Record<string, unknown> = {};
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop) {
      if (prop === 'then') {
        return (resolve: (value: QueryResult) => void) => resolve(result);
      }
      return () => new Proxy(chain, handler);
    },
  };
  return new Proxy(chain, handler);
}

describe('GET /api/location-comments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPlayerIdByWalletAddress.mockResolvedValue(null);
  });

  it('returns 400 when placeId and placeIds are missing', async () => {
    const response = await GET(createRequest({}));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
  });

  it('returns 400 when batch request omits purpose=avatars', async () => {
    const response = await GET(createRequest({ placeIds: 'place-a,place-b' }));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain('purpose=avatars');
  });

  it('returns grouped avatars for batch placeIds', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'locations') {
        return createQueryChain({
          data: [
            { id: 10, place_id: 'place-a' },
            { id: 20, place_id: 'place-b' },
          ],
          error: null,
        });
      }

      if (table === 'player_location_checkins') {
        return createQueryChain({
          data: [
            {
              id: 1,
              location_id: 10,
              created_at: '2024-01-02T00:00:00.000Z',
              players: { username: 'alice' },
            },
            {
              id: 2,
              location_id: 20,
              created_at: '2024-01-01T00:00:00.000Z',
              players: { username: 'bob' },
            },
          ],
          error: null,
        });
      }

      throw new Error(`Unexpected table ${table}`);
    });

    const response = await GET(
      createRequest({
        placeIds: 'place-a,place-b',
        purpose: 'avatars',
        limit: '3',
      })
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.checkinsByPlaceId['place-a']).toHaveLength(1);
    expect(json.data.checkinsByPlaceId['place-b']).toHaveLength(1);
  });

  it('returns empty batch avatars on transient checkins failure', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'locations') {
        return createQueryChain({
          data: [{ id: 10, place_id: 'place-a' }],
          error: null,
        });
      }

      if (table === 'player_location_checkins') {
        return createQueryChain({
          data: null,
          error: { status: 503, message: 'Service Unavailable' },
        });
      }

      throw new Error(`Unexpected table ${table}`);
    });

    const response = await GET(
      createRequest({
        placeIds: 'place-a,place-b',
        purpose: 'avatars',
      })
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.checkinsByPlaceId).toEqual({});
  });

  it('returns full checkins with hasUserCheckedIn for single place', async () => {
    mockGetPlayerIdByWalletAddress.mockResolvedValue(99);
    let checkinsQueryCount = 0;

    mockFrom.mockImplementation((table: string) => {
      if (table === 'locations') {
        return createQueryChain({
          data: { id: 10, place_id: 'place-a' },
          error: null,
        });
      }

      if (table === 'player_location_checkins') {
        checkinsQueryCount += 1;
        if (checkinsQueryCount === 1) {
          return createQueryChain({ data: null, error: null });
        }

        return createQueryChain({
          data: [
            {
              id: 1,
              location_id: 10,
              comment: 'Nice spot',
              image_url: null,
              points_earned: 5,
              created_at: '2024-01-01T00:00:00.000Z',
              players: { username: 'alice', wallet_address: '0xabc' },
            },
          ],
          error: null,
        });
      }

      throw new Error(`Unexpected table ${table}`);
    });

    const response = await GET(
      createRequest({
        placeId: 'place-a',
        walletAddress: '0xabc',
      })
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.checkins).toHaveLength(1);
    expect(json.data.checkins[0].comment).toBe('Nice spot');
    expect(json.data.hasUserCheckedIn).toBe(false);
    expect(mockGetPlayerIdByWalletAddress).toHaveBeenCalledWith('0xabc');
  });

  it('includes check-ins without comments when purpose=avatars on single place', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'locations') {
        return createQueryChain({
          data: { id: 10, place_id: 'place-a' },
          error: null,
        });
      }

      if (table === 'player_location_checkins') {
        return createQueryChain({
          data: [
            {
              id: 1,
              location_id: 10,
              created_at: '2024-01-01T00:00:00.000Z',
              comment: null,
              players: { username: 'alice' },
            },
          ],
          error: null,
        });
      }

      throw new Error(`Unexpected table ${table}`);
    });

    const response = await GET(
      createRequest({
        placeId: 'place-a',
        purpose: 'avatars',
      })
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.checkins).toHaveLength(1);
    expect(json.data.checkins[0].username).toBe('alice');
    expect(json.data.checkins[0].comment).toBeUndefined();
  });
});
