import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockAdminGetGuide = vi.fn();
const mockEnsureUniqueGuideSlug = vi.fn();
const mockReplaceGuideContributors = vi.fn();
const mockUpdateGuide = vi.fn();
const mockGetAuthenticatedAdminEmail = vi.fn();

vi.mock('@/lib/db/guides', () => ({
  adminGetGuide: (...args: unknown[]) => mockAdminGetGuide(...args),
  deleteGuide: vi.fn(),
  ensureUniqueGuideSlug: (...args: unknown[]) =>
    mockEnsureUniqueGuideSlug(...args),
  replaceGuideContributors: (...args: unknown[]) =>
    mockReplaceGuideContributors(...args),
  updateGuide: (...args: unknown[]) => mockUpdateGuide(...args),
}));

vi.mock('@/lib/auth', () => ({
  getAuthenticatedAdminEmail: (...args: unknown[]) =>
    mockGetAuthenticatedAdminEmail(...args),
}));

import { PATCH } from '../route';

function patchRequest(body: unknown) {
  return new NextRequest('http://localhost/api/admin/guides/guide-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/admin/guides/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthenticatedAdminEmail.mockResolvedValue('admin@example.com');
    mockUpdateGuide.mockResolvedValue({ id: 'guide-1' });
    mockAdminGetGuide.mockResolvedValue({
      guide: { id: 'guide-1' },
      contributors: [],
    });
  });

  it('persists linked and manual contributors together', async () => {
    const response = await PATCH(
      patchRequest({
        contributors: [
          {
            position: 0,
            player_id: 42,
            name: 'Linked fallback',
            bio: null,
          },
          {
            position: 1,
            name: 'Manual author',
            instagram_href: '@manual',
          },
        ],
      }),
      { params: { id: 'guide-1' } }
    );

    expect(response.status).toBe(200);
    expect(mockReplaceGuideContributors).toHaveBeenCalledWith('guide-1', [
      {
        position: 0,
        player_id: 42,
        name: 'Linked fallback',
        bio: null,
        photo_url: null,
        photo_alt: null,
        instagram_href: null,
        location_list_id: null,
      },
      {
        position: 1,
        player_id: null,
        name: 'Manual author',
        bio: null,
        photo_url: null,
        photo_alt: null,
        instagram_href: '@manual',
        location_list_id: null,
      },
    ]);
  });

  it('rejects invalid linked player ids', async () => {
    const response = await PATCH(
      patchRequest({
        contributors: [
          {
            position: 0,
            player_id: 0,
            name: 'Invalid',
          },
        ],
      }),
      { params: { id: 'guide-1' } }
    );

    expect(response.status).toBe(400);
    expect(mockUpdateGuide).not.toHaveBeenCalled();
    expect(mockReplaceGuideContributors).not.toHaveBeenCalled();
  });
});
