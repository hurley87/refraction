import { describe, expect, it } from 'vitest';
import { buildPublicListShareUrl } from '@/lib/player-lists/public-list-share-url';

describe('buildPublicListShareUrl', () => {
  it('builds canonical irl.energy map list URLs', () => {
    expect(
      buildPublicListShareUrl({
        username: 'alice',
        listSlug: 'best-bars',
      })
    ).toBe('https://www.irl.energy/map/alice/best-bars');
  });

  it('normalizes username and slug casing', () => {
    expect(
      buildPublicListShareUrl({
        username: 'Alice',
        listSlug: 'Best-Bars',
      })
    ).toBe('https://www.irl.energy/map/alice/best-bars');
  });
});
