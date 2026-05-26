'use client';

import { SponsoredActivationHero } from '@/components/sponsored-activation/sponsored-activation-hero';
import { SponsoredActivationDetailRow } from '@/components/sponsored-activation/sponsored-activation-detail-row';
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
    <div className="flex min-h-[calc(100vh-5rem)] flex-col bg-white">
      <SponsoredActivationHero
        heroImageUrl={heroImageUrl}
        itemName={perkName}
      />

      <div className="flex flex-1 flex-col px-4 pb-28 pt-6">
        <h1 className="title2 text-[#171717]">All set</h1>
        <p className="mt-2 body-medium font-grotesk text-[#757575]">
          Your perk is redeemed. Show this screen if staff asks for
          confirmation.
        </p>

        <div className="mt-6">
          <SponsoredActivationDetailRow
            label="You spent"
            value={`${pointsSpent.toLocaleString()} PTS`}
          />
          <SponsoredActivationDetailRow label="Status" value="Redeemed" />
        </div>
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
