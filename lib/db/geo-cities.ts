import { supabase } from './client';

export type GeoCity = {
  id: string;
  countryId: string;
  mapboxId: string;
  name: string;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
};

type GeoCityRow = {
  id: string;
  country_id: string;
  mapbox_id: string;
  name: string;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type UpsertGeoCityInput = {
  countryId: string;
  mapboxId: string;
  name: string;
  region?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

const COLUMNS = 'id, country_id, mapbox_id, name, region, latitude, longitude';

function toGeoCity(row: GeoCityRow): GeoCity {
  return {
    id: row.id,
    countryId: row.country_id,
    mapboxId: row.mapbox_id,
    name: row.name,
    region: row.region,
    latitude: row.latitude,
    longitude: row.longitude,
  };
}

/**
 * Insert or update a Mapbox-backed city by mapbox_id.
 */
export async function upsertGeoCity(
  input: UpsertGeoCityInput
): Promise<GeoCity> {
  const payload = {
    country_id: input.countryId,
    mapbox_id: input.mapboxId,
    name: input.name.trim(),
    region: input.region?.trim() || null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('geo_cities')
    .upsert(payload, { onConflict: 'mapbox_id' })
    .select(COLUMNS)
    .single();

  if (error) throw error;
  return toGeoCity(data as GeoCityRow);
}

export async function getGeoCityById(id: string): Promise<GeoCity | null> {
  const { data, error } = await supabase
    .from('geo_cities')
    .select(COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data ? toGeoCity(data as GeoCityRow) : null;
}
