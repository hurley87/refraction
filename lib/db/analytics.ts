import { supabase } from './client';

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

  const { data: pointsData } = await supabase
    .from('players')
    .select('total_points');

  const totalPoints = (pointsData ?? []).reduce(
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
  let signupsQuery = supabase.from('players').select('created_at');
  let checkinsQuery = supabase
    .from('player_location_checkins')
    .select('created_at');
  let perkQuery = supabase.from('user_perk_redemptions').select('redeemed_at');
  let spendQuery = supabase.from('spend_redemptions').select('created_at');

  if (from) {
    signupsQuery = signupsQuery.gte('created_at', from);
    checkinsQuery = checkinsQuery.gte('created_at', from);
    perkQuery = perkQuery.gte('redeemed_at', from);
    spendQuery = spendQuery.gte('created_at', from);
  }
  if (to) {
    signupsQuery = signupsQuery.lte('created_at', to);
    checkinsQuery = checkinsQuery.lte('created_at', to);
    perkQuery = perkQuery.lte('redeemed_at', to);
    spendQuery = spendQuery.lte('created_at', to);
  }

  const [signups, checkins, perks, spends] = await Promise.all([
    signupsQuery.order('created_at', { ascending: true }),
    checkinsQuery.order('created_at', { ascending: true }),
    perkQuery.order('redeemed_at', { ascending: true }),
    spendQuery.order('created_at', { ascending: true }),
  ]);

  return {
    signups: buildDailyTimeSeries(signups.data ?? []),
    checkins: buildDailyTimeSeries(checkins.data ?? []),
    perk_redemptions: buildDailyTimeSeries(
      (perks.data ?? []).map((r) => ({
        created_at: (r as any).redeemed_at,
      }))
    ),
    spend_redemptions: buildDailyTimeSeries(spends.data ?? []),
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
  const { data: checkins, error: checkinsErr } = await supabase
    .from('player_location_checkins')
    .select('location_id');

  if (checkinsErr) throw checkinsErr;

  const countMap = new Map<number, number>();
  for (const c of checkins ?? []) {
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
