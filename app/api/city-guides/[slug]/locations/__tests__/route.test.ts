import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetPrivyUser = vi.fn();
const mockGetCityGuidePageData = vi.fn();
const mockResolvePlayer = vi.fn();
const mockResolveEvmWallet = vi.fn();
const mockTrackSignupFromGate = vi.fn();
const mockResolveServerIdentity = vi.fn();

vi.mock('@/lib/api/privy', () => ({
  getPrivyUserFromRequest: (...args: unknown[]) => mockGetPrivyUser(...args),
}));

vi.mock('@/lib/db/guides', () => ({
  getCityGuidePageData: (...args: unknown[]) =>
    mockGetCityGuidePageData(...args),
}));

vi.mock('@/lib/privy/resolve-evm-wallet-address', () => ({
  resolvePrivyEvmWalletAddress: (...args: unknown[]) =>
    mockResolveEvmWallet(...args),
}));

vi.mock('@/lib/privy/resolve-player-for-privy-user', () => ({
  resolvePlayerForPrivyUser: (...args: unknown[]) => mockResolvePlayer(...args),
  privyLoginEmail: (user: { email?: { address?: string } }) =>
    user.email?.address?.trim().toLowerCase(),
}));

vi.mock('@/lib/analytics', () => ({
  resolveServerIdentity: (...args: unknown[]) =>
    mockResolveServerIdentity(...args),
  trackSignupFromGate: (...args: unknown[]) => mockTrackSignupFromGate(...args),
}));

vi.mock('@/lib/monitoring/capture-handled-exception', () => ({
  captureHandledException: vi.fn(),
}));

import { GET } from '../route';

const EVM = '0x4D418f71c531465337b65127B207aa849Fa5a9e3';

function request(query = '') {
  return new NextRequest(
    `http://localhost:3000/api/city-guides/berlin/locations${query}`
  );
}

describe('GET /api/city-guides/[slug]/locations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPrivyUser.mockResolvedValue({
      id: 'did:privy:user-1',
      email: { address: 'gate@example.com' },
      linkedAccounts: [],
    });
    mockResolveEvmWallet.mockReturnValue(EVM);
    mockResolvePlayer.mockResolvedValue({
      player: { id: 1, email: 'gate@example.com' },
      created: false,
    });
    mockResolveServerIdentity.mockReturnValue('gate@example.com');
    mockGetCityGuidePageData.mockResolvedValue({
      locationSections: [],
      contributorNames: [],
      locationContributorByPlaceId: new Map(),
    });
  });

  it('returns 401 without a valid Privy user', async () => {
    mockGetPrivyUser.mockResolvedValue(null);

    const response = await GET(request(), { params: { slug: 'berlin' } });

    expect(response.status).toBe(401);
    expect(mockGetCityGuidePageData).not.toHaveBeenCalled();
    expect(mockResolvePlayer).not.toHaveBeenCalled();
  });

  it('returns 404 for an unavailable published guide', async () => {
    mockGetCityGuidePageData.mockResolvedValue(null);

    const response = await GET(request(), { params: { slug: 'missing' } });

    expect(response.status).toBe(404);
  });

  it('ensures player with Privy email before returning locations', async () => {
    const privyUser = {
      id: 'did:privy:user-1',
      email: { address: 'gate@example.com' },
      linkedAccounts: [],
    };
    mockGetPrivyUser.mockResolvedValue(privyUser);

    const response = await GET(request(), { params: { slug: 'berlin' } });

    expect(response.status).toBe(200);
    expect(mockResolvePlayer).toHaveBeenCalledWith(EVM, privyUser);
  });

  it('fires signup_from_gate when a net-new player is created from the gate', async () => {
    mockResolvePlayer.mockResolvedValue({
      player: { id: 9, email: 'gate@example.com' },
      created: true,
    });

    const response = await GET(request('?from_gate=1&guide_slug=berlin'), {
      params: { slug: 'berlin' },
    });

    expect(response.status).toBe(200);
    expect(mockTrackSignupFromGate).toHaveBeenCalledWith('gate@example.com', {
      guide_slug: 'berlin',
    });
  });

  it('does not fire signup_from_gate for existing players', async () => {
    const response = await GET(request('?from_gate=1&guide_slug=berlin'), {
      params: { slug: 'berlin' },
    });

    expect(response.status).toBe(200);
    expect(mockTrackSignupFromGate).not.toHaveBeenCalled();
  });

  it('does not fire signup_from_gate without gate attribution params', async () => {
    mockResolvePlayer.mockResolvedValue({
      player: { id: 9, email: 'gate@example.com' },
      created: true,
    });

    const response = await GET(request(), { params: { slug: 'berlin' } });

    expect(response.status).toBe(200);
    expect(mockTrackSignupFromGate).not.toHaveBeenCalled();
  });

  it('still returns locations when player ensure fails', async () => {
    mockResolvePlayer.mockRejectedValue(new Error('db down'));

    const response = await GET(request(), { params: { slug: 'berlin' } });

    expect(response.status).toBe(200);
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
