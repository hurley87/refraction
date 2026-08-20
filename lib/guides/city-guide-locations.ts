import type { CityGuideLocationSection, GuideRow } from '@/lib/db/guides';

export type CityGuideLocationGateMeta = {
  hiddenCount: number;
  visibleCount: number;
  totalCount: number;
  teaserSummary: string | null;
  primaryContributorName: string | null;
};

export type SlicedCityGuideLocations = {
  sections: CityGuideLocationSection[];
  totalCount: number;
  visibleCount: number;
  hiddenCount: number;
};

/**
 * Take the first N locations in guide reading order while preserving sections.
 * A null count means the guide is not gated.
 */
export function sliceCityGuideLocationSections(
  sections: CityGuideLocationSection[],
  maxVisible: number | null | undefined
): SlicedCityGuideLocations {
  const totalCount = sections.reduce(
    (total, section) => total + section.locations.length,
    0
  );

  if (maxVisible === null || maxVisible === undefined) {
    return {
      sections,
      totalCount,
      visibleCount: totalCount,
      hiddenCount: 0,
    };
  }

  let remaining = Math.max(0, Math.floor(maxVisible));
  const visibleSections: CityGuideLocationSection[] = [];

  for (const section of sections) {
    if (remaining <= 0) break;
    const locations = section.locations.slice(0, remaining);
    if (locations.length > 0) {
      visibleSections.push({ ...section, locations });
      remaining -= locations.length;
    }
  }

  const visibleCount = visibleSections.reduce(
    (total, section) => total + section.locations.length,
    0
  );

  return {
    sections: visibleSections,
    totalCount,
    visibleCount,
    hiddenCount: Math.max(0, totalCount - visibleCount),
  };
}

export function filterLocationContributorOverrides(
  overrides: Map<string, string>,
  sections: CityGuideLocationSection[]
): Map<string, string> {
  const visiblePlaceIds = new Set(
    sections.flatMap((section) =>
      section.locations.map((entry) => entry.location.place_id)
    )
  );

  return new Map(
    [...overrides].filter(([placeId]) => visiblePlaceIds.has(placeId))
  );
}

export function buildCityGuideLocationGateMeta(
  row: GuideRow,
  primaryContributorName: string | null,
  counts: Pick<
    SlicedCityGuideLocations,
    'hiddenCount' | 'visibleCount' | 'totalCount'
  >
): CityGuideLocationGateMeta | null {
  if (counts.hiddenCount <= 0) return null;

  return {
    ...counts,
    teaserSummary: row.gated_location_teaser_summary?.trim() || null,
    primaryContributorName: primaryContributorName?.trim() || null,
  };
}
