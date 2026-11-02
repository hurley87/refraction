/**
 * City guide membership gate.
 *
 * Off: every spot is on the page for everyone, and city guides are not marked
 * members-only for Google. The gate UI, `applyPublicLocationGate`, and each
 * guide's free-spot count stay so this can be turned back on.
 */
export const CITY_GUIDE_LOCATION_GATE_ENABLED = false;

/** Public guide pages apply the gate only while the switch above is on. */
export function shouldApplyCityGuideLocationGate(
  audience: 'public' | 'full' | undefined
): boolean {
  return CITY_GUIDE_LOCATION_GATE_ENABLED && audience !== 'full';
}
