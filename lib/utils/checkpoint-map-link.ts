/**
 * Extract lat/lng from a checkpoint CTA URL when it points at the interactive map
 * with explicit coordinates (admin-configured deep links).
 */
export function parseInteractiveMapCoordsFromUrl(
  raw: string | null | undefined
): { lat: number; lng: number } | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const base =
      typeof window !== 'undefined'
        ? window.location.origin
        : 'https://example.com';
    const url = trimmed.startsWith('http')
      ? new URL(trimmed)
      : new URL(trimmed, base);
    const path = url.pathname.toLowerCase();
    if (!path.includes('interactive-map')) return null;
    const lat = parseFloat(url.searchParams.get('lat') || '');
    const lng = parseFloat(url.searchParams.get('lng') || '');
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

/** Haversine distance in kilometers between two WGS84 points. */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
