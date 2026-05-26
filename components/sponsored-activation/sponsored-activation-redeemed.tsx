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
  balanceAfter: number;
};

export function SponsoredActivationRedeemed({
  heroImageUrl,
  perkName,
  pointsSpent,
  balanceAfter,
}: SponsoredActivationRedeemedProps) {
  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col bg-white">
      <SponsoredActivationHero
        heroImageUrl={heroImageUrl}
        itemName={perkName}
      />

      <div className="flex flex-1 flex-col gap-6 px-4 pb-28 pt-6">
        <h1 className="title2 text-[#171717]">Success</h1>

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

        <SponsoredActivationCollectInstructions />
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#171717]/10 bg-white/95 px-4 py-4 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-[420px] md:max-w-lg">
          <SponsoredActivationCtaButton variant="redeemed" disabled>
            Redeemed
          </SponsoredActivationCtaButton>
        </div>
      </div>
    </div>
  );
}
