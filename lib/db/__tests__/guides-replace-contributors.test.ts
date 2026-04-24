import { describe, it, expect, vi, beforeEach } from 'vitest';
import { replaceGuideContributors } from '@/lib/db/guides';

const previousSnapshot = [
  {
    guide_id: 'g1',
    position: 0,
    name: 'Alice',
    bio: null,
    photo_url: null,
    photo_alt: null,
    instagram_href: null,
  },
];

let insertCall = 0;

vi.mock('@/lib/db/client', () => ({
  supabase: {
    from: (table: string) => {
      if (table !== 'guide_contributors') {
        return {};
      }
      return {
        select: () => ({
          eq: () =>
            Promise.resolve({
              data: previousSnapshot,
              error: null,
            }),
        }),
        delete: () => ({
          eq: () => Promise.resolve({ error: null }),
        }),
        insert: () => {
          insertCall += 1;
          if (insertCall === 1) {
            return Promise.resolve({
              error: { message: 'constraint violation' },
            });
          }
          return Promise.resolve({ error: null });
        },
      };
    },
  },
}));

describe('replaceGuideContributors', () => {
  beforeEach(() => {
    insertCall = 0;
  });

  it('restores previous rows when insert fails after delete', async () => {
    await expect(
      replaceGuideContributors('g1', [
        {
          position: 0,
          name: 'Bob',
          bio: null,
          photo_url: null,
          photo_alt: null,
          instagram_href: null,
        },
      ])
    ).rejects.toEqual(
      expect.objectContaining({ message: 'constraint violation' })
    );
    expect(insertCall).toBe(2);
  });
});
