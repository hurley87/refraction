const COLLECT_INSTRUCTIONS =
  "Swipe below and show this screen to the event staff. Swipe only when you're ready to purchase — once you've redeemed you can't redeem again!";

export function SponsoredActivationCollectInstructions() {
  return (
    <section>
      <h2 className="label-small font-grotesk uppercase tracking-wide text-[#757575]">
        How to Collect
      </h2>
      <p className="mt-2 body-small font-grotesk text-[#171717]">
        {COLLECT_INSTRUCTIONS}
      </p>
    </section>
  );
}
