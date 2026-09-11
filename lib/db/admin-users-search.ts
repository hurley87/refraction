/** Max length for the admin user search `q` param. */
export const ADMIN_USER_SEARCH_MAX_LENGTH = 80;

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
