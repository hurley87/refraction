export type GuideKindDb = 'city_guide' | 'editorial';

/** Public path for a guide or editorial article (safe for client components). */
export function guideReadHref(slug: string, kind: GuideKindDb): string {
  return kind === 'editorial'
    ? `/city-guides/editorial/${slug}`
    : `/city-guides/${slug}`;
}
