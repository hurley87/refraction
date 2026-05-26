type SponsoredActivationHeroReceiveBarProps = {
  itemName: string;
};

/** Bottom "You receive" strip shared by page and drawer activation heroes. */
export function SponsoredActivationHeroReceiveBar({
  itemName,
}: SponsoredActivationHeroReceiveBarProps) {
  return (
    <div
      className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between gap-3 border-t border-white/40 bg-white/85 px-4 py-4 backdrop-blur-md supports-[backdrop-filter]:bg-white/75"
      role="group"
      aria-label="You receive"
    >
      <span className="label-small font-grotesk uppercase tracking-wide text-[#757575]">
        You receive
      </span>
      <span className="label-small max-w-[55%] truncate text-right font-grotesk font-semibold uppercase tracking-wide text-[#171717]">
        {itemName}
      </span>
    </div>
  );
}
