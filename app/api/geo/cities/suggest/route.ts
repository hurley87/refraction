import { NextRequest } from 'next/server';
import { getCountryByIso2 } from '@/lib/db/countries';
import { geoCitySuggestQuerySchema } from '@/lib/schemas/player';
import { apiSuccess, apiError, apiValidationError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

type MapboxSuggestion = {
  mapbox_id?: string;
  name?: string;
  place_formatted?: string;
  feature_type?: string;
  context?: {
    country?: { country_code?: string; name?: string };
    region?: { name?: string };
  };
};

export type GeoCitySuggestion = {
  mapboxId: string;
  name: string;
  region: string | null;
  placeFormatted: string | null;
};

/**
 * GET /api/geo/cities/suggest?countryIso2=&q=
 * Proxies Mapbox Search Box suggest, scoped to place/locality in one country.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = geoCitySuggestQuerySchema.safeParse({
      countryIso2: searchParams.get('countryIso2'),
      q: searchParams.get('q'),
    });

    if (!parsed.success) {
      return apiValidationError(parsed.error);
    }

    const { countryIso2, q } = parsed.data;
    const iso2 = countryIso2.toUpperCase();

    const country = await getCountryByIso2(iso2);
    if (!country) {
      return apiError('Unknown country', 404);
    }

    const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!accessToken) {
      return apiError('Mapbox is not configured', 500);
    }

    const sessionToken = crypto.randomUUID();
    const url = new URL('https://api.mapbox.com/search/searchbox/v1/suggest');
    url.searchParams.set('q', q);
    url.searchParams.set('access_token', accessToken);
    url.searchParams.set('session_token', sessionToken);
    url.searchParams.set('limit', '8');
    url.searchParams.set('types', 'place,locality');
    url.searchParams.set('country', iso2.toLowerCase());

    const res = await fetch(url.toString());
    if (!res.ok) {
      console.error('Mapbox city suggest failed', res.status);
      return apiError('City search failed', 503);
    }

    const json = (await res.json()) as { suggestions?: MapboxSuggestion[] };
    const suggestions: GeoCitySuggestion[] = (json.suggestions ?? [])
      .filter((s) => {
        const type = s.feature_type;
        return type === 'place' || type === 'locality';
      })
      .filter((s) => Boolean(s.mapbox_id && s.name))
      .map((s) => ({
        mapboxId: s.mapbox_id as string,
        name: s.name as string,
        region: s.context?.region?.name ?? null,
        placeFormatted: s.place_formatted ?? null,
      }));

    return apiSuccess({ suggestions });
  } catch (error) {
    console.error('Error suggesting cities:', error);
    return apiError('Failed to suggest cities', 500);
  }
}
