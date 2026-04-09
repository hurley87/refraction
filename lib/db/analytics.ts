import { supabase } from './client';

/**
 * PostgREST/Supabase returns at most this many rows per request unless configured otherwise.
 * We paginate with `.range()` so analytics stay correct beyond this cap.
 */
const POSTGREST_DEFAULT_MAX_ROWS = 1000;

/**
 * Fetch all rows for a query by paging with `.range(from, to)`.
 * Required when aggregating or counting in JS; otherwise results silently truncate.
 */
export async function fetchAllRowsInPages<T>(
  runPage: (
    from: number,
    to: number
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const rows: T[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await runPage(
      offset,
      offset + POSTGREST_DEFAULT_MAX_ROWS - 1
    );
    if (error) throw error;
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < POSTGREST_DEFAULT_MAX_ROWS) break;
    offset += POSTGREST_DEFAULT_MAX_ROWS;
  }
  return rows;
}

export interface TimeSeriesPoint {
  date: string;
  count: number;
}

export interface AnalyticsSummary {
  total_players: number;
  total_checkins: number;
  total_perk_redemptions: number;
  total_spend_redemptions: number;
  total_points_awarded: number;
  total_locations: number;
}

export interface AnalyticsTimeSeries {
  signups: TimeSeriesPoint[];
  checkins: TimeSeriesPoint[];
  perk_redemptions: TimeSeriesPoint[];
  spend_redemptions: TimeSeriesPoint[];
}

export interface RecentSignup {
  wallet_address: string;
  email: string | null;
  username: string | null;
  created_at: string;
}

export interface RecentCheckin {
  id: number;
  player_wallet: string | null;
  player_username: string | null;
  location_name: string | null;
  points_earned: number;
  created_at: string;
}

export interface TopLocation {
  id: number;
  name: string;
  city: string | null;
  checkin_count: number;
}

/**
 * Fetch overall summary counts for the analytics dashboard.
 */
export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const [players, checkins, perkRedemptions, spendRedemptions, locations] =
    await Promise.all([
      supabase.from('players').select('*', { count: 'exact', head: true }),
      supabase
        .from('player_location_checkins')
        .select('*', { count: 'exact', head: true }),
      supabase
        .from('user_perk_redemptions')
        .select('*', { count: 'exact', head: true }),
      supabase
        .from('spend_redemptions')
        .select('*', { count: 'exact', head: true }),
      supabase.from('locations').select('*', { count: 'exact', head: true }),
    ]);

  const pointsRows = await fetchAllRowsInPages<{ total_points: number | null }>(
    (from, to) =>
      supabase
        .from('players')
        .select('total_points')
        .order('id', { ascending: true })
        .range(from, to)
  );

  const totalPoints = pointsRows.reduce(
    (sum, p) => sum + (p.total_points ?? 0),
    0
  );

  return {
    total_players: players.count ?? 0,
    total_checkins: checkins.count ?? 0,
    total_perk_redemptions: perkRedemptions.count ?? 0,
    total_spend_redemptions: spendRedemptions.count ?? 0,
    total_points_awarded: totalPoints,
    total_locations: locations.count ?? 0,
  };
}

/**
 * Build a daily time series from raw timestamped rows.
 * Groups by calendar date in UTC.
 */
function buildDailyTimeSeries(
  rows: { created_at: string }[],
  dateField: string = 'created_at'
): TimeSeriesPoint[] {
  const counts = new Map<string, number>();

  for (const row of rows) {
    const ts = (row as any)[dateField];
    if (!ts) continue;
    const date = ts.substring(0, 10);
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Fetch daily time series for sign-ups, check-ins, perk/spend redemptions.
 * Optionally scoped to a date range.
 */
export async function getAnalyticsTimeSeries(
  from?: string,
  to?: string
): Promise<AnalyticsTimeSeries> {
  const buildSignupsQuery = () => {
    let q = supabase.from('players').select('created_at, id');
    if (from) q = q.gte('created_at', from);
    if (to) q = q.lte('created_at', to);
    return q;
  };
  const buildCheckinsQuery = () => {
    let q = supabase.from('player_location_checkins').select('created_at, id');
    if (from) q = q.gte('created_at', from);
    if (to) q = q.lte('created_at', to);
    return q;
  };
  const buildPerksQuery = () => {
    let q = supabase.from('user_perk_redemptions').select('redeemed_at, id');
    if (from) q = q.gte('redeemed_at', from);
    if (to) q = q.lte('redeemed_at', to);
    return q;
  };
  const buildSpendsQuery = () => {
    let q = supabase.from('spend_redemptions').select('created_at, id');
    if (from) q = q.gte('created_at', from);
    if (to) q = q.lte('created_at', to);
    return q;
  };

  const [signupRows, checkinRows, perkRows, spendRows] = await Promise.all([
    fetchAllRowsInPages<{ created_at: string }>((fromIdx, toIdx) =>
      buildSignupsQuery().order('id', { ascending: true }).range(fromIdx, toIdx)
    ),
    fetchAllRowsInPages<{ created_at: string }>((fromIdx, toIdx) =>
      buildCheckinsQuery()
        .order('id', { ascending: true })
        .range(fromIdx, toIdx)
    ),
    fetchAllRowsInPages<{ redeemed_at: string | null }>((fromIdx, toIdx) =>
      buildPerksQuery().order('id', { ascending: true }).range(fromIdx, toIdx)
    ),
    fetchAllRowsInPages<{ created_at: string }>((fromIdx, toIdx) =>
      buildSpendsQuery().order('id', { ascending: true }).range(fromIdx, toIdx)
    ),
  ]);

  return {
    signups: buildDailyTimeSeries(signupRows),
    checkins: buildDailyTimeSeries(checkinRows),
    perk_redemptions: buildDailyTimeSeries(
      perkRows.map((r) => ({
        created_at: r.redeemed_at ?? '',
      })),
      'created_at'
    ),
    spend_redemptions: buildDailyTimeSeries(spendRows),
  };
}

/**
 * Get the most recent sign-ups.
 */
export async function getRecentSignups(
  limit: number = 20
): Promise<RecentSignup[]> {
  const { data, error } = await supabase
    .from('players')
    .select('wallet_address, email, username, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as RecentSignup[];
}

/**
 * Get the most recent check-ins with player and location details.
 * Uses separate lookups to avoid dependency on FK constraint names.
 */
export async function getRecentCheckins(
  limit: number = 20
): Promise<RecentCheckin[]> {
  const { data: checkins, error } = await supabase
    .from('player_location_checkins')
    .select('id, player_id, location_id, points_earned, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  if (!checkins || checkins.length === 0) return [];

  const playerIds = [...new Set(checkins.map((c) => c.player_id))];
  const locationIds = [...new Set(checkins.map((c) => c.location_id))];

  const [playersResult, locationsResult] = await Promise.all([
    supabase
      .from('players')
      .select('id, wallet_address, username')
      .in('id', playerIds),
    supabase.from('locations').select('id, name').in('id', locationIds),
  ]);

  const playersMap = new Map(
    (playersResult.data ?? []).map((p: any) => [p.id, p])
  );
  const locationsMap = new Map(
    (locationsResult.data ?? []).map((l: any) => [l.id, l])
  );

  return checkins.map((row) => {
    const player = playersMap.get(row.player_id) as any;
    const location = locationsMap.get(row.location_id) as any;
    return {
      id: row.id,
      player_wallet: player?.wallet_address ?? null,
      player_username: player?.username ?? null,
      location_name: location?.name ?? null,
      points_earned: row.points_earned,
      created_at: row.created_at,
    };
  });
}

/**
 * Get locations sorted by number of check-ins.
 * Counts are computed via a separate aggregation query for reliability.
 */
export async function getTopLocations(
  limit: number = 20
): Promise<TopLocation[]> {
  const checkins = await fetchAllRowsInPages<{ location_id: number }>(
    (from, to) =>
      supabase
        .from('player_location_checkins')
        .select('location_id, id')
        .order('id', { ascending: true })
        .range(from, to)
  );

  const countMap = new Map<number, number>();
  for (const c of checkins) {
    countMap.set(c.location_id, (countMap.get(c.location_id) ?? 0) + 1);
  }

  const topIds = Array.from(countMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  if (topIds.length === 0) return [];

  const { data: locations, error: locErr } = await supabase
    .from('locations')
    .select('id, name, city')
    .in(
      'id',
      topIds.map(([id]) => id)
    );

  if (locErr) throw locErr;

  const locMap = new Map((locations ?? []).map((l: any) => [l.id, l]));

  return topIds.map(([id, count]) => {
    const loc = locMap.get(id) as any;
    return {
      id,
      name: loc?.name ?? 'Unknown',
      city: loc?.city ?? null,
      checkin_count: count,
    };
  });
}
