import { cn } from '@/lib/utils';

type SponsoredActivationHeroReceiveBarProps = {
  itemName: string;
  /** Extra horizontal inset when the hero uses full-bleed negative margins (e.g. drawer). */
  className?: string;
};

export function SponsoredActivationHeroReceiveBar({
  itemName,
  className,
}: SponsoredActivationHeroReceiveBarProps) {
  return (
    <div
      className={cn(
        'absolute inset-x-0 bottom-0 z-10 flex items-center justify-between gap-3 border-t border-[#171717]/10 bg-white px-4 py-4',
        className
      )}
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
