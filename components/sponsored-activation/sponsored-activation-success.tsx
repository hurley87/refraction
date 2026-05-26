'use client';

import { ArrowLeft } from 'lucide-react';
import { SponsoredActivationDrawerHero } from '@/components/sponsored-activation/sponsored-activation-drawer-hero';
import { SponsoredActivationCollectInstructions } from '@/components/sponsored-activation/sponsored-activation-collect-instructions';
import { SponsoredActivationDetailRow } from '@/components/sponsored-activation/sponsored-activation-detail-row';
import { SponsoredActivationPointsValue } from '@/components/sponsored-activation/sponsored-activation-points-value';
import { SponsoredActivationSwipeSlider } from '@/components/sponsored-activation/sponsored-activation-swipe-slider';

type SponsoredActivationSuccessProps = {
  heroImageUrl: string | null;
  perkName: string;
  pointsSpent: number;
  balanceAfter: number;
  swipeDisabled: boolean;
  swipeSliderKey: number;
  redeemRequestSucceeded: boolean;
  onSwipeGestureStart?: () => void;
  onSwipeComplete: () => void;
  onBack: () => void;
};

export function SponsoredActivationSuccess({
  heroImageUrl,
  perkName,
  pointsSpent,
  balanceAfter,
  swipeDisabled,
  swipeSliderKey,
  redeemRequestSucceeded,
  onSwipeGestureStart,
  onSwipeComplete,
  onBack,
}: SponsoredActivationSuccessProps) {
  return (
    <div className="fixed inset-0 z-30 flex justify-center">
      <div
        className="absolute inset-0 bg-[#171717]/70 backdrop-blur-[16px]"
        aria-hidden
      />

      <div
        className="relative z-10 flex h-full w-full max-w-[420px] flex-col overflow-y-auto rounded-t-2xl bg-white shadow-[0_4px_16px_rgba(0,0,0,0.25)] md:max-w-lg"
        role="dialog"
        aria-labelledby="sponsored-activation-success-title"
      >
        <div
          className="mx-auto mt-2 h-[3px] w-8 shrink-0 rounded-full bg-[#a9a9a9]"
          aria-hidden
        />

        <button
          type="button"
          onClick={onBack}
          className="absolute left-3 top-3 z-20 flex size-10 items-center justify-center rounded-full border border-[#dbdbdb] bg-white shadow-sm transition-opacity hover:opacity-90"
          aria-label="Go back"
        >
          <ArrowLeft className="size-5 text-[#171717]" strokeWidth={2} />
        </button>

        <SponsoredActivationDrawerHero
          heroImageUrl={heroImageUrl}
          itemName={perkName}
        />

        <div className="flex flex-col gap-4 px-4 pb-8 pt-6">
          <h1
            id="sponsored-activation-success-title"
            className="title2 text-[#171717]"
          >
            Success!
          </h1>

          <div className="w-full">
            <SponsoredActivationDetailRow
              label="You Spent"
              value={
                <SponsoredActivationPointsValue
                  points={pointsSpent}
                  suffix="PTS"
                />
              }
              bareValue
              className="border-b-0"
            />
            <SponsoredActivationDetailRow
              label="Your Points Balance"
              value={
                <SponsoredActivationPointsValue
                  points={balanceAfter}
                  suffix="$IRL"
                />
              }
              bareValue
            />
          </div>

          <div className="pt-4">
            <SponsoredActivationCollectInstructions />
          </div>

          <SponsoredActivationSwipeSlider
            key={swipeSliderKey}
            disabled={swipeDisabled}
            redeemRequestSucceeded={redeemRequestSucceeded}
            onSwipeGestureStart={onSwipeGestureStart}
            onComplete={onSwipeComplete}
          />
        </div>
      </div>
    </div>
  );
}
