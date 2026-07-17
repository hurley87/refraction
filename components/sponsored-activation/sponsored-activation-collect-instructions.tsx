const COLLECT_INSTRUCTIONS =
  "Swipe below and show this screen to the event staff. Swipe only when you're ready to purchase — once you've redeemed you can't redeem again!";

const REDEEMED_INSTRUCTIONS = 'Thanks for spending CADD stablecoin on Tempo with IRL! Show this screen to the event staff to collect your drink.';

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
      <div className="mt-2 body-medium  text-[#171717]">
        {redeemed ? REDEEMED_INSTRUCTIONS : COLLECT_INSTRUCTIONS}
      </div>
    </section>
  );
}
