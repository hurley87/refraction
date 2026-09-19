export const WELCOME_TOUR_STORAGE_KEY = 'irl-map-welcome-tour-v4';
export const LOCATION_INSTRUCTION_STORAGE_KEY =
  'irl-location-create-instruction-count';
/** Shown once after a member creates their first custom list from the map. */
export const LIST_CREATE_MAP_TIP_STORAGE_KEY =
  'irl-custom-list-map-tip-seen-v4';

export const getWelcomeTourStorageKey = (wallet?: string | null) =>
  wallet ? `${WELCOME_TOUR_STORAGE_KEY}:${wallet}` : WELCOME_TOUR_STORAGE_KEY;

export function readLocalStorageItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocalStorageItem(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage may be blocked (Safari privacy settings, sandboxed iframe).
  }
}
