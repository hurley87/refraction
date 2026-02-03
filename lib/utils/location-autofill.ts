/**
 * Helper to strip a leading name prefix from a place-formatted address string.
 * Used when Mapbox returns "POI Name, Full Address" to avoid duplicating the POI name.
 */
function stripLeadingNameFromPlaceFormatted(
  name: string | undefined,
  placeFormatted: string | undefined
): string {
  if (!name || !placeFormatted) return placeFormatted || '';
  const prefix = `${name}, `;
  if (placeFormatted.startsWith(prefix)) {
    return placeFormatted.slice(prefix.length);
  }
  return placeFormatted;
}

/**
 * Derives display name and address from Mapbox search result data.
 *
 * Rules:
 * - If feature_type is "poi": displayName = name (spot name), address = placeFormatted (full address, with POI name prefix stripped if present)
 * - Otherwise (address-like or unknown): displayName = "" (empty, admin can fill), address = placeFormatted || name
 *
 * @param params - Mapbox search result data
 * @returns Object with displayName and address fields
 */
export function deriveDisplayNameAndAddress(params: {
  name?: string;
  placeFormatted?: string;
  featureType?: string;
}): { displayName: string; address: string } {
  const { name, placeFormatted, featureType } = params;

  // POI (Point of Interest) - has a spot name
  if (featureType === 'poi') {
    const displayName = name || '';
    // Strip the POI name prefix from placeFormatted if it exists
    const address = stripLeadingNameFromPlaceFormatted(
      name,
      placeFormatted
    ).trim();
    return {
      displayName,
      address: address || placeFormatted || '',
    };
  }

  // Address-like or unknown - no spot name, just address
  return {
    displayName: '', // Leave empty for admin to fill
    address: placeFormatted || name || '',
  };
}
