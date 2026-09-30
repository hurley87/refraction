'use client';

import { SponsoredActivationHero } from '@/components/sponsored-activation/sponsored-activation-hero';
import { SponsoredActivationCollectInstructions } from '@/components/sponsored-activation/sponsored-activation-collect-instructions';
import { SponsoredActivationDetailRow } from '@/components/sponsored-activation/sponsored-activation-detail-row';
import { SponsoredActivationPointsValue } from '@/components/sponsored-activation/sponsored-activation-points-value';
import { SponsoredActivationCtaButton } from '@/components/sponsored-activation/sponsored-activation-cta-button';

type SponsoredActivationRedeemedProps = {
  heroImageUrl: string | null;
  perkName: string;
  pointsSpent: number;
};

export function SponsoredActivationRedeemed({
  heroImageUrl,
  perkName,
  pointsSpent,
}: SponsoredActivationRedeemedProps) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-white">
      <SponsoredActivationHero
        heroImageUrl={heroImageUrl}
        itemName={perkName}
        redeemed
      />

      <div className="flex shrink-0 flex-col gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 max-[740px]:gap-2">
        <h1 className="title2 text-[#171717]">Success!</h1>

        <div>
          <SponsoredActivationDetailRow
            label="You Spent"
            value={
              <SponsoredActivationPointsValue
                points={pointsSpent}
                suffix="PTS"
              />
            }
            bareValue
            className="max-[740px]:py-1.5"
          />
          <SponsoredActivationDetailRow
            label="YOU SWAPPED"
            value={<SponsoredActivationPointsValue points={5} suffix="CADD" />}
            bareValue
            className="max-[740px]:py-1.5"
          />
        </div>

        <SponsoredActivationCollectInstructions redeemed />

        <SponsoredActivationCtaButton variant="redeemed" disabled>
          Redeemed
        </SponsoredActivationCtaButton>
      </div>
    </div>
  );
}
