import Image from 'next/image';
import Link from 'next/link';

import { cn } from '@/lib/utils';

/** Query tag so Mixpanel `$pageview` `search` can count these clicks. */
export const CITY_GUIDE_REWARDS_HREF = '/rewards?from=city-guide';

/**
 * Yellow highlight under a city guide's title and contributors, matching the
 * events page introduction bar, with a button to rewards.
 */
export function CityGuideRewardsBar({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        'flex w-full flex-col gap-3 bg-[var(--Backgrounds-Highlight,#FFF200)] px-[var(--sds-size-space-400)] py-[var(--sds-size-space-200)]',
        className
      )}
      aria-label="Rewards"
    >
      <div className="flex items-start gap-4">
        <h3 className="shrink-0 text-[#171717]">Rewards</h3>
        <p className="title6 min-w-0 flex-1 text-[#171717]">
          Free drinks, guest list, and hotel stays for members.
        </p>
      </div>
      <Link
        href={CITY_GUIDE_REWARDS_HREF}
        className="label-large flex h-11 min-h-[44px] w-full items-center justify-between bg-[#171717] px-[var(--sds-size-space-400)] py-[var(--sds-size-space-200)] uppercase text-white transition-opacity hover:opacity-90"
      >
        <span>Go to rewards</span>
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white"
          aria-hidden
        >
          <Image
            src="/right-arrow.svg"
            alt=""
            width={16}
            height={16}
            className="size-4 object-contain"
          />
        </span>
      </Link>
    </section>
  );
}
