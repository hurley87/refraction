import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetPrivyUserId = vi.fn();
const mockGetCityGuidePageData = vi.fn();

vi.mock('@/lib/api/privy', () => ({
  getPrivyUserIdFromRequest: (...args: unknown[]) =>
    mockGetPrivyUserId(...args),
}));

vi.mock('@/lib/db/guides', () => ({
  getCityGuidePageData: (...args: unknown[]) =>
    mockGetCityGuidePageData(...args),
}));

import { GET } from '../route';

function request() {
  return new NextRequest(
    'http://localhost:3000/api/city-guides/berlin/locations'
  );
}

describe('GET /api/city-guides/[slug]/locations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPrivyUserId.mockResolvedValue('did:privy:user-1');
  });

  it('returns 401 without a valid Privy user', async () => {
    mockGetPrivyUserId.mockResolvedValue(null);

    const response = await GET(request(), { params: { slug: 'berlin' } });

    expect(response.status).toBe(401);
    expect(mockGetCityGuidePageData).not.toHaveBeenCalled();
  });

  it('returns 404 for an unavailable published guide', async () => {
    mockGetCityGuidePageData.mockResolvedValue(null);

    const response = await GET(request(), { params: { slug: 'missing' } });

    expect(response.status).toBe(404);
  });

  it('returns full ordered locations to an authenticated user', async () => {
    const locationSections = [
      {
        heading: null,
        defaultContributorName: 'Alice',
        locations: [{ membership_id: 1 }],
      },
    ];
    mockGetCityGuidePageData.mockResolvedValue({
      locationSections,
      contributorNames: ['Alice'],
      locationContributorByPlaceId: new Map([['place-1', 'Alice']]),
    });

    const response = await GET(request(), { params: { slug: 'berlin' } });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetCityGuidePageData).toHaveBeenCalledWith('berlin', {
      locationAudience: 'full',
    });
    expect(json.data).toEqual({
      locationSections,
      contributorNames: ['Alice'],
      locationContributorByPlaceId: { 'place-1': 'Alice' },
    });
  });
});
