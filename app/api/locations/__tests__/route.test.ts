import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockSupabaseFrom = vi.fn();
let locationsFromCall = 0;

vi.mock('@/lib/db/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  },
}));

vi.mock('@/lib/db/players', () => ({
  getPlayerByWallet: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/analytics', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/analytics')>('@/lib/analytics');
  return {
    ...actual,
    resolveServerIdentity: vi.fn(() => 'test-distinct-id'),
    trackLocationCreated: vi.fn(),
    trackPointsEarned: vi.fn(),
  };
});

vi.mock('@/lib/analytics/server', () => ({
  setUserProperties: vi.fn(),
  trackCityMilestone: vi.fn(),
}));

import { POST } from '../route';

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/locations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function mockSuccessfulLocationCreateFlow() {
  locationsFromCall = 0;
  mockSupabaseFrom.mockImplementation((table: string) => {
    if (table === 'locations') {
      locationsFromCall += 1;
      if (locationsFromCall === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi
                .fn()
                .mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      }
      if (locationsFromCall === 2) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lt: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        };
      }
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 99,
                context: null,
                place_id: 'zero-place',
              },
              error: null,
            }),
          }),
        }),
      };
    }
    if (table === 'points_activities') {
      return {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    }
    return {};
  });
}

const baseBody = {
  place_id: 'zero-lat-place',
  name: 'Equator test',
  lat: 0,
  lon: 0,
  walletAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  locationImage: 'https://example.com/image.png',
};

describe('POST /api/locations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseFrom.mockReset();
  });

  it('accepts latitude and longitude 0 (equator / prime meridian)', async () => {
    mockSuccessfulLocationCreateFlow();
    const request = createPostRequest(baseBody);

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data?.location?.id).toBe(99);
  });

  it('returns 400 when latitude is missing (empty string)', async () => {
    const request = createPostRequest({ ...baseBody, lat: '' });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain('Missing required fields');
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });

  it('returns 400 when coordinates are out of range', async () => {
    const request = createPostRequest({ ...baseBody, lat: 91, lon: 0 });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toContain('Invalid latitude or longitude');
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });
});
