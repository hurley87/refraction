'use client';

import { Suspense, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { SponsoredActivationDetailRow } from '@/components/sponsored-activation/sponsored-activation-detail-row';
import { SponsoredActivationHeroDetailsCard } from '@/components/sponsored-activation/sponsored-activation-hero-details-card';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useCurrentPlayer } from '@/hooks/usePlayer';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useEvmWalletAddress } from '@/hooks/use-evm-wallet-address';
import { ANALYTICS_EVENTS } from '@/lib/analytics';
import { apiClient } from '@/lib/api/client';
import type { Perk } from '@/lib/types';

const CLAIM_STAFF_INSTRUCTIONS =
  'Show this screen to the staff to claim your perk.';

function formatClaimDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  }).format(date);
}

function ClaimSuccessInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const address = useEvmWalletAddress();
  const { trackEvent } = useAnalytics();
  const trackedRef = useRef(false);
  const pageViewTrackedRef = useRef(false);
  const claimShownAt = useMemo(() => new Date(), []);

  const perkId = searchParams.get('perkId') ?? '';
  const claimCountParam = searchParams.get('claimCount');
  const claimCountToday = claimCountParam
    ? Number.parseInt(claimCountParam, 10)
    : undefined;

  const { data: player } = useCurrentPlayer();
  const { data: profile } = useUserProfile(address);

  const {
    data: perk,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['perk', perkId],
    queryFn: async () => {
      const data = await apiClient<{ perk: Perk }>(`/api/perks/${perkId}`);
      return data.perk;
    },
    enabled: Boolean(perkId),
  });

  const displayName =
    profile?.name?.trim() ||
    profile?.username?.trim() ||
    player?.username?.trim() ||
    null;
  const displayEmail = profile?.email?.trim() || player?.email?.trim() || null;

  useEffect(() => {
    if (!perk?.id || pageViewTrackedRef.current) return;

    pageViewTrackedRef.current = true;
    trackEvent(ANALYTICS_EVENTS.IN_PERSON_CLAIM_PAGE_VIEWED, {
      reward_id: perk.id,
      perk_id: perk.id,
      perk_name: perk.title,
      perk_type: 'in_person',
      member_wallet_address: address || undefined,
      partner: perk.location || undefined,
      points_required: perk.points_threshold,
      ...(Number.isFinite(claimCountToday)
        ? { claim_count_today_for_member: claimCountToday }
        : {}),
    });
  }, [perk, claimCountToday, address, trackEvent]);

  useEffect(() => {
    if (!perk?.id || trackedRef.current) return;
    if (!Number.isFinite(claimCountToday) || (claimCountToday ?? 0) < 1) return;

    trackedRef.current = true;
    trackEvent(ANALYTICS_EVENTS.REWARD_CLAIM_COMPLETED, {
      reward_id: perk.id,
      perk_id: perk.id,
      perk_name: perk.title,
      perk_type: 'in_person',
      member_wallet_address: address || undefined,
      claim_count_today_for_member: claimCountToday,
      partner: perk.location || undefined,
      points_required: perk.points_threshold,
    });
  }, [perk, claimCountToday, address, trackEvent]);

  if (!perkId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6">
        <p className="body-medium text-[#4F4F4F]">Missing perk.</p>
        <Link
          href="/rewards"
          className="inline-flex items-center justify-center bg-[#131313] px-4 py-2 label-medium uppercase text-white"
        >
          Back to rewards
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="body-medium text-[#4F4F4F]">Loading…</p>
      </div>
    );
  }

  if (isError || !perk) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6">
        <p className="body-medium text-[#4F4F4F]">Perk not found.</p>
        <Link
          href="/rewards"
          className="inline-flex items-center justify-center bg-[#131313] px-4 py-2 label-medium uppercase text-white"
        >
          Back to rewards
        </Link>
      </div>
    );
  }

  const heroImageUrl =
    perk.hero_image?.trim() || perk.thumbnail_url?.trim() || null;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col bg-white">
      {/* Hero — matches sponsored-activation redeemed treatment */}
      <div className="relative left-1/2 min-h-[470px] w-screen -translate-x-1/2 shrink-0 overflow-hidden bg-neutral-100 [@media(max-height:700px)]:min-h-[52svh] md:left-auto md:w-full md:translate-x-0">
        {heroImageUrl ? (
          <Image
            src={heroImageUrl}
            alt={perk.title}
            fill
            className="z-0 object-cover"
            sizes="(max-width: 768px) 100vw, 420px"
            priority
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 bg-neutral-300" aria-hidden />
        )}

        <div
          aria-hidden
          className="absolute inset-0 z-[1] bg-[var(--Backgrounds-Highlight,#FFF200)] opacity-60"
        />
        <div
          aria-hidden
          className="absolute inset-0 z-[2] flex items-center justify-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="162"
            height="162"
            viewBox="0 0 162 162"
            fill="none"
            className="aspect-square"
          >
            <path
              d="M111.229 20.25L68.6177 114.563L49.7055 74.46L19.6172 74.2863L50.1606 135H59.644H80.4673H89.532L141.117 20.25H111.229Z"
              fill="white"
            />
          </svg>
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-24 bg-gradient-to-b from-black/40 to-transparent"
        />
        <nav className="absolute inset-x-0 top-[max(0.5rem,env(safe-area-inset-top))] z-10 flex h-[56px] items-center px-4">
          <Link
            href="/rewards"
            aria-label="Back to rewards"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm transition-opacity hover:opacity-90"
          >
            <Image
              src="/arrow-left.svg"
              alt=""
              width={20}
              height={20}
              aria-hidden
            />
          </Link>
        </nav>

        <SponsoredActivationHeroDetailsCard itemName={perk.title} />
      </div>

      <div className="flex flex-1 flex-col gap-4 px-4 pb-28 pt-4">
        <h1 className="title2 text-[#171717]">Success!</h1>

        <section>
          <div className="label-large uppercase tracking-wide text-[#000000]">
            How to Claim
          </div>
          <div className="mt-2 body-medium text-[#171717]">
            {CLAIM_STAFF_INSTRUCTIONS}
          </div>
        </section>

        <div>
          <SponsoredActivationDetailRow
            label="Claimed At"
            value={formatClaimDateTime(claimShownAt)}
          />
          {displayName ? (
            <SponsoredActivationDetailRow label="Name" value={displayName} />
          ) : null}
          {displayEmail ? (
            <SponsoredActivationDetailRow
              label="Email"
              value={<span className="break-all">{displayEmail}</span>}
            />
          ) : null}
          {perk.location ? (
            <SponsoredActivationDetailRow
              label="Location"
              value={perk.location}
            />
          ) : null}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#171717]/10 bg-white/95 px-4 py-4 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-[420px] md:max-w-lg">
          <button
            type="button"
            onClick={() => router.push('/rewards')}
            className="label-large flex h-12 w-full items-center justify-between gap-2 rounded-md bg-[#171717] px-4 font-grotesk uppercase tracking-wide text-white transition-opacity hover:opacity-95"
          >
            <span className="min-w-0 truncate whitespace-nowrap text-left">
              Back to rewards
            </span>
            <Image
              src="/home/arrow-right.svg"
              alt=""
              width={21}
              height={21}
              className="invert"
            />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClaimSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white">
          <p className="body-medium text-[#4F4F4F]">Loading…</p>
        </div>
      }
    >
      <ClaimSuccessInner />
    </Suspense>
  );
}
