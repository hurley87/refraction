import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetAuthenticatedAdminEmail = vi.fn();
const mockCreateAdminPlayer = vi.fn();
const mockGetCountryById = vi.fn();
const mockUpsertGeoCity = vi.fn();

vi.mock('@/lib/auth', () => ({
  getAuthenticatedAdminEmail: (...args: unknown[]) =>
    mockGetAuthenticatedAdminEmail(...args),
}));

vi.mock('@/lib/db/countries', () => ({
  getCountryById: (...args: unknown[]) => mockGetCountryById(...args),
}));

vi.mock('@/lib/db/geo-cities', () => ({
  upsertGeoCity: (...args: unknown[]) => mockUpsertGeoCity(...args),
}));

vi.mock('@/lib/db/players', () => ({
  createAdminPlayer: (...args: unknown[]) => mockCreateAdminPlayer(...args),
  AdminPlayerConflictError: class AdminPlayerConflictError extends Error {
    field: string;
    constructor(field: string, message: string) {
      super(message);
      this.name = 'AdminPlayerConflictError';
      this.field = field;
    }
  },
}));

import { POST } from '../route';
import { AdminPlayerConflictError } from '@/lib/db/players';

function createRequest(body?: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/admin/users/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe('POST /api/admin/users/create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthenticatedAdminEmail.mockResolvedValue('admin@example.com');
  });

  it('returns 403 when the caller is not an admin', async () => {
    mockGetAuthenticatedAdminEmail.mockResolvedValueOnce(null);

    const response = await POST(
      createRequest({
        email: 'new@example.com',
        username: 'new_user',
      })
    );

    expect(response.status).toBe(403);
    expect(mockCreateAdminPlayer).not.toHaveBeenCalled();
  });

  it('returns 400 when required fields are missing', async () => {
    const response = await POST(createRequest({ email: 'not-an-email' }));
    expect(response.status).toBe(400);
    expect(mockCreateAdminPlayer).not.toHaveBeenCalled();
  });

  it('creates a user and returns 201', async () => {
    mockCreateAdminPlayer.mockResolvedValueOnce({
      id: 12,
      email: 'new@example.com',
      username: 'new_user',
      total_points: 25,
      wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
    });

    const response = await POST(
      createRequest({
        email: 'New@Example.com',
        username: 'New User',
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        totalPoints: 25,
      })
    );
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(mockCreateAdminPlayer).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'new@example.com',
        username: 'new_user',
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        totalPoints: 25,
      })
    );
    expect(json.data.player.username).toBe('new_user');
  });

  it('passes profile fields through with handles stripped of @', async () => {
    mockCreateAdminPlayer.mockResolvedValueOnce({ id: 13 });

    await POST(
      createRequest({
        email: 'new@example.com',
        username: 'new_user',
        name: '  Ada Lovelace  ',
        bio: ' Builder ',
        website: 'https://ada.dev',
        profilePictureUrl: 'https://cdn.example.com/ada.png',
        twitterHandle: '@ada',
        instagramHandle: 'ada_irl',
        telegramHandle: '',
      })
    );

    expect(mockCreateAdminPlayer).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Ada Lovelace',
        bio: 'Builder',
        website: 'https://ada.dev',
        profilePictureUrl: 'https://cdn.example.com/ada.png',
        twitterHandle: 'ada',
        instagramHandle: 'ada_irl',
        telegramHandle: undefined,
      })
    );
  });

  it('upserts the picked city and stores geo ids', async () => {
    mockGetCountryById.mockResolvedValueOnce({
      id: '11111111-1111-4111-8111-111111111111',
      iso2: 'US',
      name: 'United States',
    });
    mockUpsertGeoCity.mockResolvedValueOnce({
      id: '22222222-2222-4222-8222-222222222222',
      countryId: '11111111-1111-4111-8111-111111111111',
      name: 'New York',
    });
    mockCreateAdminPlayer.mockResolvedValueOnce({ id: 14 });

    const response = await POST(
      createRequest({
        email: 'new@example.com',
        username: 'new_user',
        location: {
          countryId: '11111111-1111-4111-8111-111111111111',
          mapboxId: 'dXJuOm1ieHBsYzpuebc',
          name: 'New York',
          region: 'New York',
        },
      })
    );

    expect(response.status).toBe(201);
    expect(mockCreateAdminPlayer).toHaveBeenCalledWith(
      expect.objectContaining({
        location: {
          countryId: '11111111-1111-4111-8111-111111111111',
          geoCityId: '22222222-2222-4222-8222-222222222222',
          cityName: 'New York',
          countryName: 'United States',
        },
      })
    );
  });

  it('returns 404 when the country is unknown', async () => {
    mockGetCountryById.mockResolvedValueOnce(null);

    const response = await POST(
      createRequest({
        email: 'new@example.com',
        username: 'new_user',
        location: {
          countryId: '11111111-1111-4111-8111-111111111111',
          mapboxId: 'abc',
          name: 'Nowhere',
        },
      })
    );

    expect(response.status).toBe(404);
    expect(mockCreateAdminPlayer).not.toHaveBeenCalled();
  });

  it('returns 409 when the email is already taken', async () => {
    mockCreateAdminPlayer.mockRejectedValueOnce(
      new AdminPlayerConflictError(
        'email',
        'A player with this email already exists'
      )
    );

    const response = await POST(
      createRequest({
        email: 'taken@example.com',
        username: 'taken_user',
      })
    );
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.error).toBe('A player with this email already exists');
  });
});
