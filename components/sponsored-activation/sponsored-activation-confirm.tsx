'use client';

import { SponsoredActivationHero } from '@/components/sponsored-activation/sponsored-activation-hero';
import { SponsoredActivationDetailRow } from '@/components/sponsored-activation/sponsored-activation-detail-row';
import { SponsoredActivationCtaButton } from '@/components/sponsored-activation/sponsored-activation-cta-button';
import type { SponsoredActivationPublicReadResponse } from '@/lib/sponsored-activation/public-read';

type SponsoredActivationConfirmProps = {
  read: SponsoredActivationPublicReadResponse;
  accountEmail: string | null;
  currentPoints: number;
  pending: boolean;
  onConfirm: () => void;
};

export function SponsoredActivationConfirm({
  read,
  accountEmail,
  currentPoints,
  pending,
  onConfirm,
}: SponsoredActivationConfirmProps) {
  const { rewardItem } = read;
  const pointsCost = rewardItem.points_cost;

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col bg-white">
      <SponsoredActivationHero
        heroImageUrl={rewardItem.hero_image_url}
        itemName={rewardItem.name}
      />

      <div className="flex flex-1 flex-col px-4 pb-28 pt-6">
        <h1 className="title2 text-[#171717]">Confirm Your Purchase</h1>

        <div className="mt-6">
          <SponsoredActivationDetailRow
            label="You send"
            value={`${pointsCost.toLocaleString()} PTS`}
          />
          <SponsoredActivationDetailRow
            label="Your account"
            value={accountEmail ?? 'Signed in'}
          />
          <SponsoredActivationDetailRow
            label="Current points"
            value={`${currentPoints.toLocaleString()} PTS`}
            subValue={`-${pointsCost.toLocaleString()}`}
          />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#171717]/10 bg-white/95 px-4 py-4 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-[420px] md:max-w-lg">
          <SponsoredActivationCtaButton
            variant="confirm"
            pending={pending}
            onClick={onConfirm}
          >
            Confirm Purchase
          </SponsoredActivationCtaButton>
        </div>
      </div>
    </div>
  );
}
