/** Max length for the admin user search `q` param. */
export const ADMIN_USER_SEARCH_MAX_LENGTH = 80;

type EmbeddedName = { name: string } | { name: string }[] | null;

export type AdminUserSearchRow = {
  id: number;
  wallet_address: string | null;
  email: string | null;
  username: string | null;
  name: string | null;
  bio: string | null;
  profile_picture_url: string | null;
  instagram_handle: string | null;
  total_points: number | null;
  created_at: string;
  country_id: string | null;
  geo_city_id: string | null;
  countries: EmbeddedName;
  geo_cities: EmbeddedName;
};

function embeddedName(value: EmbeddedName): string {
  if (!value) return '';
  if (Array.isArray(value)) return value[0]?.name?.trim() || '';
  return value.name?.trim() || '';
}

export function formatAdminUserSearchRow(row: AdminUserSearchRow) {
  return {
    id: row.id,
    wallet_address: row.wallet_address,
    email: row.email || '',
    username: row.username || '',
    name: row.name || '',
    bio: row.bio || '',
    profile_picture_url: row.profile_picture_url || '',
    instagram_handle: row.instagram_handle || '',
    total_points: row.total_points || 0,
    created_at: row.created_at,
    country_id: row.country_id,
    geo_city_id: row.geo_city_id,
    country: embeddedName(row.countries),
    city: embeddedName(row.geo_cities),
  };
}

/**
 * Builds a PostgREST `or()` filter that matches the admin users search
 * across identity and location columns on `players`.
 */
export function buildAdminUserSearchOr(raw: string): string | null {
  const trimmed = raw.trim().slice(0, ADMIN_USER_SEARCH_MAX_LENGTH);
  if (!trimmed) return null;

  const escaped = trimmed
    .replace(/[%_,()"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!escaped) return null;

  const pattern = `"%${escaped}%"`;
  return [
    `email.ilike.${pattern}`,
    `username.ilike.${pattern}`,
    `wallet_address.ilike.${pattern}`,
    `name.ilike.${pattern}`,
    `city.ilike.${pattern}`,
    `country.ilike.${pattern}`,
  ].join(',');
}
