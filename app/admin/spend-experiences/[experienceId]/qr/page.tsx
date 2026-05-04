'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';
import { adminApiAuthHeaders } from '@/lib/admin-api-auth-headers';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import QRCode from 'qrcode';
import type { SpendExperience } from '@/lib/types';
import { initMixpanel, trackEvent } from '@/lib/analytics';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';

export default function AdminSpendExperienceQrPage() {
  const params = useParams<{ experienceId: string }>();
  const experienceId = params.experienceId;
  const { user, login, getAccessToken } = usePrivy();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminLoading, setAdminLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

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

  const { data, isLoading, error } = useQuery<SpendExperience>({
    queryKey: ['admin-spend-experience', experienceId, isAdmin],
    queryFn: async () => {
      const auth = await adminApiAuthHeaders(getAccessToken);
      const response = await fetch(
        `/api/admin/spend-experiences/${experienceId}`,
        { headers: auth }
      );
      if (!response.ok) throw new Error('Failed to load experience');
      const j = await response.json();
      const exp = (j.data?.spendExperience ?? j.spendExperience) as
        | SpendExperience
        | undefined;
      if (!exp) throw new Error('Missing experience');
      return exp;
    },
    enabled: Boolean(experienceId && isAdmin && user?.email?.address),
  });

  const scanUrl = useMemo(() => {
    if (typeof window === 'undefined' || !experienceId) return '';
    return `${window.location.origin}/spend/${experienceId}`;
  }, [experienceId]);

  useEffect(() => {
    if (!scanUrl) return;
    void QRCode.toDataURL(scanUrl, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: 'M',
    }).then(setQrDataUrl);
  }, [scanUrl]);

  useEffect(() => {
    if (!data?.id) return;
    const run = async () => {
      const token =
        process.env.NEXT_PUBLIC_MIXPANEL_TOKEN || process.env.MIXPANEL_TOKEN;
      if (token) {
        await initMixpanel(token);
      }
      if (user?.id) {
        trackEvent(ANALYTICS_EVENTS.SPEND_EXPERIENCE_QR_VIEWED_BY_ADMIN, {
          spend_experience_id: data.id,
          user_id: user.id,
          wallet_address: user.wallet?.address ?? undefined,
          event_id: data.event_id ?? undefined,
        });
      }
    };
    void run();
  }, [data?.id, data?.event_id, user?.id, user?.wallet?.address]);

  if (adminLoading || (user && isAdmin === null)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-neutral-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md p-6">
        <p className="mb-4 text-neutral-700">Sign in to view the event QR.</p>
        <Button onClick={login} className="w-full">
          Log in
        </Button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md p-6">
        <p className="text-red-600">You do not have access to this page.</p>
        <Link
          href="/admin/spend-experiences"
          className="mt-4 inline-block text-sm text-blue-600 hover:underline"
        >
          Back to spend experiences
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg p-6">
      <div className="mb-6">
        <Link
          href="/admin/spend-experiences"
          className="mb-4 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
        >
          <ArrowLeft className="size-4" />
          Back to list
        </Link>
        <h1 className="text-2xl font-semibold text-[#171717]">Event QR</h1>
        <p className="mt-1 text-sm text-neutral-600">
          This QR opens the in-app spend flow for this experience (not a raw
          on-chain payment).
        </p>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-neutral-500" />
        </div>
      )}

      {error && (
        <p className="text-red-600">Could not load this spend experience.</p>
      )}

      {data && !isLoading && (
        <div className="space-y-6 rounded-lg border border-neutral-200 bg-white p-6">
          <div>
            <div className="font-medium text-[#171717]">{data.title}</div>
            {data.description && (
              <p className="mt-1 text-sm text-neutral-600">
                {data.description}
              </p>
            )}
            <p className="mt-2 font-mono text-xs break-all text-blue-600">
              {scanUrl}
            </p>
          </div>

          {qrDataUrl && (
            <div className="flex flex-col items-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL QR */}
              <img
                src={qrDataUrl}
                alt="QR code linking to spend experience"
                width={320}
                height={320}
                className="rounded-md border border-neutral-200"
              />
              <p className="mt-3 text-center text-xs text-neutral-500">
                Attendees scan this to open the app at /spend/{data.id}
              </p>
            </div>
          )}

          {!qrDataUrl && <Loader2 className="mx-auto size-8 animate-spin" />}
        </div>
      )}
    </div>
  );
}
