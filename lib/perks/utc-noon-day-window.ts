/**
 * UTC day windows for in-person perk claim caps.
 * Day boundary is 12:00 UTC so the reset lands in daytime across
 * London / NYC / Amsterdam / Toronto / LA.
 */

export type UtcNoonDayWindow = {
  /** Inclusive start (12:00 UTC of the current claim day). */
  start: Date;
  /** Exclusive end (next 12:00 UTC). */
  end: Date;
};

/**
 * Current claim day as [prev-or-current 12:00 UTC, next 12:00 UTC).
 */
export function getUtcNoonDayWindow(now: Date = new Date()): UtcNoonDayWindow {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const date = now.getUTCDate();
  const hour = now.getUTCHours();

  const noonToday = new Date(Date.UTC(year, month, date, 12, 0, 0, 0));

  if (hour >= 12) {
    const noonTomorrow = new Date(Date.UTC(year, month, date + 1, 12, 0, 0, 0));
    return { start: noonToday, end: noonTomorrow };
  }

  const noonYesterday = new Date(Date.UTC(year, month, date - 1, 12, 0, 0, 0));
  return { start: noonYesterday, end: noonToday };
}
