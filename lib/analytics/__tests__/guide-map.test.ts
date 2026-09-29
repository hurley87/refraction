import { describe, expect, it } from 'vitest';
import {
  GUIDE_MAP_IMAGE_PLACEMENT,
  guideMapClickedProperties,
  guideSlugFromCityGuideReturnPath,
  mapListViewedProperties,
} from '@/lib/analytics/guide-map';

describe('guideSlugFromCityGuideReturnPath', () => {
  it('reads the slug from a city-guide return path', () => {
    expect(
      guideSlugFromCityGuideReturnPath('/city-guides/berlin-michail-stangl')
    ).toBe('berlin-michail-stangl');
  });

  it('reads an editorial return path', () => {
    expect(
      guideSlugFromCityGuideReturnPath(
        '/city-guides/editorial/montreal-dispatch'
      )
    ).toBe('montreal-dispatch');
  });

  it('ignores other return paths', () => {
    expect(guideSlugFromCityGuideReturnPath('/interactive-map')).toBeNull();
    expect(guideSlugFromCityGuideReturnPath('/city-guides')).toBeNull();
    expect(guideSlugFromCityGuideReturnPath(null)).toBeNull();
  });
});

describe('guide map event properties', () => {
  it('marks the map image click so later placements stay separate', () => {
    expect(
      guideMapClickedProperties({
        guideSlug: 'berlin',
        city: 'Berlin',
        mapListSlug: 'michail-stangl-berlin',
      })
    ).toEqual({
      guide_slug: 'berlin',
      city: 'Berlin',
      map_list_slug: 'michail-stangl-berlin',
      placement: GUIDE_MAP_IMAGE_PLACEMENT,
    });
  });

  it('attaches the guide slug only when returnTo is a guide', () => {
    expect(
      mapListViewedProperties({
        mapListSlug: 'michail-stangl-berlin',
        returnTo: '/city-guides/berlin',
      })
    ).toEqual({
      map_list_slug: 'michail-stangl-berlin',
      guide_slug: 'berlin',
    });
    expect(
      mapListViewedProperties({
        mapListSlug: 'michail-stangl-berlin',
        returnTo: '/dashboard',
      })
    ).toEqual({ map_list_slug: 'michail-stangl-berlin' });
  });
});
