'use client';

import Image from 'next/image';
import { SpendPrimaryButton } from '@/components/spend/spend-primary-button';
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
  const { rewardItem, activation } = read;
  const hero = rewardItem.hero_image_url;

  return (
    <div className="flex min-h-[70vh] flex-col">
      <div className="flex flex-1 flex-col gap-5 p-4 pb-36 md:p-6">
        <p className="body-small font-grotesk uppercase tracking-wide text-white/50">
          {activation.sponsor_name}
        </p>
        <h1 className="title2 text-white">{activation.title}</h1>

        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-md bg-white/5">
          {hero ? (
            <Image
              src={hero}
              alt={rewardItem.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 400px"
              unoptimized
            />
          ) : (
            <div className="flex h-full min-h-[200px] items-center justify-center body-medium font-grotesk text-white/35">
              {rewardItem.name}
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-md border border-white/10 bg-white/5 p-4">
          <div className="flex justify-between gap-3">
            <span className="body-small font-grotesk uppercase tracking-wide text-white/50">
              You send
            </span>
            <span className="body-medium font-grotesk font-semibold text-white">
              {rewardItem.points_cost.toLocaleString()} PTS
            </span>
          </div>
          <div className="flex justify-between gap-3 border-t border-white/10 pt-3">
            <span className="body-small font-grotesk uppercase tracking-wide text-white/50">
              You receive
            </span>
            <span className="body-medium font-grotesk font-semibold text-right text-white">
              {rewardItem.name}
            </span>
          </div>
          {accountEmail ? (
            <div className="flex justify-between gap-3 border-t border-white/10 pt-3">
              <span className="body-small font-grotesk text-white/50">
                Account
              </span>
              <span className="body-medium font-grotesk text-right text-white/90">
                {accountEmail}
              </span>
            </div>
          ) : null}
          <div className="flex justify-between gap-3 border-t border-white/10 pt-3">
            <span className="body-small font-grotesk text-white/50">
              Current points
            </span>
            <span className="body-medium font-grotesk text-white">
              {currentPoints.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-[#0a0a0a]/95 px-4 py-4 backdrop-blur-md md:px-8">
        <div className="mx-auto w-full max-w-[420px] md:max-w-lg">
          <SpendPrimaryButton pending={pending} onClick={onConfirm}>
            Confirm Purchase
          </SpendPrimaryButton>
        </div>
      </div>
    </div>
  );
}
