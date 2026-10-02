const COLLECT_INSTRUCTIONS =
  "Swipe below and show this screen to the event staff. Swipe only when you're ready to purchase — once you've redeemed you can't redeem again!";

const REDEEMED_INSTRUCTIONS =
  'Show this screen to the event staff to collect your drink.';

const CADD_LEARN_MORE_URL = 'https://tetradg.com/cadd-stablecoin/';

type SponsoredActivationCollectInstructionsProps = {
  /** After redemption the swipe copy is replaced with simple staff instructions. */
  redeemed?: boolean;
};

export function SponsoredActivationCollectInstructions({
  redeemed = false,
}: SponsoredActivationCollectInstructionsProps) {
  return (
    <>
      <section className="border border-[#DBDBDB] bg-[#F7F7F7] p-3 max-[740px]:p-2">
        <p className="body-medium font-semibold text-[#171717] max-[740px]:text-sm max-[740px]:leading-snug">
          You just paid with CADD on Solana
        </p>
        <p className="body-small mt-1 text-[#454545] max-[740px]:text-xs max-[740px]:leading-snug">
          CADD is a Canadian-dollar stablecoin backed 1:1 by Canadian-dollar
          reserve assets.
        </p>
        <a
          href={CADD_LEARN_MORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="label-small mt-2 inline-flex items-center gap-1 font-semibold uppercase text-[#171717] underline decoration-[#171717]/40 underline-offset-[3px] transition-opacity hover:decoration-[#171717] hover:opacity-80 max-[740px]:mt-1"
        >
          Learn more
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            className="size-3.5 shrink-0"
            aria-hidden
          >
            <path
              d="M14.0822 4L11.8239 6.28605L16 10.1453H2V13.8547H15.9812L11.8239 17.7139L14.0822 20L22 11.9846L14.0822 4Z"
              fill="currentColor"
            />
          </svg>
        </a>
      </section>

      <section>
        <div className="label-large  uppercase tracking-wide text-[#000000]">
          How to Collect
        </div>
        <div className="body-medium mt-2 text-[#171717] max-[740px]:mt-1 max-[740px]:text-sm max-[740px]:leading-snug">
          {redeemed ? REDEEMED_INSTRUCTIONS : COLLECT_INSTRUCTIONS}
        </div>
      </section>
    </>
  );
}
