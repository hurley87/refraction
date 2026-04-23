'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';
import { Loader2, MapPin, TrendingUp, Globe, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

interface CityMetric {
  city: string;
  total_spots: number;
  visible_spots: number;
  latest_spot_at: string | null;
}

type SortField = 'city' | 'visible_spots' | 'total_spots' | 'latest_spot_at';
type SortDirection = 'asc' | 'desc';

const MILESTONE_THRESHOLD = 10;

const EMPTY_CITY_METRICS: CityMetric[] = [];

export default function AdminCityMetricsPage() {
  const { user, login, getAccessToken } = usePrivy();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminLoading, setAdminLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('visible_spots');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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

  const { data, isLoading } = useQuery({
    queryKey: ['admin-city-metrics'],
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Missing authorization token');
      }

      const res = await fetch('/api/admin/city-metrics', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch city metrics');
      const json = await res.json();
      const payload = json.data || json;
      return payload as {
        metrics: CityMetric[];
        cities_with_10_plus_spots: number;
      };
    },
    enabled: !!isAdmin && !!user?.email?.address,
  });

  const metrics = data?.metrics ?? EMPTY_CITY_METRICS;

  const sortedMetrics = useMemo(() => {
    return [...metrics].sort((a, b) => {
      let aVal: string | number = a[sortField] ?? '';
      let bVal: string | number = b[sortField] ?? '';

      if (typeof aVal === 'string' && sortField !== 'latest_spot_at') {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      }
      return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
    });
  }, [metrics, sortField, sortDirection]);

  const citiesOver10 = data?.cities_with_10_plus_spots ?? 0;
  const totalSpots = metrics.reduce((s, m) => s + m.visible_spots, 0);
  const totalCities = metrics.filter((m) => m.city !== 'Unknown').length;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => (
    <ArrowUpDown
      className={`w-4 h-4 ml-1 ${sortField === field ? '' : 'opacity-30'} ${sortField === field && sortDirection === 'desc' ? 'rotate-180' : ''}`}
    />
  );

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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">City Metrics</h1>

        {/* Summary cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
              <Globe className="h-4 w-4" />
              Total Cities
            </div>
            <div className="mt-1 text-3xl font-bold text-blue-900">
              {totalCities}
            </div>
          </div>
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-green-600">
              <TrendingUp className="h-4 w-4" />
              Cities with 10+ Spots
            </div>
            <div className="mt-1 text-3xl font-bold text-green-900">
              {citiesOver10}
            </div>
          </div>
          <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-purple-600">
              <MapPin className="h-4 w-4" />
              Total Visible Spots
            </div>
            <div className="mt-1 text-3xl font-bold text-purple-900">
              {totalSpots}
            </div>
          </div>
        </div>

        {/* Mixpanel tracking note */}
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Mixpanel tracking:</strong> A{' '}
          <code className="rounded bg-amber-100 px-1 py-0.5 text-xs font-mono">
            city_milestone
          </code>{' '}
          event fires whenever a city crosses 10, 25, 50, 100, 250, or 500
          visible spots. You can build funnels and alerts on this event in
          Mixpanel.
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : sortedMetrics.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
            No city data found.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="cursor-pointer px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-100"
                    onClick={() => handleSort('city')}
                  >
                    <div className="flex items-center">
                      City
                      <SortIcon field="city" />
                    </div>
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 text-right text-sm font-medium text-gray-700 hover:bg-gray-100"
                    onClick={() => handleSort('visible_spots')}
                  >
                    <div className="flex items-center justify-end">
                      Visible Spots
                      <SortIcon field="visible_spots" />
                    </div>
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 text-right text-sm font-medium text-gray-700 hover:bg-gray-100"
                    onClick={() => handleSort('total_spots')}
                  >
                    <div className="flex items-center justify-end">
                      Total Spots
                      <SortIcon field="total_spots" />
                    </div>
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 text-right text-sm font-medium text-gray-700 hover:bg-gray-100"
                    onClick={() => handleSort('latest_spot_at')}
                  >
                    <div className="flex items-center justify-end">
                      Latest Spot
                      <SortIcon field="latest_spot_at" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedMetrics.map((m) => {
                  const over10 = m.visible_spots >= MILESTONE_THRESHOLD;
                  return (
                    <tr
                      key={m.city}
                      className={`hover:bg-gray-50 ${over10 ? 'bg-green-50/40' : ''}`}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {m.city}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-900">
                        {m.visible_spots}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                        {m.total_spots}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-500">
                        {m.latest_spot_at
                          ? new Date(m.latest_spot_at).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {over10 ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                            10+ spots
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                            {m.visible_spots} / {MILESTONE_THRESHOLD}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
