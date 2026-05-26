import { cn } from '@/lib/utils';

const COLLECT_INSTRUCTIONS =
  "Swipe below and show this screen to the event staff. Swipe only when you're ready to purchase — once you've redeemed you can't redeem again!";

const collectSectionClass =
  'text-[13px] font-grotesk leading-[1.25rem] text-[#171717]';

export function SponsoredActivationCollectInstructions() {
  return (
    <section>
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
