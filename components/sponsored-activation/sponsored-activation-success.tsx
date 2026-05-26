'use client';

import { SponsoredActivationHero } from '@/components/sponsored-activation/sponsored-activation-hero';
import { SponsoredActivationDetailRow } from '@/components/sponsored-activation/sponsored-activation-detail-row';
import { SponsoredActivationSwipeSlider } from '@/components/sponsored-activation/sponsored-activation-swipe-slider';
import { formatActivationTierBadge } from '@/lib/sponsored-activation/tier-label';
import type { Tier } from '@/lib/types';

type SponsoredActivationSuccessProps = {
  heroImageUrl: string | null;
  perkName: string;
  pointsSpent: number;
  balanceAfter: number;
  tier: Tier | null;
  swipeDisabled: boolean;
  swipeSliderKey: number;
  onSwipeGestureStart?: () => void;
  onSwipeComplete: () => void;
};

export function SponsoredActivationSuccess({
  heroImageUrl,
  perkName,
  pointsSpent,
  balanceAfter,
  tier,
  swipeDisabled,
  swipeSliderKey,
  onSwipeGestureStart,
  onSwipeComplete,
}: SponsoredActivationSuccessProps) {
  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col bg-white">
      <SponsoredActivationHero
        heroImageUrl={heroImageUrl}
        itemName={perkName}
      />

      <div className="flex flex-1 flex-col gap-6 px-4 pb-8 pt-6">
        <div>
          <h1 className="title2 text-[#171717]">Success!</h1>
        </div>

        <div>
          <SponsoredActivationDetailRow
            label="You spent"
            value={`${pointsSpent.toLocaleString()} PTS`}
          />
          <SponsoredActivationDetailRow
            label="Balance"
            value={`${balanceAfter.toLocaleString()} PTS`}
          />
          {tier ? (
            <SponsoredActivationDetailRow
              label="Current tier"
              bareValue
              value={
                <span className="inline-block border border-[#171717] px-2.5 py-1 label-small font-grotesk font-semibold uppercase tracking-wide text-[#171717]">
                  {formatActivationTierBadge(tier)}
                </span>
              }
            />
          ) : null}
        </div>

        <section>
          <h2 className="label-small font-grotesk uppercase tracking-wide text-[#757575]">
            How to collect
          </h2>
          <p className="mt-2 body-medium font-grotesk leading-relaxed text-[#171717]">
            When you&apos;re ready, swipe below to redeem with staff. Show this
            screen at the venue to pick up{' '}
            <span className="font-semibold">{perkName}</span>.
          </p>
        </section>

        <SponsoredActivationSwipeSlider
          key={swipeSliderKey}
          disabled={swipeDisabled}
          onSwipeGestureStart={onSwipeGestureStart}
          onComplete={onSwipeComplete}
        />
      </div>
    </div>
  );
}
