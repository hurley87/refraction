'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';
import { adminApiAuthHeaders } from '@/lib/admin-api-auth-headers';
import { Loader2, ArrowLeft, CircleDollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Mirrors `GET /api/admin/sponsored-activations` rows (avoid `lib/db` in client bundles). */
type ActivationListRow = {
  id: string;
  slug: string;
  title: string;
  sponsor_name: string;
  status: string;
  settlement_rail: string;
};

export default function AdminSponsoredActivationsListPage() {
  const { user, login, getAccessToken } = usePrivy();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminLoading, setAdminLoading] = useState(true);

  const checkAdminStatus = useCallback(async () => {
    if (!user?.email?.address) return false;
    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await adminApiAuthHeaders(getAccessToken)),
        },
        body: JSON.stringify({}),
      });
      const responseData = await response.json();
      const data = responseData.data || responseData;
      return data.isAdmin;
    } catch {
      return false;
    }
  }, [user?.email?.address, getAccessToken]);

  useEffect(() => {
    const verify = async () => {
      if (user?.email?.address) {
        setIsAdmin(await checkAdminStatus());
        setAdminLoading(false);
      } else if (user === null) {
        setIsAdmin(false);
        setAdminLoading(false);
      }
    };
    void verify();
  }, [user, checkAdminStatus]);

  const { data: activations = [], isLoading } = useQuery<ActivationListRow[]>({
    queryKey: ['admin-sponsored-activations-list'],
    queryFn: async () => {
      const auth = await adminApiAuthHeaders(getAccessToken);
      const response = await fetch('/api/admin/sponsored-activations', {
        headers: auth,
      });
      if (!response.ok) throw new Error('Failed to load activations');
      const responseData = await response.json();
      const data = responseData.data || responseData;
      return (data.activations ?? []) as ActivationListRow[];
    },
    enabled: !!isAdmin && !!user?.email?.address,
  });

  if (adminLoading || (user && isAdmin === null)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-gray-600">Please log in to access admin.</p>
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
    <div className="min-h-screen bg-gray-50 p-6 dark:bg-neutral-950">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <Link
            href="/admin"
            className="mb-4 inline-flex items-center gap-1 text-sm text-blue-700 hover:underline dark:text-blue-400"
          >
            <ArrowLeft className="size-4" />
            Admin home
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
              <CircleDollarSign className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-neutral-100">
                Sponsored activations
              </h1>
              <p className="text-sm text-gray-500 dark:text-neutral-400">
                Public Records activation health and settlement ops.
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-8 animate-spin text-neutral-400" />
          </div>
        ) : activations.length === 0 ? (
          <p className="text-neutral-600 dark:text-neutral-400">
            No sponsored activations yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-neutral-800 dark:bg-neutral-950">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-700 dark:text-neutral-300">
                    Title
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-700 dark:text-neutral-300">
                    Status
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-700 dark:text-neutral-300">
                    Rail
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-700 dark:text-neutral-300">
                    Slug
                  </th>
                </tr>
              </thead>
              <tbody>
                {activations.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-gray-100 last:border-0 dark:border-neutral-800"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/sponsored-activations/${encodeURIComponent(a.id)}`}
                        className="font-medium text-blue-700 hover:underline dark:text-blue-400"
                      >
                        {a.title}
                      </Link>
                      <div className="text-xs text-neutral-500">
                        {a.sponsor_name}
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize text-neutral-800 dark:text-neutral-200">
                      {a.status}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-700 dark:text-neutral-300">
                      {a.settlement_rail}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-600 dark:text-neutral-400">
                      {a.slug}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
