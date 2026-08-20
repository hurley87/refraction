import { describe, expect, it } from 'vitest';
import {
  buildCityGuideLocationGateMeta,
  filterLocationContributorOverrides,
  sliceCityGuideLocationSections,
} from '@/lib/guides/city-guide-locations';
import type { CityGuideLocationSection, GuideRow } from '@/lib/db/guides';
import type { LocationListLocation } from '@/lib/types';

function entry(id: number, placeId: string): LocationListLocation {
  return {
    membership_id: id,
    list_id: 'list',
    location_id: id,
    created_at: '2026-01-01T00:00:00.000Z',
    location: { id, place_id: placeId, name: placeId },
  } as LocationListLocation;
}

const sections: CityGuideLocationSection[] = [
  {
    heading: 'A',
    defaultContributorName: 'Alice',
    locations: [entry(1, 'a'), entry(2, 'b')],
  },
  {
    heading: 'B',
    defaultContributorName: 'Bob',
    locations: [entry(3, 'c'), entry(4, 'd')],
  },
];

describe('city guide location gating', () => {
  it('slices across contributor sections in reading order', () => {
    const result = sliceCityGuideLocationSections(sections, 3);

    expect(result.sections.map((section) => section.locations.length)).toEqual([
      2, 1,
    ]);
    expect(result.visibleCount).toBe(3);
    expect(result.hiddenCount).toBe(1);
    expect(result.totalCount).toBe(4);
  });

  it('supports gating every location', () => {
    const result = sliceCityGuideLocationSections(sections, 0);

    expect(result.sections).toEqual([]);
    expect(result.visibleCount).toBe(0);
    expect(result.hiddenCount).toBe(4);
  });

  it('does not gate null or over-limit counts', () => {
    expect(sliceCityGuideLocationSections(sections, null).hiddenCount).toBe(0);
    expect(sliceCityGuideLocationSections(sections, 10).hiddenCount).toBe(0);
  });

  it('removes contributor overrides for hidden locations', () => {
    const visible = sliceCityGuideLocationSections(sections, 2).sections;
    const filtered = filterLocationContributorOverrides(
      new Map([
        ['a', 'Alice'],
        ['c', 'Bob'],
      ]),
      visible
    );

    expect(Object.fromEntries(filtered)).toEqual({ a: 'Alice' });
  });

  it('builds metadata with the primary contributor and CMS teaser', () => {
    const row = {
      gated_location_teaser_summary: 'a listening bar and two galleries',
    } as GuideRow;
    const meta = buildCityGuideLocationGateMeta(row, 'Alice', {
      totalCount: 4,
      visibleCount: 1,
      hiddenCount: 3,
    });

    expect(meta).toEqual({
      totalCount: 4,
      visibleCount: 1,
      hiddenCount: 3,
      teaserSummary: 'a listening bar and two galleries',
      primaryContributorName: 'Alice',
    });
  });
});
