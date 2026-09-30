const COLLECT_INSTRUCTIONS =
  "Swipe below and show this screen to the event staff. Swipe only when you're ready to purchase — once you've redeemed you can't redeem again!";

const REDEEMED_INSTRUCTIONS =
  'Show this screen to the event staff to collect your drink.';

type SponsoredActivationCollectInstructionsProps = {
  /** After redemption the swipe copy is replaced with simple staff instructions. */
  redeemed?: boolean;
};

export function SponsoredActivationCollectInstructions({
  redeemed = false,
}: SponsoredActivationCollectInstructionsProps) {
  return (
    <section>
      <div className="label-large  uppercase tracking-wide text-[#000000]">
        How to Collect
      </div>
      <div className="body-medium mt-2 text-[#171717] max-[740px]:mt-1 max-[740px]:text-sm max-[740px]:leading-snug">
        {redeemed ? REDEEMED_INSTRUCTIONS : COLLECT_INSTRUCTIONS}
      </div>
    </section>
  );
}
