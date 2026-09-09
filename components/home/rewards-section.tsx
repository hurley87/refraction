import Link from 'next/link';
import Image from 'next/image';

import { WelcomeEllipse } from '@/components/shared/welcome-ellipse';
import { getAllPerks } from '@/lib/db/perks';
import { pickHomepagePerks } from '@/lib/home/homepage-perks';
import type { Perk } from '@/lib/types';

const FALLBACK_PERK_IMAGE = '/homepage/earn-spend.png';

const DESKTOP_GRID_PERKS = 4;

const ARROW_PATH =
  'M14.0822 4L11.8239 6.28605L16 10.1453H2V13.8547H15.9812L11.8239 17.7139L14.0822 20L22 11.9846L14.0822 4Z';

function perkHref(perk: Perk): string {
  return perk.id ? `/rewards?perkId=${perk.id}` : '/rewards';
}

function perkImage(perk: Perk): string {
  return perk.thumbnail_url || perk.hero_image || FALLBACK_PERK_IMAGE;
}

function ViewAllRewardsButton({ className }: { className?: string }) {
  return (
    <Link href="/rewards" className={className}>
      <span className="label-large flex h-11 min-h-[44px] w-full cursor-pointer items-center justify-between bg-[#454545] px-[var(--sds-size-space-400)] py-[var(--sds-size-space-200)] uppercase text-white">
        <span className="whitespace-nowrap">View All Rewards</span>
        <svg
          width={24}
          height={24}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0"
          aria-hidden
        >
          <path d={ARROW_PATH} fill="currentColor" />
        </svg>
      </span>
    </Link>
  );
}

function ReadMore({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex h-6 items-center gap-[var(--sds-size-space-200)] border-b border-solid border-[#FFF] ${className ?? ''}`}
    >
      <span className="label-medium uppercase text-white">Read More</span>
      <svg
        width={16}
        height={16}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4 shrink-0"
        aria-hidden
      >
        <path d={ARROW_PATH} fill="#FFFFFF" />
      </svg>
    </span>
  );
}

/**
 * Homepage Rewards grid — featured perk plus a small set of latest perks.
 */
export default async function RewardsSection() {
  let perks: Perk[] = [];
  try {
    perks = pickHomepagePerks((await getAllPerks(true)) ?? []);
  } catch (error) {
    console.error('Failed to load perks for homepage:', error);
  }

  const heroPerk = perks[0];
  const carouselPerks = perks.slice(1);
  /** The desktop grid is a fixed-height 2×2, so it takes fewer than mobile. */
  const desktopGridPerks = carouselPerks.slice(0, DESKTOP_GRID_PERKS);

  return (
    <section className="mx-auto flex w-full flex-col items-center self-stretch overflow-hidden bg-[#131313]">
      <div className="flex w-full max-w-[393px] flex-col items-center gap-8 px-4 pt-16 pb-12 xl:hidden">
        <div className="flex w-full max-w-[361px] flex-col items-start">
          <div className="flex w-full items-center gap-2">
            <WelcomeEllipse />
            <h2 className="title4 text-left text-white">IRL Picks</h2>
          </div>
          <div className="flex items-center gap-2 self-stretch py-4">
            <div className="title1 text-left font-normal text-white">
              Membership unlocks the world of IRL.
            </div>
          </div>
        </div>

        {heroPerk ? (
          <Link href={perkHref(heroPerk)} className="w-full">
            <div className="relative aspect-square w-full overflow-hidden bg-[#1a1a1a]">
              <Image
                src={perkImage(heroPerk)}
                alt={heroPerk.title}
                fill
                className="object-cover"
                sizes="393px"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-3 p-4">
                <span className="title2 text-left text-white">
                  {heroPerk.title}
                </span>
                <ReadMore />
              </div>
            </div>
          </Link>
        ) : null}

        {carouselPerks.length > 0 ? (
          <div className="flex w-full snap-x snap-mandatory items-stretch gap-[21px] overflow-x-auto pb-6 scrollbar-hide">
            {carouselPerks.map((perk) => (
              <Link
                key={perk.id}
                href={perkHref(perk)}
                className="flex w-[214px] shrink-0 snap-start flex-col gap-4"
              >
                <div className="relative aspect-square w-[214px] overflow-hidden bg-[#1a1a1a]">
                  <Image
                    src={perkImage(perk)}
                    alt={perk.title}
                    fill
                    className="object-cover"
                    sizes="214px"
                  />
                </div>
                <span className="title4 text-left text-white">
                  {perk.title}
                </span>
                <div className="mt-auto">
                  <ReadMore />
                </div>
              </Link>
            ))}
          </div>
        ) : null}

        <ViewAllRewardsButton className="inline-flex w-full max-w-[361px]" />
      </div>

      <div className="hidden h-[1080px] w-full items-center justify-center gap-8 self-stretch px-[var(--sds-size-space-0)] py-[120px] xl:flex">
        <div className="flex h-[708px] flex-col items-start gap-2">
          <div className="flex h-[270px] w-[460px] shrink-0 flex-col items-start">
            <div className="flex items-center gap-2">
              <WelcomeEllipse />
              <h2 className="title4 text-left text-white">IRL Picks</h2>
            </div>
            <p className="title0 text-left text-white">
              Membership unlocks the world of IRL.
            </p>
          </div>
          <ViewAllRewardsButton className="inline-flex w-[243px] shrink-0" />
        </div>

        {heroPerk ? (
          <Link
            href={perkHref(heroPerk)}
            className="flex h-[709px] w-[460px] shrink-0 flex-col items-start gap-2"
          >
            <div className="relative h-[577px] w-[460px] shrink-0 overflow-hidden bg-[#1a1a1a]">
              <Image
                src={perkImage(heroPerk)}
                alt={heroPerk.title}
                fill
                className="object-cover"
                sizes="460px"
              />
            </div>
            <span className="title2 text-left text-white">
              {heroPerk.title}
            </span>
            <ReadMore className="w-[99px]" />
          </Link>
        ) : null}

        {desktopGridPerks.length > 0 ? (
          <div className="flex h-[710px] w-[460px] shrink-0 flex-wrap content-start items-start gap-[var(--sds-size-space-800)] pb-[var(--sds-size-space-600)]">
            {desktopGridPerks.map((perk) => (
              <Link
                key={perk.id}
                href={perkHref(perk)}
                className="flex w-[214px] shrink-0 flex-col items-start gap-4"
              >
                <div className="relative aspect-square h-[214px] self-stretch overflow-hidden bg-[#1a1a1a]">
                  <Image
                    src={perkImage(perk)}
                    alt={perk.title}
                    fill
                    className="object-cover"
                    sizes="214px"
                  />
                </div>
                <span className="title3 text-left text-white">
                  {perk.title}
                </span>
                <ReadMore />
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
