'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';
import { toast } from 'sonner';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AdminGuideSummary } from '@/lib/db/guides';

const GUIDES_ADMIN_KEY = ['admin-guides'] as const;

export default function AdminGuidesListPage() {
  const { user, login } = usePrivy();
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminLoading, setAdminLoading] = useState(true);

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
        setIsAdmin(await checkAdminStatus());
        setAdminLoading(false);
      } else if (user === null) {
        setIsAdmin(false);
        setAdminLoading(false);
      }
    };
    void verify();
  }, [user, checkAdminStatus]);

  const adminEmail = user?.email?.address || '';

  const { data: guides = [], isLoading } = useQuery<AdminGuideSummary[]>({
    queryKey: GUIDES_ADMIN_KEY,
    queryFn: async () => {
      const response = await fetch('/api/admin/guides', {
        headers: { 'x-user-email': adminEmail },
      });
      if (!response.ok) throw new Error('Failed to load guides');
      const responseData = await response.json();
      const data = responseData.data || responseData;
      return data.guides ?? [];
    },
    enabled: !!isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: async (kind: 'city_guide' | 'editorial') => {
      const response = await fetch('/api/admin/guides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': adminEmail,
        },
        body: JSON.stringify({ kind }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || err.message || 'Create failed');
      }
      const responseData = await response.json();
      const data = responseData.data || responseData;
      return data.guide as { id: string };
    },
    onSuccess: (g) => {
      void queryClient.invalidateQueries({ queryKey: GUIDES_ADMIN_KEY });
      toast.success('Guide created');
      window.location.href = `/admin/guides/${g.id}`;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (adminLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <Loader2 className="size-8 animate-spin text-neutral-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg p-8">
        <h1 className="mb-4 text-xl font-semibold">Guides CMS</h1>
        <p className="mb-4 text-neutral-600">
          Sign in to manage city guides and editorials.
        </p>
        <Button type="button" onClick={() => login()}>
          Log in
        </Button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg p-8">
        <h1 className="mb-4 text-xl font-semibold">Unauthorized</h1>
        <p className="text-neutral-600">
          Your account is not allowed to access Guides admin.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6 font-grotesk">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-[#171717]">Guides</h1>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={createMutation.isPending}
            onClick={() => createMutation.mutate('city_guide')}
            className="gap-1"
          >
            <Plus className="size-4" />
            New city guide
          </Button>
          <Button
            type="button"
            disabled={createMutation.isPending}
            onClick={() => createMutation.mutate('editorial')}
            className="gap-1 bg-black text-white hover:bg-black/85"
          >
            <Plus className="size-4" />
            New editorial
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-neutral-500" />
        </div>
      ) : guides.length === 0 ? (
        <p className="text-neutral-600">No guides yet. Create one above.</p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {guides.map((g) => (
            <li
              key={g.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <div className="font-medium text-[#171717]">{g.label}</div>
                <div className="text-sm text-neutral-500">
                  <span className="uppercase">{g.kind.replace('_', ' ')}</span>{' '}
                  · / {g.slug} · {g.is_published ? 'Published' : 'Draft'}
                  {g.is_featured ? ' · Featured' : ''}
                </div>
              </div>
              <Link
                href={`/admin/guides/${g.id}`}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                Edit
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 text-sm text-neutral-500">
        Manage venues in{' '}
        <Link
          href="/admin/location-lists"
          className="text-blue-600 hover:underline"
        >
          Location lists
        </Link>
        .
      </p>
    </div>
  );
}
