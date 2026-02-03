/**
 * Returns the start and end ISO timestamps for the current UTC day.
 * Used for daily limit checking (checkins, location creation, etc.)
 */
export const getUtcDayBounds = () => {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
};

/**
 * Returns the start and end ISO timestamps for the current UTC week.
 *
 * Week definition: Monday 00:00:00.000 UTC → next Monday 00:00:00.000 UTC.
 * Used for weekly limit checking (e.g. location creation).
 */
export const getUtcWeekBounds = () => {
  const now = new Date();
  const startOfTodayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  // JS getUTCDay(): 0 (Sun) ... 6 (Sat). Convert to "days since Monday".
  const daysSinceMonday = (startOfTodayUtc.getUTCDay() + 6) % 7;
  const start = new Date(startOfTodayUtc);
  start.setUTCDate(start.getUTCDate() - daysSinceMonday);

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
};
