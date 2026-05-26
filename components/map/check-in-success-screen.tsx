'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { useTiers } from '@/hooks/useTiers';
import { resolveTierForPoints } from '@/lib/tier-for-points';

interface CheckInSuccessTarget {
  name: string;
  address?: string | null;
  imageUrl?: string | null;
  imageThumbUrl?: string | null;
}

interface CheckInSuccessScreenProps {
  target: CheckInSuccessTarget;
  pointsEarned: number;
  totalPoints: number;
  onBackToMap: () => void;
}

function IrlPtsIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="18"
      viewBox="0 0 32 18"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M32 18H0V0H32V18ZM22.5732 5.2959C21.9935 5.29593 21.4873 5.39475 21.0566 5.59277C20.6252 5.79157 20.2953 6.06956 20.0664 6.42871C19.8375 6.78718 19.7236 7.20801 19.7236 7.68848C19.7237 8.16857 19.824 8.53138 20.0264 8.84375C20.2281 9.15694 20.5131 9.40625 20.8789 9.59375C21.2448 9.78047 21.6915 9.93144 22.2178 10.0459C22.6906 10.1453 23.0479 10.2388 23.2881 10.3262C23.5282 10.4142 23.7026 10.52 23.8096 10.6465C23.9165 10.7722 23.9697 10.9357 23.9697 11.1338C23.9696 11.401 23.8516 11.6204 23.6152 11.792C23.3788 11.9636 23.0352 12.0488 22.585 12.0488C22.1045 12.0488 21.7274 11.9458 21.457 11.7402C21.1863 11.534 21.0393 11.2366 21.0166 10.8477H19.4941C19.5243 11.5801 19.805 12.1676 20.335 12.6104C20.8651 13.0532 21.6232 13.2744 22.6074 13.2744C23.1797 13.2744 23.7008 13.1809 24.1699 12.9941C24.6391 12.8074 25.0134 12.5227 25.292 12.1416C25.5706 11.7598 25.71 11.2907 25.71 10.7334C25.7099 10.0241 25.4887 9.49139 25.0459 9.13672L25.0469 9.13574C24.6041 8.78104 23.9553 8.5269 23.1006 8.37402C22.6654 8.29044 22.3313 8.20663 22.0986 8.12305C21.8661 8.0395 21.6946 7.93748 21.584 7.81934C21.4733 7.7011 21.418 7.55019 21.418 7.36719C21.418 7.10817 21.522 6.90188 21.7275 6.74902C21.9339 6.59629 22.2275 6.52051 22.6084 6.52051C22.9894 6.52054 23.2968 6.60986 23.5068 6.78906C23.7168 6.96828 23.8363 7.21835 23.8672 7.53906H25.4014C25.3404 6.82966 25.0575 6.27787 24.5537 5.88477C24.05 5.49192 23.3901 5.2959 22.5732 5.2959ZM6.99512 13.1582H8.91895V10.4004H10.0859C10.7268 10.4004 11.2786 10.2964 11.7402 10.0908C12.2016 9.88451 12.5528 9.59504 12.793 9.22168C13.0332 8.84823 13.1533 8.40895 13.1533 7.90527C13.1533 7.40146 13.029 6.93009 12.7812 6.55957C12.5335 6.18998 12.1804 5.90503 11.7227 5.70703H11.7236C11.2658 5.50897 10.7193 5.40918 10.0859 5.40918H6.99512V13.1582ZM13.5547 6.70312H15.3975V13.1582H17.332V6.70312H19.1865V5.40918H13.5547V6.70312ZM9.99414 6.69141C10.4136 6.69141 10.7305 6.79539 10.9443 7.00098C11.1582 7.20732 11.2656 7.50844 11.2656 7.90527C11.2656 8.30194 11.157 8.59022 10.9395 8.79199C10.7218 8.99457 10.4061 9.0957 9.99414 9.0957H8.91797V6.69141H9.99414Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CheckInCtaArrow({ fill = '#DBDBDB' }: { fill?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="block size-6 max-w-none shrink-0"
      aria-hidden
    >
      <path
        d="M14.0822 4L11.8239 6.28605L16 10.1453H2V13.8547H15.9812L11.8239 17.7139L14.0822 20L22 11.9846L14.0822 4Z"
        fill={fill}
      />
    </svg>
  );
}

/**
 * Post check-in success: earned points + location (section 1), balance + tier + CTAs (section 2).
 */
export function CheckInSuccessScreen({
  target,
  pointsEarned,
  totalPoints,
  onBackToMap,
}: CheckInSuccessScreenProps) {
  const { data: tiers = [], isLoading: isLoadingTiers } = useTiers();
  const currentTier = useMemo(
    () => resolveTierForPoints(tiers, totalPoints),
    [tiers, totalPoints]
  );

  const locationAddress = target.address?.trim() || target.name;

  const tierSummary = currentTier
    ? `${currentTier.title} • ${currentTier.min_points.toLocaleString()}+`
    : '—';

  return (
    <div className="flex w-full flex-1 flex-col overflow-y-auto">
      {/* Section 1 — points earned + checked-in location */}
      <section className="relative flex h-[493px] w-full flex-col items-start gap-2 overflow-hidden border-t border-[#454545]">
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/map/success-map.png')" }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 backdrop-blur-[10px] backdrop-saturate-150"
          style={{
            background:
              'linear-gradient(180deg, rgba(217, 217, 217, 0.62) 0%, rgba(255, 242, 0, 0.68) 100%)',
            WebkitBackdropFilter: 'blur(20px) saturate(150%)',
          }}
          aria-hidden
        />

        <div className="relative z-10 flex flex-col items-center gap-[12px] self-stretch px-4 pt-[100px] pb-3">
          <Image
            src="/map/location-marker.svg"
            alt=""
            width={46}
            height={66}
            className="h-[66px] w-[46px] shrink-0"
            aria-hidden
          />

          <div className="flex w-full flex-col items-center gap-4 self-stretch">
            <div className="flex w-[134px] items-center justify-center gap-2">
              <p className="label-small text-[#171717]">You Earned</p>
            </div>

            <div className="flex h-[53px] shrink-0 items-end justify-center gap-2 self-stretch text-[#171717]">
              <span className="display0 leading-none">{pointsEarned}</span>
              <IrlPtsIcon className="mb-1 h-[18px] w-8 shrink-0 text-[#171717]" />
            </div>

            <p className="label-small text-[#171717]">Checking In At</p>

            <div className="flex min-h-[56px] w-fit max-w-full flex-col items-center gap-2 self-center bg-[rgba(255,255,255,0.65)] p-2">
              <p className="title5 line-clamp-2 w-full text-center text-[#171717] font-bold">
                {target.name}
              </p>
              <div className="flex items-center justify-center gap-1">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="size-4 shrink-0"
                  aria-hidden
                >
                  <path
                    d="M12.4492 6.60348C12.2698 3.59906 10.1489 2.04842 8.00027 2.0007C5.8514 2.04842 3.73051 3.59906 3.55108 6.60348C3.4639 9.67401 5.67749 12.4517 8.00004 14C10.3225 12.4517 12.5364 9.67401 12.4492 6.60348ZM8.00027 8.4728C6.65911 8.4728 5.57161 7.37821 5.57161 6.02778C5.57161 4.67735 6.65888 3.58276 8.00027 3.58276C9.34167 3.58276 10.4289 4.67735 10.4289 6.02778C10.4289 7.37821 9.34167 8.4728 8.00027 8.4728Z"
                    fill="#A9A9A9"
                  />
                </svg>
                <span className="label-small line-clamp-2 normal-case text-[#454545]">
                  {locationAddress}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2 — balance, tier, actions */}
      <section className="flex flex-1 flex-col items-start justify-end gap-[var(--sds-size-space-300)] self-stretch bg-white px-4 py-6">
        <div className="flex w-full max-w-[361px] flex-col gap-[var(--sds-size-space-300)] self-stretch">
          <div className="flex h-6 w-full max-w-[361px] items-center justify-between self-stretch">
            <span className="label-medium uppercase text-[#757575]">
              Your Points Balance
            </span>
            <div className="flex items-center gap-1 text-[#171717]">
              <span className="title5 font-bold">
                {totalPoints.toLocaleString()}
              </span>
              <IrlPtsIcon className="h-[18px] w-8 shrink-0 text-[#171717]" />
            </div>
          </div>

          <div className="flex h-6 w-full max-w-[361px] items-center justify-between self-stretch">
            <span className="label-medium uppercase text-[#757575]">
              Current Tier
            </span>
            {isLoadingTiers ? (
              <div className="h-4 w-28 animate-pulse rounded bg-[#f0f0f0]" />
            ) : (
              <span className="title5 font-bold text-[#171717]">
                {tierSummary}
              </span>
            )}
          </div>
        </div>

        <div className="mt-auto flex w-full flex-col gap-2 pt-[var(--sds-size-space-300)]">
          <Link
            href="/dashboard"
            onClick={onBackToMap}
            className="label-medium flex h-11 w-full items-center justify-between bg-[#A9A9A9] px-4 py-2 uppercase text-[#171717] transition-colors hover:bg-black"
          >
            <span>View Profile</span>
            <CheckInCtaArrow fill="#757575" />
          </Link>
          <button
            type="button"
            onClick={onBackToMap}
            className="label-medium label-large flex h-11 w-full items-center justify-between border border-[#171717] bg-black px-4 py-2 uppercase text-[#ffffff] transition-colors hover:bg-[#f8f8f8]"
          >
            <span>Back to Map</span>
            <CheckInCtaArrow fill="#ffffff" />
          </button>
        </div>
      </section>
    </div>
  );
}
