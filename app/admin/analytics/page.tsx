'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';
import {
  Loader2,
  Users,
  MapPin,
  Gift,
  TrendingUp,
  ShoppingBag,
  Globe,
  Download,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

interface TimeSeriesPoint {
  date: string;
  count: number;
}

interface AnalyticsData {
  summary: {
    total_players: number;
    total_checkins: number;
    total_perk_redemptions: number;
    total_spend_redemptions: number;
    total_points_awarded: number;
    total_locations: number;
  };
  timeSeries: {
    signups: TimeSeriesPoint[];
    checkins: TimeSeriesPoint[];
    perk_redemptions: TimeSeriesPoint[];
    spend_redemptions: TimeSeriesPoint[];
  };
  recentSignups: {
    wallet_address: string;
    email: string | null;
    username: string | null;
    created_at: string;
  }[];
  recentCheckins: {
    id: number;
    player_wallet: string | null;
    player_username: string | null;
    location_name: string | null;
    points_earned: number;
    created_at: string;
  }[];
  topLocations: {
    id: number;
    name: string;
    city: string | null;
    checkin_count: number;
  }[];
}

type ActiveTab = 'overview' | 'signups' | 'checkins' | 'locations';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/**
 * Aggregate daily time series into weekly buckets for readability.
 */
function aggregateWeekly(points: TimeSeriesPoint[]): TimeSeriesPoint[] {
  if (points.length === 0) return [];
  const weeks = new Map<string, number>();

  for (const { date, count } of points) {
    const d = new Date(date + 'T00:00:00Z');
    const dayOfWeek = d.getUTCDay();
    const diff = d.getUTCDate() - dayOfWeek;
    const weekStart = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff)
    );
    const key = weekStart.toISOString().substring(0, 10);
    weeks.set(key, (weeks.get(key) ?? 0) + count);
  }

  return Array.from(weeks.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function BarChart({
  data,
  label,
  color,
}: {
  data: TimeSeriesPoint[];
  label: string;
  color: string;
}) {
  const weekly = useMemo(() => aggregateWeekly(data), [data]);
  const maxCount = useMemo(
    () => Math.max(...weekly.map((p) => p.count), 1),
    [weekly]
  );
  const total = useMemo(
    () => weekly.reduce((s, p) => s + p.count, 0),
    [weekly]
  );

  if (weekly.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">{label}</h3>
          <span className="text-xs text-gray-400">No data</span>
        </div>
        <div className="flex h-32 items-center justify-center text-sm text-gray-400">
          No activity in this period
        </div>
      </div>
    );
  }

  const displayData = weekly.length > 52 ? weekly.slice(-52) : weekly;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">{label}</h3>
        <span className="text-xs font-medium text-gray-500">
          Total: {formatNumber(total)}
        </span>
      </div>
      <div className="flex h-32 items-end gap-px">
        {displayData.map((point) => {
          const height = Math.max((point.count / maxCount) * 100, 2);
          return (
            <div
              key={point.date}
              className="group relative flex-1"
              title={`Week of ${point.date}: ${point.count}`}
            >
              <div
                className={`w-full rounded-t-sm ${color} transition-opacity hover:opacity-80`}
                style={{ height: `${height}%` }}
              />
              <div className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white group-hover:block">
                {point.date}: {point.count}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-xs text-gray-400">
        <span>{displayData[0]?.date}</span>
        <span>{displayData[displayData.length - 1]?.date}</span>
      </div>
    </div>
  );
}

function exportToCsv(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => JSON.stringify(row[h] ?? '')).join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminAnalyticsPage() {
  const { user, login, getAccessToken } = usePrivy();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminLoading, setAdminLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const checkAdminStatus = useCallback(async () => {
    if (!user?.email?.address) return false;
    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email.address }),
      });
      const responseData = await response.json();
      const data = responseData.data || responseData;
      return data.isAdmin;
    } catch {
      return false;
    }
  }, [user?.email?.address]);

  useEffect(() => {
    const verify = async () => {
      if (user?.email?.address) {
        const adminStatus = await checkAdminStatus();
        setIsAdmin(adminStatus);
        setAdminLoading(false);
      } else if (user === null) {
        setIsAdmin(false);
        setAdminLoading(false);
      }
    };
    verify();
  }, [user, checkAdminStatus]);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    return params.toString();
  }, [dateFrom, dateTo]);

  const { data, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ['admin-analytics', queryParams],
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error('Missing authorization token');

      const url = `/api/admin/analytics${queryParams ? `?${queryParams}` : ''}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch analytics');
      const json = await res.json();
      return (json.data || json) as AnalyticsData;
    },
    enabled: !!isAdmin && !!user?.email?.address,
  });

  const tabs: { key: ActiveTab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'signups', label: 'Sign-ups' },
    { key: 'checkins', label: 'Check-ins' },
    { key: 'locations', label: 'Top Locations' },
  ];

  if (adminLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-gray-600">Please log in to access this page.</p>
        <Button onClick={login}>Log In</Button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-red-600">
          Unauthorized: You don&apos;t have admin access.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Platform Analytics
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Historical usage data from Supabase — check-ins, sign-ups,
              redemptions, and more.
            </p>
          </div>

          {/* Date range filter */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="From"
            />
            <span className="text-gray-400">–</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="To"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                }}
                className="text-xs text-blue-600 hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 overflow-x-auto rounded-lg border border-gray-200 bg-white p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-600">
            Failed to load analytics data. Please try again.
          </div>
        ) : data ? (
          <>
            {/* Summary Cards — always visible */}
            <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <SummaryCard
                icon={<Users className="h-4 w-4" />}
                label="Total Users"
                value={data.summary.total_players}
                color="blue"
              />
              <SummaryCard
                icon={<MapPin className="h-4 w-4" />}
                label="Total Check-ins"
                value={data.summary.total_checkins}
                color="green"
              />
              <SummaryCard
                icon={<Globe className="h-4 w-4" />}
                label="Total Locations"
                value={data.summary.total_locations}
                color="purple"
              />
              <SummaryCard
                icon={<Gift className="h-4 w-4" />}
                label="Perk Redemptions"
                value={data.summary.total_perk_redemptions}
                color="amber"
              />
              <SummaryCard
                icon={<ShoppingBag className="h-4 w-4" />}
                label="Spend Redemptions"
                value={data.summary.total_spend_redemptions}
                color="rose"
              />
              <SummaryCard
                icon={<TrendingUp className="h-4 w-4" />}
                label="Points Awarded"
                value={data.summary.total_points_awarded}
                color="indigo"
              />
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <BarChart
                  data={data.timeSeries.signups}
                  label="Sign-ups (weekly)"
                  color="bg-blue-500"
                />
                <BarChart
                  data={data.timeSeries.checkins}
                  label="Check-ins (weekly)"
                  color="bg-green-500"
                />
                <BarChart
                  data={data.timeSeries.perk_redemptions}
                  label="Perk Redemptions (weekly)"
                  color="bg-amber-500"
                />
                <BarChart
                  data={data.timeSeries.spend_redemptions}
                  label="Spend Redemptions (weekly)"
                  color="bg-rose-500"
                />
              </div>
            )}

            {/* Sign-ups Tab */}
            {activeTab === 'signups' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Recent Sign-ups
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      exportToCsv(
                        data.recentSignups.map((s) => ({
                          wallet: s.wallet_address,
                          email: s.email ?? '',
                          username: s.username ?? '',
                          signed_up: s.created_at,
                        })),
                        'recent-signups.csv'
                      )
                    }
                  >
                    <Download className="mr-1 h-3 w-3" />
                    Export CSV
                  </Button>
                </div>
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                          User
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                          Email
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                          Wallet
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                          Signed Up
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {data.recentSignups.map((signup, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {signup.username || '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {signup.email || '—'}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-500">
                            {truncateAddress(signup.wallet_address)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-500">
                            {new Date(signup.created_at).toLocaleDateString(
                              'en-US',
                              {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              }
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {data.recentSignups.length === 0 && (
                    <div className="p-8 text-center text-sm text-gray-400">
                      No sign-ups found in this period.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Check-ins Tab */}
            {activeTab === 'checkins' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Recent Check-ins
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      exportToCsv(
                        data.recentCheckins.map((c) => ({
                          id: c.id,
                          player: c.player_username ?? c.player_wallet ?? '',
                          location: c.location_name ?? '',
                          points: c.points_earned,
                          date: c.created_at,
                        })),
                        'recent-checkins.csv'
                      )
                    }
                  >
                    <Download className="mr-1 h-3 w-3" />
                    Export CSV
                  </Button>
                </div>
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                          Player
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                          Location
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                          Points
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {data.recentCheckins.map((checkin) => (
                        <tr key={checkin.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {checkin.player_username ||
                              (checkin.player_wallet
                                ? truncateAddress(checkin.player_wallet)
                                : '—')}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {checkin.location_name || '—'}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-sm font-medium text-green-700">
                            +{checkin.points_earned}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-500">
                            {new Date(checkin.created_at).toLocaleDateString(
                              'en-US',
                              {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              }
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {data.recentCheckins.length === 0 && (
                    <div className="p-8 text-center text-sm text-gray-400">
                      No check-ins found in this period.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Top Locations Tab */}
            {activeTab === 'locations' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Top Locations by Check-ins
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      exportToCsv(
                        data.topLocations.map((l) => ({
                          name: l.name,
                          city: l.city ?? '',
                          checkin_count: l.checkin_count,
                        })),
                        'top-locations.csv'
                      )
                    }
                  >
                    <Download className="mr-1 h-3 w-3" />
                    Export CSV
                  </Button>
                </div>
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                          #
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                          Location
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                          City
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                          Check-ins
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                          Share
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {data.topLocations.map((loc, idx) => {
                        const maxCheckins =
                          data.topLocations[0]?.checkin_count ?? 1;
                        const pct = Math.round(
                          (loc.checkin_count / maxCheckins) * 100
                        );
                        return (
                          <tr key={loc.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm tabular-nums text-gray-400">
                              {idx + 1}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {loc.name}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {loc.city || '—'}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-sm font-medium text-gray-900">
                              {loc.checkin_count}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-2">
                                <div className="h-2 w-24 rounded-full bg-gray-100">
                                  <div
                                    className="h-2 rounded-full bg-green-500"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {data.topLocations.length === 0 && (
                    <div className="p-8 text-center text-sm text-gray-400">
                      No locations found.
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : null}

        {/* Footer note */}
        <div className="mt-8 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500">
          <strong>Note:</strong> This dashboard queries Supabase directly for
          historical data. For real-time event analytics (post-January 2025),
          see Mixpanel. Data shown here covers all activity stored in the
          database, including periods before Mixpanel was enabled.
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'blue' | 'green' | 'purple' | 'amber' | 'rose' | 'indigo';
}) {
  const colorMap = {
    blue: {
      border: 'border-blue-200',
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      value: 'text-blue-900',
    },
    green: {
      border: 'border-green-200',
      bg: 'bg-green-50',
      text: 'text-green-600',
      value: 'text-green-900',
    },
    purple: {
      border: 'border-purple-200',
      bg: 'bg-purple-50',
      text: 'text-purple-600',
      value: 'text-purple-900',
    },
    amber: {
      border: 'border-amber-200',
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      value: 'text-amber-900',
    },
    rose: {
      border: 'border-rose-200',
      bg: 'bg-rose-50',
      text: 'text-rose-600',
      value: 'text-rose-900',
    },
    indigo: {
      border: 'border-indigo-200',
      bg: 'bg-indigo-50',
      text: 'text-indigo-600',
      value: 'text-indigo-900',
    },
  };

  const c = colorMap[color];

  return (
    <div className={`rounded-lg border ${c.border} ${c.bg} p-4`}>
      <div className={`flex items-center gap-2 text-sm font-medium ${c.text}`}>
        {icon}
        {label}
      </div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${c.value}`}>
        {formatNumber(value)}
      </div>
    </div>
  );
}
