'use client';

import { SponsoredActivationHero } from '@/components/sponsored-activation/sponsored-activation-hero';
import { SponsoredActivationCollectInstructions } from '@/components/sponsored-activation/sponsored-activation-collect-instructions';
import { SponsoredActivationDetailRow } from '@/components/sponsored-activation/sponsored-activation-detail-row';
import { SponsoredActivationSwipeSlider } from '@/components/sponsored-activation/sponsored-activation-swipe-slider';

type SponsoredActivationSuccessProps = {
  heroImageUrl: string | null;
  perkName: string;
  pointsSpent: number;
  balanceAfter: number;
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
        <h1 className="title2 text-[#171717]">Success</h1>

        <div>
          <SponsoredActivationDetailRow
            label="You spent"
            value={`${pointsSpent.toLocaleString()} PTS`}
          />
          <SponsoredActivationDetailRow
            label="Your points balance"
            value={`${balanceAfter.toLocaleString()} $IRL`}
          />
        </div>

        <SponsoredActivationCollectInstructions />

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
