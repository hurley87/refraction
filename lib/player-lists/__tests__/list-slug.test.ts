import { describe, expect, it } from 'vitest';
import { slugifyListTitle } from '@/lib/player-lists/list-slug';

describe('slugifyListTitle', () => {
  it('slugifies a list title', () => {
    expect(slugifyListTitle('Best Bars in Berlin')).toBe('best-bars-in-berlin');
  });

  it('falls back to list when title slugs empty', () => {
    expect(slugifyListTitle('!!!')).toBe('list');
  });
});
