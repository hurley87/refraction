'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ProfileAvatar from '@/components/profile-avatar';
import { cn } from '@/lib/utils';

const MALCOLM_LEVY_USERNAME = 'malcolm_levy';

export type MapWelcomeTourStep =
  | 'intro'
  | 'page1'
  | 'page2'
  | 'page3'
  | 'page4';

type MapWelcomeTourProps = {
  open: boolean;
  onComplete: () => void;
  className?: string;
};

const TOUR_STEPS: MapWelcomeTourStep[] = [
  'intro',
  'page1',
  'page2',
  'page3',
  'page4',
];

/** Full-bleed on mobile; 393px centered rail on md+ until a desktop tour exists. */
const TOUR_FRAME_CLASS =
  'pointer-events-none relative mx-auto h-dvh w-full overflow-hidden md:max-w-[393px]';

const TOUR_STEP_SHELL_CLASS =
  'pointer-events-auto absolute inset-0 z-40 h-full w-full cursor-pointer overflow-hidden bg-black';

function TourArrowIcon({
  className,
  fill = '#DBDBDB',
}: {
  className?: string;
  fill?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        'block size-11 max-w-none shrink-0 aspect-square',
        className
      )}
      aria-hidden
    >
      <path
        d="M14.0822 4L11.8239 6.28605L16 10.1453H2V13.8547H15.9812L11.8239 17.7139L14.0822 20L22 11.9846L14.0822 4Z"
        fill={fill}
      />
    </svg>
  );
}

function IntroStep({ onContinue }: { onContinue: () => void }) {
  const [profilePictureUrl, setProfilePictureUrl] = useState<
    string | undefined
  >();

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(
          `/api/profile?username=${encodeURIComponent(MALCOLM_LEVY_USERNAME)}`
        );
        if (!response.ok) return;
        const result = await response.json();
        const profile = result.data ?? result;
        const url =
          typeof profile.profile_picture_url === 'string'
            ? profile.profile_picture_url.trim()
            : '';
        if (!cancelled && url) setProfilePictureUrl(url);
      } catch {
        // Initials fallback when the IRL photo cannot be loaded.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className={cn(
        'pointer-events-auto absolute left-2 right-2 top-[53px] z-30 flex w-auto flex-col items-center gap-[var(--sds-size-space-600)] bg-[var(--Backgrounds-Background,#FFF)] px-[var(--sds-size-space-400)] pb-[var(--sds-size-space-400)] pt-10 shadow-[0_4px_16px_0_rgba(0,0,0,0.25)] backdrop-blur-[232px]'
      )}
    >
      <div className="flex w-full flex-col items-center gap-[var(--sds-size-space-200)] self-stretch">
        <div className="flex w-full flex-col items-start gap-4 self-stretch">
          <h2 className="title2 text-[#171717]">Welcome to IRL</h2>
        </div>

        <div className="flex w-full flex-col items-start self-stretch">
          <Link
            href={`/${MALCOLM_LEVY_USERNAME}`}
            className="mb-[var(--sds-size-space-200)] rounded-full transition-opacity hover:opacity-80"
            aria-label="View Malcolm Levy's profile"
            onClick={(event) => event.stopPropagation()}
          >
            <ProfileAvatar
              profilePictureUrl={profilePictureUrl}
              name="Malcolm Levy"
              username={MALCOLM_LEVY_USERNAME}
              size={48}
            />
          </Link>
          <p className="title5-bold text-[#000000]">Hi, I&apos;m Malcolm.</p>
          <p className="body-medium mt-[var(--sds-size-space-200)] text-[#171717]">
            IRL is a network of 2,000+ artists, DJs, venues and cultural spaces
            building infrastructure for independent culture around the world.
            <br />
            <br />
            Every check-in helps flow value back to the places and people where
            culture actually happens. Earn points, discover new places, and get
            rewards at the bars, clubs, galleries and spaces we work with.
          </p>
          <p className="title5-bold  mt-[var(--sds-size-space-200)] text-[#000000]">
            Have fun out there.
          </p>
        </div>

        <div className="flex w-full flex-col items-end gap-[var(--sds-size-space-200)]">
          <button
            type="button"
            onClick={onContinue}
            className="flex h-11 w-full items-center justify-between bg-[var(--Dark-Tint-100---Ink-Black,#171717)] px-4 py-2 transition-colors hover:bg-black"
          >
            <span className="label-medium label-large uppercase text-white">
              Get Started
            </span>
            <TourArrowIcon fill="#FFFFFF" className="!size-6" />
          </button>
        </div>
      </div>
    </div>
  );
}

function TourLogoMark({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={110}
      height={110}
      viewBox="0 0 110 110"
      fill="none"
      className={cn('size-[110px] shrink-0', className)}
      aria-hidden
    >
      <g opacity="0.36" style={{ mixBlendMode: 'multiply' }}>
        <path
          d="M108.454 47.9233C102.518 34.6673 83.6213 28.1504 70.2565 26.0835C53.6309 23.5094 34.5788 24.9927 19.2097 32.1626C12.2451 35.4107 5.56444 40.0795 1.98178 47.0201C-0.780496 52.3698 -0.638574 58.3899 2.3037 63.6424C5.90367 70.0724 12.6294 74.7586 19.2201 77.8398C40.4564 87.775 72.1845 87.6013 93.0366 76.7317C99.2362 73.501 105.778 68.3841 108.582 61.829C110.517 57.3026 110.469 52.4219 108.454 47.9233Z"
          fill="#171717"
        />
      </g>
      <path
        d="M108.454 47.9214C102.518 34.6653 83.6213 28.1484 70.2565 26.0815C53.6309 23.5074 34.5788 24.9907 19.2097 32.1607C12.2451 35.4087 5.56444 40.0775 1.98178 47.0182C-0.780496 52.3679 -0.638574 58.388 2.3037 63.6404C5.90367 70.0704 12.6294 74.7566 19.2201 77.8379C40.4564 87.773 72.1845 87.5993 93.0366 76.7297C99.2362 73.4991 105.778 68.3822 108.582 61.8271C110.517 57.3007 110.469 52.42 108.454 47.9214ZM35.3853 41.9812C34.0838 43.2943 32.4984 43.8397 30.6257 44.3781C30.3557 44.4545 30.3384 44.8366 30.6015 44.9339C31.7022 45.3473 32.7372 45.6704 33.6165 46.4033C34.4472 47.0981 35.1914 48.2653 35.0184 49.3978L32.9795 62.6608C32.1903 67.8055 20.4766 71.5329 15.5336 66.4334C14.3255 65.1863 14.0867 63.5883 14.5505 61.9869L18.2232 49.3109C18.4031 48.696 19.0539 47.8832 19.4901 47.4733C20.9647 46.0837 22.6677 45.5106 24.5577 44.9443C24.8692 44.8505 24.8831 44.4163 24.5819 44.3017C23.6127 43.9334 22.7646 43.6312 22.0447 43.0928C20.6047 42.0194 20.3624 40.2095 21.522 38.8478C24.8796 34.9085 34.0111 34.7487 36.1607 38.483C36.8703 39.7162 36.2922 41.0571 35.3818 41.9777L35.3853 41.9812ZM70.9557 51.1729C70.5715 52.281 69.5295 53.2884 68.4426 53.8199C64.77 55.6159 60.7581 55.4769 56.8328 53.5212C56.5178 53.3649 56.1508 53.5941 56.1508 53.945L56.1162 62.7442C56.0989 67.1629 46.9259 71.3558 40.1968 67.1177C38.6149 66.1207 37.3549 64.356 37.5833 62.5253L39.2552 49.0608C39.4422 47.5462 41.2248 46.3894 42.4952 45.7885C46.1575 44.0516 51.1767 44.1419 54.5655 46.7542C54.8735 46.9939 55.3028 46.9904 55.6143 46.7542C59.37 43.8709 65.4657 44.0307 69.0657 46.5874C70.5715 47.6574 71.5891 49.3352 70.9557 51.1694V51.1729ZM92.7631 67.6839C86.0998 70.9354 77.6779 66.7495 76.9752 62.7719L72.5168 39.5252C72.0703 36.9997 78.6368 34.1442 84.8225 36.8851C85.9994 37.4061 87.5328 38.3371 87.9517 39.6745L95.5323 62.7476C96.145 64.6999 94.6047 66.7877 92.7631 67.6874V67.6839Z"
        fill="white"
      />
    </svg>
  );
}

/**
 * Full-bleed tour image step within the mobile frame (design ref ~393×852).
 * Tap anywhere to advance.
 */
function Page1Step({ onContinue }: { onContinue: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onContinue}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onContinue();
        }
      }}
      aria-label="Continue tour"
      className={TOUR_STEP_SHELL_CLASS}
    >
      <Image
        src="/map/tour/tour-page-1.png"
        alt=""
        fill
        priority
        sizes="393px"
        className="origin-top-left object-cover object-left-top scale-[1.3]"
      />

      {/* Lower-half overlay: logo → WELCOME → tagline → yellow arrow */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex min-h-[50%] flex-col justify-end gap-2 px-2 pb-[max(1rem,env(safe-area-inset-bottom))] pt-8">
        <div className="flex flex-col gap-2">
          <TourLogoMark className="-mb-5 self-start" />

          <p className='w-full text-center font-["Special_Gothic_Expanded_One",sans-serif] text-[61px] font-normal leading-[110%] tracking-normal text-[var(--Backgrounds-Primary---Elevated,#FFF)]'>
            Welcome
          </p>

          <p className="title1 m-0 max-w-full self-start !font-semibold !leading-[52px] text-[#171717]">
            <span className="box-decoration-clone bg-[#FFF200] px-2 py-1.5">
              IRL is your global
              <br />
              guide to what&apos;s good.
            </span>
          </p>
        </div>

        <div className="flex w-full justify-end">
          <TourArrowIcon fill="#FFF200" />
        </div>
      </div>
    </div>
  );
}

/**
 * Full-bleed tour step: poster + local-guides copy.
 * Tap anywhere to advance.
 */
function Page2Step({ onContinue }: { onContinue: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onContinue}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onContinue();
        }
      }}
      aria-label="Continue tour"
      className={TOUR_STEP_SHELL_CLASS}
    >
      <Image
        src="/map/tour/tour-page2.png"
        alt=""
        fill
        priority
        sizes="393px"
        className="object-cover object-bottom"
      />

      <div className="absolute inset-x-0 bottom-0 top-24 z-10 flex flex-col gap-2 px-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Image
          src="/map/tour/tour-page2-poster.jpg"
          alt=""
          width={1440}
          height={1800}
          priority
          className="mx-auto h-auto w-auto max-h-[calc(100%-10.5rem)] max-w-full shrink-0 object-contain object-top"
        />

        <div className="flex w-full shrink-0 items-end justify-between gap-3">
          <p className='max-w-[240px] font-["Gal_Gothic_Variable",sans-serif] text-[20.102px] font-semibold leading-[25.73px] text-[#171717]'>
            The best spots, hand-picked by people shaping the local scene.
          </p>
          <TourArrowIcon fill="#171717" className="bg-transparent" />
        </div>

        <p className="shrink-0 self-end text-right font-label-xl text-[32.892px] font-normal uppercase leading-[125%] tracking-[0.658px] text-[#171717]">
          EXPLORE
        </p>

        <p className='shrink-0 self-end bg-[#171717] px-2 py-1 font-["Gal_Gothic_Variable",sans-serif] text-[47.379px] font-semibold leading-[125%] text-[var(--Brand-Colors-Yellow,#FFF200)]'>
          Local Guides
        </p>
      </div>
    </div>
  );
}

/**
 * Full-bleed tour step: earn/spend rewards copy + reward graphic.
 * Tap anywhere to advance.
 */
function Page3Step({ onContinue }: { onContinue: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onContinue}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onContinue();
        }
      }}
      aria-label="Continue tour"
      className={TOUR_STEP_SHELL_CLASS}
    >
      <Image
        src="/map/tour/tour-page3.png"
        alt=""
        fill
        priority
        sizes="393px"
        className="object-cover object-center"
      />

      <div className="absolute inset-x-0 bottom-0 top-14 z-10 flex flex-col items-stretch gap-2 px-2 pb-[max(1rem,env(safe-area-inset-bottom))] pt-12">
        <p className="title1 shrink-0 self-end text-right !font-medium text-white">
          Earn and Spend
        </p>

        <p className='shrink-0 self-start bg-[var(--Brand-Colors-Yellow,#FFF200)] px-2 py-1 font-["Gal_Gothic_Variable",sans-serif] text-[58.924px] font-semibold leading-[125%] text-[#181818]'>
          Rewards
        </p>

        <div className="flex w-full shrink-0 items-end justify-between gap-3">
          <p className="title3 max-w-[280px] text-white">
            Earn points for future rewards at clubs, bars and galleries
          </p>
          <TourArrowIcon fill="#FFF200" />
        </div>

        <div className="mt-16 flex w-full justify-center px-6">
          <Image
            src="/map/tour/reward.png"
            alt=""
            width={442}
            height={777}
            priority
            className="h-auto w-[442px] max-w-full shrink-0"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Final full-bleed tour step: get-started CTA.
 */
function Page4Step({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="pointer-events-auto absolute inset-0 z-40 h-full w-full overflow-hidden bg-black">
      <Image
        src="/map/tour/tour-page4.png"
        alt=""
        fill
        priority
        sizes="393px"
        className="object-cover object-center"
      />
      {/* Blur + gradient darken from the midpoint down for CTA legibility */}
      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 bottom-0 overflow-hidden"
        aria-hidden
      >
        <div className="absolute inset-x-0 bottom-0 h-full w-full">
          <Image
            src="/map/tour/tour-page4.png"
            alt=""
            fill
            priority
            sizes="393px"
            className="object-cover object-center blur-[2px]"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black/70" />
      </div>

      <div className="absolute inset-x-0 top-1/2 bottom-0 z-10 flex flex-col items-center px-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex w-[361px] max-w-full flex-col items-stretch gap-4">
          <div className="flex flex-col items-start self-start">
            <span className='bg-[var(--Brand-Colors-Yellow,#FFF200)] px-2 py-1 font-["Special_Gothic_Expanded_One",sans-serif] text-[61px] font-normal uppercase leading-[64px] tracking-[-4px] text-[#181818]'>
              GET
            </span>
            <span className='bg-[var(--Brand-Colors-Yellow,#FFF200)] px-2 py-1 font-["Special_Gothic_Expanded_One",sans-serif] text-[61px] font-normal uppercase leading-[64px] tracking-[-4px] text-[#181818]'>
              STARTED
            </span>
          </div>

          <p className="title3 max-w-[75%] text-left text-white">
            Discover curated city guides, check-in, and curate your own lists to
            share with your circle.
          </p>
        </div>

        <button
          type="button"
          onClick={onContinue}
          className="mt-auto flex min-h-11 w-[361px] max-w-full items-center justify-center gap-[var(--sds-size-space-400)] bg-[var(--Dark-Tint-100---Ink-Black,#171717)] px-[var(--sds-size-space-400)] py-[var(--sds-size-space-200)] transition-colors hover:bg-black"
        >
          <span className="label-large uppercase text-white">START NOW</span>
        </button>
      </div>
    </div>
  );
}

/**
 * Sequential map welcome tour overlay.
 * Full device width on mobile; 393px centered rail on md+.
 */
export function MapWelcomeTour({
  open,
  onComplete,
  className,
}: MapWelcomeTourProps) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (open) setStepIndex(0);
  }, [open]);

  if (!open) return null;

  const step = TOUR_STEPS[stepIndex] ?? 'intro';

  const advance = () => {
    const next = stepIndex + 1;
    if (next >= TOUR_STEPS.length) {
      onComplete();
      return;
    }
    setStepIndex(next);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="map-welcome-tour-title"
      className={cn(
        'pointer-events-none absolute inset-0 z-30 flex justify-center',
        className
      )}
    >
      {/* Dim sides outside the mobile frame on wide screens */}
      <div
        className="pointer-events-none absolute inset-0 hidden bg-black/50 md:block"
        aria-hidden
      />
      <div className={TOUR_FRAME_CLASS}>
        <span id="map-welcome-tour-title" className="sr-only">
          Welcome to IRL
        </span>
        {step === 'intro' ? <IntroStep onContinue={advance} /> : null}
        {step === 'page1' ? <Page1Step onContinue={advance} /> : null}
        {step === 'page2' ? <Page2Step onContinue={advance} /> : null}
        {step === 'page3' ? <Page3Step onContinue={advance} /> : null}
        {step === 'page4' ? <Page4Step onContinue={advance} /> : null}
      </div>
    </div>
  );
}
