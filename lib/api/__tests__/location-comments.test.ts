import { describe, expect, it } from 'vitest';
import {
  groupCheckinsByPlaceId,
  isTransientCheckinsError,
  parsePlaceIds,
  parsePurpose,
  shapeCheckinEntry,
  type RawCheckinRow,
} from '@/lib/api/location-comments';

describe('location-comments helpers', () => {
  it('parsePurpose defaults to full', () => {
    expect(parsePurpose(null)).toBe('full');
    expect(parsePurpose('full')).toBe('full');
    expect(parsePurpose('avatars')).toBe('avatars');
  });

  it('parsePlaceIds prefers batch param and dedupes', () => {
    expect(parsePlaceIds('a,b,a', null)).toEqual(['a', 'b']);
    expect(parsePlaceIds(null, 'single')).toEqual(['single']);
    expect(parsePlaceIds(null, null)).toEqual([]);
  });

  it('shapeCheckinEntry includes comments only for full purpose', () => {
    const row: RawCheckinRow = {
      id: 1,
      comment: 'hello',
      image_url: 'https://example.com/a.jpg',
      points_earned: 10,
      created_at: '2024-01-01T00:00:00.000Z',
      players: {
        username: 'alice',
        wallet_address: '0xabc',
        profile_picture_url: 'https://example.com/p.jpg',
      },
    };

    expect(shapeCheckinEntry(row, 'full')).toMatchObject({
      id: 1,
      comment: 'hello',
      imageUrl: 'https://example.com/a.jpg',
      pointsEarned: 10,
      username: 'alice',
    });

    expect(shapeCheckinEntry(row, 'avatars')).toEqual({
      id: 1,
      username: 'alice',
      walletAddress: '0xabc',
      profilePictureUrl: 'https://example.com/p.jpg',
    });
  });

  it('groupCheckinsByPlaceId keeps top N per place and includes commentless rows for avatars', () => {
    const locationIdToPlaceId = new Map<number, string>([
      [10, 'place-a'],
      [20, 'place-b'],
    ]);

    const rows: RawCheckinRow[] = [
      {
        id: 1,
        location_id: 10,
        created_at: '2024-01-03T00:00:00.000Z',
        players: { username: 'a1' },
      },
      {
        id: 2,
        location_id: 20,
        created_at: '2024-01-02T00:00:00.000Z',
        players: { username: 'b1' },
      },
      {
        id: 3,
        location_id: 10,
        created_at: '2024-01-01T00:00:00.000Z',
        comment: null,
        players: { username: 'a2' },
      },
      {
        id: 4,
        location_id: 10,
        created_at: '2023-12-31T00:00:00.000Z',
        players: { username: 'a3' },
      },
      {
        id: 5,
        location_id: 10,
        created_at: '2023-12-30T00:00:00.000Z',
        players: { username: 'a4' },
      },
    ];

    const grouped = groupCheckinsByPlaceId(
      rows,
      locationIdToPlaceId,
      3,
      'avatars'
    );

    expect(grouped['place-a']).toHaveLength(3);
    expect(grouped['place-a']?.map((entry) => entry.id)).toEqual([1, 3, 4]);
    expect(grouped['place-b']).toHaveLength(1);
    expect(grouped['place-b']?.[0]?.username).toBe('b1');
  });

  it('isTransientCheckinsError detects 503-style failures', () => {
    expect(isTransientCheckinsError({ status: 503 })).toBe(true);
    expect(isTransientCheckinsError({ message: 'upstream 503 error' })).toBe(
      true
    );
    expect(isTransientCheckinsError({ code: '23505' })).toBe(false);
  });
});
