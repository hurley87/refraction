/**
 * Client-side keys for the post-username → first map check-in nudge on /interactive-map.
 * Pending is cleared after the first location check-in or when snooze expires and we can re-show.
 */

/** Wallet (lowercase) while the user has not completed a first map check-in after username setup. */
export const FIRST_CHECKIN_NUDGE_PENDING_KEY =
  'irl:first-checkin-nudge-pending';

/** When set (ms since epoch), hide the nudge until this time (24h snooze after dismiss). */
export const FIRST_CHECKIN_NUDGE_SNOOZE_UNTIL_KEY =
  'irl:first-checkin-nudge-snooze-until';

export const FIRST_CHECKIN_NUDGE_NEARBY_KM = 15;

export const FIRST_CHECKIN_SNOOZE_MS = 24 * 60 * 60 * 1000;
