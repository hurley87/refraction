import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type { IrlCardWaitlistSignup } from '@/lib/db/irl-card-waitlist';

const mocks = vi.hoisted(() => ({
  getPrivyUserFromRequest: vi.fn(),
  getCountryById: vi.fn(),
  upsertGeoCity: vi.fn(),
  verifyMapboxCity: vi.fn(),
  upsertWaitlistSignup: vi.fn(),
  getWaitlistSignupByEmail: vi.fn(),
  getWaitlistMemberPrefill: vi.fn(),
  linkWaitlistSignupToPlayer: vi.fn(),
  deliverWaitlistFollowUps: vi.fn(),
  findExistingPlayerForPrivyUser: vi.fn(),
  resolvePlayerForPrivyUser: vi.fn(),
  createPlayer: vi.fn(),
}));

vi.mock('@/lib/api/privy', () => ({
  getPrivyUserFromRequest: mocks.getPrivyUserFromRequest,
}));
vi.mock('@/lib/db/countries', () => ({
  getCountryById: mocks.getCountryById,
}));
vi.mock('@/lib/db/geo-cities', () => ({
  upsertGeoCity: mocks.upsertGeoCity,
}));
vi.mock('@/lib/geo/verify-mapbox-city', () => ({
  verifyMapboxCity: mocks.verifyMapboxCity,
}));
vi.mock('@/lib/db/irl-card-waitlist', () => ({
  upsertWaitlistSignup: mocks.upsertWaitlistSignup,
  getWaitlistSignupByEmail: mocks.getWaitlistSignupByEmail,
  getWaitlistMemberPrefill: mocks.getWaitlistMemberPrefill,
  linkWaitlistSignupToPlayer: mocks.linkWaitlistSignupToPlayer,
}));
vi.mock('@/lib/irl-card/waitlist-delivery', () => ({
  deliverWaitlistFollowUps: mocks.deliverWaitlistFollowUps,
}));
vi.mock('@/lib/privy/resolve-evm-wallet-address', () => ({
  resolvePrivyEvmWalletAddress: () => null,
}));
vi.mock('@/lib/privy/resolve-player-for-privy-user', () => ({
  findExistingPlayerForPrivyUser: mocks.findExistingPlayerForPrivyUser,
  resolvePlayerForPrivyUser: mocks.resolvePlayerForPrivyUser,
  privyLoginEmail: (user: { email?: { address?: string } }) =>
    user.email?.address ?? null,
}));
vi.mock('@/lib/db/players', () => ({
  createPlayer: mocks.createPlayer,
}));
vi.mock('@/lib/monitoring/capture-handled-exception', () => ({
  captureHandledException: vi.fn(),
}));

import { GET, POST } from '@/app/api/irl-card/waitlist/route';

const COUNTRY_ID = '11111111-1111-4111-8111-111111111111';

const validBody = {
  email: 'Fan@Example.com',
  countryId: COUNTRY_ID,
  city: { mapboxId: 'dXJuOm1ieHBsYzo', name: 'Toronto', region: 'Ontario' },
  alreadyUsesIrl: false,
  marketingConsent: true,
  attribution: {
    utm_source: 'venue-qr',
    utm_medium: 'qr',
    source: 'venue',
    source_ref: 'loc_123',
  },
};

function makeSignup(
  overrides: Partial<IrlCardWaitlistSignup> = {}
): IrlCardWaitlistSignup {
  return {
    id: 'signup-1',
    email: 'Fan@Example.com',
    emailNormalized: 'fan@example.com',
    countryId: COUNTRY_ID,
    geoCityId: 'geo-1',
    countryIso2: 'CA',
    cityName: 'Toronto',
    alreadyUsesIrl: false,
    playerId: null,
    privyUserId: null,
    marketingConsent: true,
    welcomeEmailStatus: 'pending',
    welcomeEmailAttempts: 0,
    listSyncStatus: 'pending',
    listSyncAttempts: 0,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function postRequest(body: unknown, token?: string) {
  return new NextRequest('http://localhost/api/irl-card/waitlist', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getPrivyUserFromRequest.mockResolvedValue(null);
  mocks.getCountryById.mockResolvedValue({
    id: COUNTRY_ID,
    iso2: 'CA',
    name: 'Canada',
  });
  mocks.verifyMapboxCity.mockResolvedValue({
    ok: true,
    city: { mapboxId: 'dXJuOm1ieHBsYzo', name: 'Toronto', region: 'Ontario' },
  });
  mocks.upsertGeoCity.mockResolvedValue({
    id: 'geo-1',
    countryId: COUNTRY_ID,
    name: 'Toronto',
  });
  mocks.upsertWaitlistSignup.mockResolvedValue({
    signup: makeSignup(),
    created: true,
  });
  mocks.deliverWaitlistFollowUps.mockResolvedValue({
    welcome: 'sent',
    list: 'synced',
  });
});

describe('POST /api/irl-card/waitlist', () => {
  it('stores a new signup with attribution and delivers follow-ups once', async () => {
    const res = await POST(postRequest(validBody));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual({
      joined: true,
      alreadyJoined: false,
      countryIso2: 'CA',
    });
    expect(mocks.upsertWaitlistSignup).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'Fan@Example.com',
        countryId: COUNTRY_ID,
        geoCityId: 'geo-1',
        countryIso2: 'CA',
        cityName: 'Toronto',
        alreadyUsesIrl: false,
        playerId: null,
        privyUserId: null,
        marketingConsent: true,
        attribution: expect.objectContaining({
          utmSource: 'venue-qr',
          utmMedium: 'qr',
          source: 'venue',
          sourceRef: 'loc_123',
        }),
      })
    );
    expect(mocks.deliverWaitlistFollowUps).toHaveBeenCalledTimes(1);
  });

  it('treats a repeat signup with different email case as already joined', async () => {
    mocks.upsertWaitlistSignup.mockResolvedValue({
      signup: makeSignup({
        createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        welcomeEmailStatus: 'sent',
      }),
      created: false,
    });

    const res = await POST(
      postRequest({ ...validBody, email: 'FAN@example.COM' })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.alreadyJoined).toBe(true);
    expect(mocks.upsertWaitlistSignup).toHaveBeenCalledTimes(1);
  });

  it('skips follow-up delivery on a rapid repeat submit', async () => {
    mocks.upsertWaitlistSignup.mockResolvedValue({
      signup: makeSignup({ createdAt: new Date().toISOString() }),
      created: false,
    });

    const res = await POST(postRequest(validBody));

    expect(res.status).toBe(200);
    expect(mocks.deliverWaitlistFollowUps).not.toHaveBeenCalled();
  });

  it('links a signed-in member to their existing player without creating one', async () => {
    mocks.getPrivyUserFromRequest.mockResolvedValue({
      id: 'did:privy:abc',
      email: { address: 'fan@example.com' },
    });
    mocks.findExistingPlayerForPrivyUser.mockResolvedValue({ id: 42 });

    const res = await POST(postRequest(validBody, 'token'));

    expect(res.status).toBe(200);
    expect(mocks.upsertWaitlistSignup).toHaveBeenCalledWith(
      expect.objectContaining({ playerId: 42, privyUserId: 'did:privy:abc' })
    );
    expect(mocks.resolvePlayerForPrivyUser).not.toHaveBeenCalled();
    expect(mocks.createPlayer).not.toHaveBeenCalled();
  });

  it('links an earlier anonymous signup when the member returns signed in', async () => {
    mocks.getPrivyUserFromRequest.mockResolvedValue({ id: 'did:privy:abc' });
    mocks.findExistingPlayerForPrivyUser.mockResolvedValue({ id: 42 });
    mocks.upsertWaitlistSignup.mockResolvedValue({
      signup: makeSignup({
        createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      }),
      created: false,
    });

    await POST(postRequest(validBody, 'token'));

    expect(mocks.linkWaitlistSignupToPlayer).toHaveBeenCalledWith(
      'signup-1',
      42,
      'did:privy:abc'
    );
  });

  it('stores the signup without a player when the signed-in user has no IRL account', async () => {
    mocks.getPrivyUserFromRequest.mockResolvedValue({ id: 'did:privy:new' });
    mocks.findExistingPlayerForPrivyUser.mockResolvedValue(null);

    const res = await POST(postRequest(validBody, 'token'));

    expect(res.status).toBe(200);
    expect(mocks.upsertWaitlistSignup).toHaveBeenCalledWith(
      expect.objectContaining({ playerId: null, privyUserId: 'did:privy:new' })
    );
    expect(mocks.createPlayer).not.toHaveBeenCalled();
  });

  it('still succeeds when email and list delivery fail', async () => {
    mocks.deliverWaitlistFollowUps.mockResolvedValue({
      welcome: 'failed',
      list: 'failed',
    });

    const res = await POST(postRequest(validBody));

    expect(res.status).toBe(200);
    expect((await res.json()).data.joined).toBe(true);
  });

  it('returns 400 for invalid input without storing anything', async () => {
    const res = await POST(
      postRequest({ ...validBody, email: 'not-an-email', alreadyUsesIrl: 'x' })
    );

    expect(res.status).toBe(400);
    expect(mocks.upsertWaitlistSignup).not.toHaveBeenCalled();
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await POST(postRequest('{not json'));
    expect(res.status).toBe(400);
  });

  it('returns 400 for an unknown country', async () => {
    mocks.getCountryById.mockResolvedValue(null);
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(400);
    expect(mocks.upsertWaitlistSignup).not.toHaveBeenCalled();
  });

  it('rejects a city that Mapbox does not place in the selected country', async () => {
    mocks.verifyMapboxCity.mockResolvedValue({
      ok: false,
      status: 400,
      error: 'City does not match selected country',
    });
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(400);
    expect(mocks.upsertWaitlistSignup).not.toHaveBeenCalled();
  });

  it('returns 500 and does not report success when storage fails', async () => {
    mocks.upsertWaitlistSignup.mockRejectedValue(new Error('db down'));
    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(500);
    expect(mocks.deliverWaitlistFollowUps).not.toHaveBeenCalled();
  });
});

describe('GET /api/irl-card/waitlist', () => {
  function getRequest(token?: string) {
    return new NextRequest('http://localhost/api/irl-card/waitlist', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }

  it('requires a signed-in user', async () => {
    const res = await GET(getRequest());
    expect(res.status).toBe(401);
  });

  it('returns member prefill and existing-signup state', async () => {
    mocks.getPrivyUserFromRequest.mockResolvedValue({ id: 'did:privy:abc' });
    mocks.findExistingPlayerForPrivyUser.mockResolvedValue({ id: 42 });
    mocks.getWaitlistMemberPrefill.mockResolvedValue({
      email: 'fan@example.com',
      countryId: COUNTRY_ID,
      city: { mapboxId: 'm1', name: 'Toronto', region: 'Ontario' },
    });
    mocks.getWaitlistSignupByEmail.mockResolvedValue(makeSignup());

    const res = await GET(getRequest('token'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual({
      isMember: true,
      email: 'fan@example.com',
      countryId: COUNTRY_ID,
      city: { mapboxId: 'm1', name: 'Toronto', region: 'Ontario' },
      alreadyJoined: true,
    });
  });

  it('falls back to the Privy login email for non-members', async () => {
    mocks.getPrivyUserFromRequest.mockResolvedValue({
      id: 'did:privy:new',
      email: { address: 'new@example.com' },
    });
    mocks.findExistingPlayerForPrivyUser.mockResolvedValue(null);
    mocks.getWaitlistSignupByEmail.mockResolvedValue(null);

    const res = await GET(getRequest('token'));
    const json = await res.json();

    expect(json.data).toMatchObject({
      isMember: false,
      email: 'new@example.com',
      alreadyJoined: false,
    });
    expect(mocks.getWaitlistMemberPrefill).not.toHaveBeenCalled();
  });
});
