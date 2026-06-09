type SponsoredActivationHeroDetailsCardProps = {
  itemName: string;
  /** Optional unit count; rendered next to the title only when provided. */
  quantity?: number;
  pointsCost?: number;
  perkValueLabel?: string;
  /**
   * `receive` (default): "YOU RECEIVE" + item title — used on success/redeemed heroes.
   * `purchase`: item name + points cost, with USD value below — used pre-purchase
   * on the landing/confirm hero.
   */
  variant?: 'receive' | 'purchase';
};

/**
 * White card overlaid on the hero image. Must be rendered inside a `relative`
 * hero container.
 */
export function SponsoredActivationHeroDetailsCard({
  itemName,
  quantity,
  pointsCost,
  perkValueLabel,
  variant = 'receive',
}: SponsoredActivationHeroDetailsCardProps) {
  if (variant === 'purchase') {
    return (
      <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center px-4 pb-4">
        <div className="flex w-full max-w-[361px] flex-col items-center justify-end gap-2 bg-[var(--Backgrounds-Background,#FFF)] p-4">
          <div className="flex w-full items-center justify-between gap-2">
            <span className="title4 text-[#171717]">{itemName}</span>

            <div className="flex items-center justify-center gap-[var(--sds-size-space-050)] px-[var(--sds-size-space-100)] py-[var(--sds-size-space-050)]">
              <span className="label-medium text-[#171717]">
                {(pointsCost ?? 0).toLocaleString()}
              </span>
              <span className="label-small text-[#757575]">PTS</span>
            </div>
          </div>

          {perkValueLabel ? (
            <div className="w-full text-right">
              <span className="label-small uppercase text-[#A9A9A9]">
                {perkValueLabel}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center px-4 pb-4 ">
      <div className="flex w-full items-center justify-between bg-[var(--Backgrounds-Background,#FFF)] p-[var(--sds-size-space-200)]">
        <span className="label-medium uppercase text-[#757575]">
          You receive
        </span>

        <div className="flex items-center gap-1 text-right">
          <span className="title5 font-bold text-[#171717]">{itemName}</span>
          {quantity != null && (
            <span className="title5 text-[#757575]">{quantity}</span>
          )}
        </div>
      </div>
    </div>
  );
}
