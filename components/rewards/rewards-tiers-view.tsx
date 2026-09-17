'use client';

import Link from 'next/link';
import { useTiers } from '@/hooks/useTiers';
import { useCurrentPlayer } from '@/hooks/usePlayer';
import {
  formatTierPointRange,
  resolveTierForPoints,
  sortTiersByMinPoints,
} from '@/lib/tier-for-points';
import { cn } from '@/lib/utils';

export type RewardsTab = 'rewards' | 'tiers';

export const REWARDS_INTRO = {
  title: 'Rewards',
  body: 'Curated perks from our partners across the IRL Venue Network. From free drinks to hotel stays to guest list spots, we got you.',
} as const;

export const TIERS_INTRO = {
  title: 'Tiers',
  body: 'Check in to earn points and climb. Each tier unlocks better perks from the IRL network.',
} as const;

export function RewardsViewTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: RewardsTab;
  onTabChange: (tab: RewardsTab) => void;
}) {
  return (
    <nav
      className="flex items-center gap-4 border-b border-[#DBDBDB] pt-3"
      aria-label="Rewards views"
      role="tablist"
    >
      {(
        [
          { id: 'rewards', label: 'Rewards' },
          { id: 'tiers', label: 'Tiers' },
        ] as const
      ).map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'label-small pb-2 uppercase tracking-wide transition-colors',
              isActive
                ? 'border-b-2 border-[#171717] text-[#171717]'
                : 'border-b-2 border-transparent text-[#757575]'
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}

export default function RewardsTiersView() {
  const { data: tiers = [], isLoading } = useTiers();
  const { data: player } = useCurrentPlayer();
  const totalPoints = player?.total_points ?? 0;
  const currentTier = resolveTierForPoints(tiers, totalPoints);
  const orderedTiers = sortTiersByMinPoints(tiers);

  if (isLoading) {
    return (
      <div className="space-y-3 py-4">
        {[0, 1, 2].map((key) => (
          <div
            key={key}
            className="h-24 w-full animate-pulse rounded-2xl bg-gray-100"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-4">
      <ol className="flex flex-col gap-3">
        {orderedTiers.map((tier) => {
          const isCurrent = currentTier?.id === tier.id;
          return (
            <li
              key={tier.id}
              className={cn(
                'flex flex-col gap-2 border p-4',
                isCurrent ? 'border-[#171717] bg-[#FFF]' : 'border-[#EDEDED]'
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="min-w-0 text-left text-[#171717]">
                  {tier.title}
                </h3>
                <span className="label-small shrink-0 font-semibold normal-case tracking-normal text-[#171717]">
                  {formatTierPointRange(tier)}
                </span>
              </div>
              {isCurrent ? (
                <p className="label-small text-[#757575]">YOUR TIER</p>
              ) : null}
              {tier.description ? (
                <p className="body-small text-left leading-tight text-[#757575]">
                  {tier.description}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>

      <section className="flex flex-col gap-3 border-t border-[#DBDBDB] pt-4">
        <h3 className="label-small font-semibold uppercase tracking-wide text-[#757575]">
          How to earn points
        </h3>
        <p className="body-small leading-tight text-[#757575]">
          You earn IRL Points by checking into participating venues, attending
          eligible events, and completing activities in the app.
        </p>
        <div className="flex flex-col gap-2">
          <Link
            href="/interactive-map"
            className="label-small font-semibold normal-case tracking-normal text-[#171717] underline-offset-2 hover:underline"
          >
            Check in on the map
          </Link>
          <Link
            href="/faq#earn-points"
            className="label-small font-semibold normal-case tracking-normal text-[#171717] underline-offset-2 hover:underline"
          >
            How points are earned
          </Link>
        </div>
      </section>
    </div>
  );
}
