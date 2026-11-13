type MapboxRetrieveFeature = {
  properties?: {
    mapbox_id?: string;
    name?: string;
    name_preferred?: string;
    feature_type?: string;
    coordinates?: { latitude?: number; longitude?: number };
    context?: {
      country?: { country_code?: string; name?: string };
      region?: { name?: string };
    };
  };
  geometry?: { coordinates?: [number, number] };
};

export type VerifyMapboxCityInput = {
  mapboxId: string;
  countryIso2: string;
  name: string;
  region?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type VerifiedMapboxCity = {
  mapboxId: string;
  name: string;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type VerifyMapboxCityResult =
  | { ok: true; city: VerifiedMapboxCity }
  | { ok: false; status: 400 | 500; error: string };

/**
 * Confirms a Mapbox Search Box selection is a city or locality in the given
 * country, and returns its canonical name, region and coordinates.
 */
export async function verifyMapboxCity(
  input: VerifyMapboxCityInput
): Promise<VerifyMapboxCityResult> {
  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!accessToken) {
    return { ok: false, status: 500, error: 'Mapbox is not configured' };
  }

  const sessionToken = crypto.randomUUID();
  const retrieveUrl = `https://api.mapbox.com/search/searchbox/v1/retrieve/${encodeURIComponent(
    input.mapboxId
  )}?session_token=${sessionToken}&access_token=${accessToken}`;
  const retrieveRes = await fetch(retrieveUrl);
  if (!retrieveRes.ok) {
    return { ok: false, status: 400, error: 'Could not verify city selection' };
  }

  const retrieveJson = (await retrieveRes.json()) as {
    features?: MapboxRetrieveFeature[];
  };
  const feature = retrieveJson.features?.[0];
  const props = feature?.properties;
  if (!props?.mapbox_id) {
    return { ok: false, status: 400, error: 'Invalid city selection' };
  }

  const featureType = props.feature_type;
  if (featureType && featureType !== 'place' && featureType !== 'locality') {
    return {
      ok: false,
      status: 400,
      error: 'Selection must be a city or locality',
    };
  }

  const featureCountryCode = props.context?.country?.country_code
    ?.trim()
    .toUpperCase();
  if (
    featureCountryCode &&
    featureCountryCode !== input.countryIso2.trim().toUpperCase()
  ) {
    return {
      ok: false,
      status: 400,
      error: 'City does not match selected country',
    };
  }

  const coords = feature?.geometry?.coordinates;
  const longitude =
    input.longitude ??
    props.coordinates?.longitude ??
    (Array.isArray(coords) ? coords[0] : null);
  const latitude =
    input.latitude ??
    props.coordinates?.latitude ??
    (Array.isArray(coords) ? coords[1] : null);

  return {
    ok: true,
    city: {
      mapboxId: props.mapbox_id,
      name:
        props.name_preferred?.trim() || props.name?.trim() || input.name.trim(),
      region:
        props.context?.region?.name?.trim() || input.region?.trim() || null,
      latitude: typeof latitude === 'number' ? latitude : null,
      longitude: typeof longitude === 'number' ? longitude : null,
    },
  };
}
