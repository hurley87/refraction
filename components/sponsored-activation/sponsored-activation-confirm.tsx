'use client';

import { ArrowRight, Loader2 } from 'lucide-react';
import { SponsoredActivationLandingHero } from '@/components/sponsored-activation/sponsored-activation-landing-hero';
import { SponsoredActivationDetailRow } from '@/components/sponsored-activation/sponsored-activation-detail-row';
import { SponsoredActivationPointsValue } from '@/components/sponsored-activation/sponsored-activation-points-value';
import { cn } from '@/lib/utils';
import type { SponsoredActivationPublicReadResponse } from '@/lib/sponsored-activation/public-read';

type SponsoredActivationConfirmProps = {
  read: SponsoredActivationPublicReadResponse;
  pending: boolean;
  onConfirm: () => void;
  /** Replaces the idle primary action label (default: "Pay With Points"). */
  primaryActionLabel?: string;
};

export function SponsoredActivationConfirm({
  read,
  pending,
  onConfirm,
  primaryActionLabel,
}: SponsoredActivationConfirmProps) {
  const { activation, rewardItem } = read;
  const description = rewardItem.description?.trim() || activation.sponsor_name;

  const perkValueLabel = rewardItem.perk_value_label?.trim();

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SponsoredActivationLandingHero
        heroImageUrl={rewardItem.hero_image_url}
        itemName={rewardItem.name}
      />

      <div className="flex flex-1 flex-col gap-6 px-4 pb-10 pt-4">
        <div className="flex flex-col gap-2">
          <h1 className="title3 font-medium text-[#171717]">
            {activation.title}
          </h1>
          {description ? (
            <p className="body-small font-grotesk text-[#757575]">
              {description}
            </p>
          ) : null}
          {perkValueLabel ? (
            <p className="label-small font-grotesk font-semibold uppercase tracking-wide text-[#a9a9a9]">
              {perkValueLabel}
            </p>
          ) : null}
        </div>

        <div className="w-full">
          <SponsoredActivationDetailRow
            label="You send"
            value={
              <SponsoredActivationPointsValue
                points={rewardItem.points_cost}
                suffix="PTS"
              />
            }
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
                : (primaryActionLabel ?? 'Pay With Points')}
            </span>
          </span>
          <ArrowRight className="size-6 shrink-0" strokeWidth={2} aria-hidden />
        </button>
      </div>
    </div>
  );
}
