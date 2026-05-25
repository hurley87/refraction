'use client';

import { SpendPrimaryButton } from '@/components/spend/spend-primary-button';

type SponsoredActivationSuccessProps = {
  pointsSpent: number;
  balanceAfter: number;
  tierTitle: string | null;
  perkName: string;
  onContinueToSwipe: () => void;
};

export function SponsoredActivationSuccess({
  pointsSpent,
  balanceAfter,
  tierTitle,
  perkName,
  onContinueToSwipe,
}: SponsoredActivationSuccessProps) {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <p className="body-small font-grotesk uppercase tracking-wide text-emerald-400/90">
          Success!
        </p>
        <h1 className="mt-2 title2 text-white">You&apos;re almost there</h1>
      </div>

      <div className="space-y-3 rounded-md border border-white/10 bg-white/5 p-4">
        <div className="flex justify-between gap-3">
          <span className="body-small font-grotesk uppercase tracking-wide text-white/50">
            You spent
          </span>
          <span className="body-medium font-grotesk font-semibold text-white">
            {pointsSpent.toLocaleString()} PTS
          </span>
        </div>
        <div className="flex justify-between gap-3 border-t border-white/10 pt-3">
          <span className="body-small font-grotesk text-white/50">Balance</span>
          <span className="body-medium font-grotesk text-white">
            {balanceAfter.toLocaleString()} PTS
          </span>
        </div>
        {tierTitle ? (
          <div className="flex justify-between gap-3 border-t border-white/10 pt-3">
            <span className="body-small font-grotesk text-white/50">Tier</span>
            <span className="body-medium font-grotesk text-white">
              {tierTitle}
            </span>
          </div>
        ) : null}
      </div>

      <div className="rounded-md border border-emerald-500/25 bg-emerald-500/10 p-4">
        <h2 className="body-medium font-grotesk font-semibold text-white">
          How to collect
        </h2>
        <p className="mt-2 body-medium font-grotesk text-white/80">
          Show this screen on your phone at the venue to pick up{' '}
          <span className="font-semibold text-white">{perkName}</span>.
        </p>
      </div>

      <SpendPrimaryButton type="button" onClick={onContinueToSwipe}>
        Swipe to redeem at venue
      </SpendPrimaryButton>
    </div>
  );
}
