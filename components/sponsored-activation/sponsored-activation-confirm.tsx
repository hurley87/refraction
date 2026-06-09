'use client';

import { Loader2, Trophy } from 'lucide-react';
import { SponsoredActivationLandingHero } from '@/components/sponsored-activation/sponsored-activation-landing-hero';
import { SponsoredActivationDetailRow } from '@/components/sponsored-activation/sponsored-activation-detail-row';
import { SponsoredActivationPointsValue } from '@/components/sponsored-activation/sponsored-activation-points-value';
import { cn } from '@/lib/utils';
import { resolveSponsoredActivationDescription } from '@/lib/sponsored-activation/public-read-display';
import type { SponsoredActivationPublicReadResponse } from '@/lib/sponsored-activation/public-read';

type SponsoredActivationConfirmProps = {
  read: SponsoredActivationPublicReadResponse;
  pending: boolean;
  onConfirm: () => void;
  /** Replaces the idle primary action label (default: "Pay With Points"). */
  primaryActionLabel?: string;
  /** Player's current points balance, shown in the breakdown. */
  currentPoints: number;
  /** Account identifier (email) shown in the breakdown. */
  accountEmail?: string;
};

export function SponsoredActivationConfirm({
  read,
  pending,
  onConfirm,
  primaryActionLabel,
  currentPoints,
  accountEmail,
}: SponsoredActivationConfirmProps) {
  const { rewardItem } = read;
  const description = resolveSponsoredActivationDescription(read);
  const pointsCost = rewardItem.points_cost;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SponsoredActivationLandingHero
        heroImageUrl={rewardItem.hero_image_url}
        itemName={rewardItem.name}
        pointsCost={rewardItem.points_cost}
        perkValueLabel={rewardItem.perk_value_label}
        detailsVariant="receive"
      />

      <div className="flex flex-1 flex-col gap-6 px-4 pb-10 pt-4">
        <div className="flex flex-col gap-2">
          <h1 className="title2 text-[#171717]">CONFIRM YOUR PURCHASE</h1>
          {description ? (
            <div className="body-small text-[#757575]">{description}</div>
          ) : null}
        </div>

        <div className="w-full">
          <SponsoredActivationDetailRow
            label="You Send"
            value={
              <SponsoredActivationPointsValue
                points={pointsCost}
                suffix="PTS"
              />
            }
            bareValue
          />
          <SponsoredActivationDetailRow
            label="You Receive"
            value={rewardItem.name}
          />
          <SponsoredActivationDetailRow
            label="Your Account"
            value={accountEmail ?? '—'}
          />
          <SponsoredActivationDetailRow
            label="Current Points"
            value={
              <SponsoredActivationPointsValue
                points={currentPoints}
                suffix="PTS"
              />
            }
            subValue={`-${pointsCost.toLocaleString()} PTS`}
            bareValue
          />
        </div>

        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className={cn(
            'label-large flex h-11 w-full items-center justify-between gap-2 rounded-md bg-[#171717] px-4 font-grotesk uppercase tracking-[0.0625em] text-white transition-opacity',
            'hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2">
            {pending ? (
              <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
            ) : null}
            <span className="truncate text-left">
              {pending
                ? 'Processing…'
                : (primaryActionLabel ?? 'CONFIRM YOUR PURCHASE')}
            </span>
          </span>
          <Trophy className="size-6 shrink-0" strokeWidth={2} aria-hidden />
        </button>
      </div>
    </div>
  );
}
