'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SpendExperience, SpendSession } from '@/lib/types';
import { initMixpanel, trackEvent } from '@/lib/analytics';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { apiClient } from '@/lib/api/client';

type SpendExperiencePageProps = {
  experienceId: string;
  initialExperience: SpendExperience;
};

type SessionResponse = {
  session: SpendSession;
  spendExperience: SpendExperience;
  created: boolean;
};

/**
 * Spend pilot: opens from QR at `/spend/{experienceId}`; creates/returns a session when authed.
 */
export function SpendExperiencePage({
  experienceId,
  initialExperience,
}: SpendExperiencePageProps) {
  const { user, login, getAccessToken } = usePrivy();
  const walletAddress = user?.wallet?.address;
  const [trackedScan, setTrackedScan] = useState(false);

  const { data: sessionPayload, isFetching } = useQuery({
    queryKey: ['spend-session', experienceId, user?.id, walletAddress] as const,
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token || !walletAddress) {
        throw new Error('Missing auth');
      }
      return apiClient<SessionResponse>(
        `/api/spend-experiences/${experienceId}/sessions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ walletAddress }),
        }
      );
    },
    enabled: Boolean(user && walletAddress),
    retry: false,
  });

  useEffect(() => {
    const fireScan = async () => {
      if (trackedScan) return;
      const token =
        process.env.NEXT_PUBLIC_MIXPANEL_TOKEN || process.env.MIXPANEL_TOKEN;
      if (token) {
        await initMixpanel(token);
      }
      trackEvent(ANALYTICS_EVENTS.SPEND_EXPERIENCE_QR_SCANNED, {
        spend_experience_id: experienceId,
        event_id: initialExperience.event_id ?? undefined,
        user_id: user?.id,
        wallet_address: walletAddress ?? undefined,
      });
      setTrackedScan(true);
    };
    void fireScan();
  }, [
    experienceId,
    initialExperience.event_id,
    user?.id,
    walletAddress,
    trackedScan,
  ]);

  const experience = sessionPayload?.spendExperience ?? initialExperience;
  const session = sessionPayload?.session;

  return (
    <div className="container mx-auto max-w-lg p-6">
      <h1 className="mb-2 text-2xl font-bold text-[#171717]">
        {experience.title}
      </h1>
      {experience.description && (
        <p className="mb-4 text-neutral-600">{experience.description}</p>
      )}

      <div className="mb-6 space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-neutral-600">Status</span>
          <span className="font-medium capitalize">{experience.status}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-600">Max USDC / user</span>
          <span className="font-medium">
            ${Number(experience.max_usdc_per_user).toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-600">Points per $1 USDC</span>
          <span className="font-medium">
            {Number(experience.points_to_usdc_rate).toLocaleString()} pts
          </span>
        </div>
      </div>

      {!user && (
        <Button className="w-full" onClick={login}>
          Log in to continue
        </Button>
      )}

      {user && !walletAddress && (
        <p className="text-sm text-amber-800">
          Add or connect a wallet in your profile to use this spend experience.
        </p>
      )}

      {user && walletAddress && (
        <div className="space-y-4">
          {isFetching && (
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <Loader2 className="size-4 animate-spin" />
              Starting your session…
            </div>
          )}

          {session && !isFetching && (
            <p className="text-sm text-neutral-700">
              You are connected to this spend experience. Session:{' '}
              <span className="font-mono text-xs">{session.id}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
