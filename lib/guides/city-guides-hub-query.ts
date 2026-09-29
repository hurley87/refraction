import type { CityGuidesContentFilter } from '@/components/city-guides/city-guides-content-filter-row';

/** Public query key. `editorial` selects the Editorial toggle; anything else is City Guides. */
export const CITY_GUIDES_TYPE_PARAM = 'type';
export const CITY_GUIDES_CITY_PARAM = 'city';

export type CityGuidesHubQuery = {
  type: CityGuidesContentFilter;
  /** `'all'` or a city tag that exists in the feed, including `Global`. */
  city: string;
};

export function parseCityGuidesHubQuery(
  input: { type?: string | null; city?: string | null },
  knownCities: readonly string[]
): CityGuidesHubQuery {
  const type: CityGuidesContentFilter =
    input.type?.trim() === 'editorial' ? 'editorials' : 'guides';
  const city = input.city?.trim() ?? '';
  return {
    type,
    city: city && knownCities.includes(city) ? city : 'all',
  };
}

/** Query string including `?`, or `''` when both filters are at their defaults. */
export function cityGuidesHubSearch(query: CityGuidesHubQuery): string {
  const params = new URLSearchParams();
  if (query.type === 'editorials') {
    params.set(CITY_GUIDES_TYPE_PARAM, 'editorial');
  }
  if (query.city !== 'all') {
    params.set(CITY_GUIDES_CITY_PARAM, query.city);
  }
  const search = params.toString();
  return search ? `?${search}` : '';
}
