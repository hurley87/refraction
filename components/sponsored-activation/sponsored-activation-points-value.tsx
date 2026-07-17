import { cn } from '@/lib/utils';

type SponsoredActivationPointsValueProps = {
  points: number;
  suffix?: 'PTS' | '$IRL' | 'CADD';
  className?: string;
};

export function SponsoredActivationPointsValue({
  points,
  suffix = 'PTS',
  className,
}: SponsoredActivationPointsValueProps) {
  return (
    <span
      className={cn(
        'inline-flex items-baseline justify-end gap-1 font-grotesk',
        className
      )}
    >
      <span className="title5 font-semibold text-[#171717]">
        {points.toLocaleString()}
      </span>
      <span className="title5 font-semibold uppercase text-[#757575]">
        {suffix}
      </span>
    </span>
  );
}
