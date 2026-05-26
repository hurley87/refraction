'use client';

import { cn } from '@/lib/utils';

const COLLECT_INSTRUCTIONS =
  'Swipe below and show this screen to the event staff. Swipe only when you\u2019re ready to purchase \u2014 once you\u2019ve redeemed you can\u2019t redeem again!';

const collectSectionClass =
  'text-[13px] font-grotesk leading-[1.25rem] text-[#171717]';

type SponsoredActivationCollectInstructionsProps = {
  className?: string;
};

/** "How to collect" block — 13px title and body per Figma. */
export function SponsoredActivationCollectInstructions({
  className,
}: SponsoredActivationCollectInstructionsProps) {
  return (
    <section className={className}>
      <h2
        className={cn(
          collectSectionClass,
          'font-semibold uppercase tracking-wide text-[#757575]'
        )}
      >
        How to collect
      </h2>
      <p className={cn(collectSectionClass, 'mt-2')}>{COLLECT_INSTRUCTIONS}</p>
    </section>
  );
}
