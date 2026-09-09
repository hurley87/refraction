import { describe, expect, it } from 'vitest';
import {
  buildCuratedListMapHref,
  buildCuratedListMapUrl,
  canSyncCuratedListUrl,
  curatedListSlugFromPathname,
  curatedListUrlSyncTarget,
  hrefWithReturnTo,
  isInteractiveMapPath,
  normalizeCuratedListSlug,
  parseCuratedListSlugInput,
} from '../curated-list-url';

describe('curated list URLs', () => {
  describe('normalizeCuratedListSlug', () => {
    it('trims and lowercases', () => {
      expect(normalizeCuratedListSlug('  Michail-Stangl-Berlin  ')).toBe(
        'michail-stangl-berlin'
      );
    });
  });

  describe('buildCuratedListMapHref', () => {
    it('builds a slug path under /map/lists', () => {
      expect(buildCuratedListMapHref('Michail-Stangl-Berlin')).toBe(
        '/map/lists/michail-stangl-berlin'
      );
    });
  });

  describe('buildCuratedListMapUrl', () => {
    it('builds an absolute slug URL', () => {
      expect(
        buildCuratedListMapUrl({
          slug: 'Michail-Stangl-Berlin',
          origin: 'https://www.irl.energy',
        })
      ).toBe('https://www.irl.energy/map/lists/michail-stangl-berlin');
    });
  });

  describe('parseCuratedListSlugInput', () => {
    it('accepts a bare slug, path, or full URL', () => {
      expect(parseCuratedListSlugInput('Michail-Stangl-Berlin')).toBe(
        'michail-stangl-berlin'
      );
      expect(
        parseCuratedListSlugInput('/map/lists/michail-stangl-berlin')
      ).toBe('michail-stangl-berlin');
      expect(
        parseCuratedListSlugInput(
          'https://www.irl.energy/map/lists/michail-stangl-berlin?returnTo=/city-guides/berlin'
        )
      ).toBe('michail-stangl-berlin');
    });

    it('returns null for empty or unrelated values', () => {
      expect(parseCuratedListSlugInput('')).toBeNull();
      expect(parseCuratedListSlugInput('not a slug')).toBeNull();
      expect(parseCuratedListSlugInput('/map/alice/weekend')).toBeNull();
    });
  });

  describe('curatedListSlugFromPathname', () => {
    it('reads the slug from a curated list path', () => {
      expect(
        curatedListSlugFromPathname('/map/lists/michail-stangl-berlin')
      ).toBe('michail-stangl-berlin');
    });

    it('returns null for other map paths', () => {
      expect(curatedListSlugFromPathname('/map/alice/weekend')).toBeNull();
      expect(curatedListSlugFromPathname('/interactive-map')).toBeNull();
      expect(curatedListSlugFromPathname('/map/lists')).toBeNull();
    });
  });

  describe('isInteractiveMapPath', () => {
    it('matches the map page with or without a trailing slash', () => {
      expect(isInteractiveMapPath('/interactive-map')).toBe(true);
      expect(isInteractiveMapPath('/interactive-map/')).toBe(true);
      expect(isInteractiveMapPath('/map/lists/foo')).toBe(false);
    });
  });

  describe('canSyncCuratedListUrl', () => {
    it('allows a bare map URL or returnTo-only query', () => {
      expect(canSyncCuratedListUrl(new URLSearchParams())).toBe(true);
      expect(
        canSyncCuratedListUrl(
          new URLSearchParams({ returnTo: '/city-guides/berlin' })
        )
      ).toBe(true);
    });

    it('skips when another map deep link owns the query', () => {
      expect(
        canSyncCuratedListUrl(new URLSearchParams({ placeId: 'abc' }))
      ).toBe(false);
      expect(
        canSyncCuratedListUrl(new URLSearchParams({ listId: 'uuid' }))
      ).toBe(false);
    });
  });

  describe('hrefWithReturnTo', () => {
    it('appends returnTo when present', () => {
      expect(
        hrefWithReturnTo('/map/lists/foo', '/city-guides/berlin-michail-stangl')
      ).toBe('/map/lists/foo?returnTo=%2Fcity-guides%2Fberlin-michail-stangl');
    });

    it('leaves the href unchanged without returnTo', () => {
      expect(hrefWithReturnTo('/interactive-map', null)).toBe(
        '/interactive-map'
      );
    });
  });

  describe('curatedListUrlSyncTarget', () => {
    it('replaces interactive-map with the curated list path', () => {
      expect(
        curatedListUrlSyncTarget({
          pathname: '/interactive-map',
          searchParams: new URLSearchParams(),
          curatedSlug: 'michail-stangl-berlin',
        })
      ).toBe('/map/lists/michail-stangl-berlin');
    });

    it('does not replace when already on that list', () => {
      expect(
        curatedListUrlSyncTarget({
          pathname: '/map/lists/michail-stangl-berlin',
          searchParams: new URLSearchParams(),
          curatedSlug: 'michail-stangl-berlin',
        })
      ).toBeNull();
    });

    it('switches to a different curated list slug', () => {
      expect(
        curatedListUrlSyncTarget({
          pathname: '/map/lists/michail-stangl-berlin',
          searchParams: new URLSearchParams(),
          curatedSlug: 'irl-guide-to-miami',
        })
      ).toBe('/map/lists/irl-guide-to-miami');
    });

    it('returns to interactive-map when leaving a curated list', () => {
      expect(
        curatedListUrlSyncTarget({
          pathname: '/map/lists/michail-stangl-berlin',
          searchParams: new URLSearchParams({
            returnTo: '/city-guides/berlin-michail-stangl',
          }),
          curatedSlug: null,
        })
      ).toBe(
        '/interactive-map?returnTo=%2Fcity-guides%2Fberlin-michail-stangl'
      );
    });

    it('skips when a place deep link owns the query', () => {
      expect(
        curatedListUrlSyncTarget({
          pathname: '/interactive-map',
          searchParams: new URLSearchParams({ placeId: 'abc' }),
          curatedSlug: 'michail-stangl-berlin',
        })
      ).toBeNull();
    });
  });
});
