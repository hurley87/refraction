'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import MapNav, { MAP_NAV_SAFE_AREA_X } from '@/components/map/mapnav';
import ProfileAvatar from '@/components/profile-avatar';
import ProfileFavoritePlacesCarousel from '@/components/dashboard/profile-favorite-places-carousel';
import PublicProfileListsCarousel from '@/components/profile/public-profile-lists-carousel';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getSocialUrl } from '@/lib/utils/social-links';
import { profilePathForPlayer } from '@/lib/username';
import type { UserProfile } from '@/lib/types';
import type { PublicPlayerListCard } from '@/lib/profile/public-profile-data';

type PublicProfileViewProps = {
  profile: UserProfile;
  lists?: PublicPlayerListCard[];
};

const DASHBOARD_SHELL_STYLE = {
  backgroundColor: '#FFF',
  backgroundImage: 'url(/profile/profile-card-other.png)',
  backgroundSize: '100% auto',
  backgroundPosition: 'top center',
  backgroundRepeat: 'no-repeat',
} as const;

function websiteHref(website?: string): string | null {
  const w = website?.trim();
  if (!w) return null;
  return w.startsWith('http') ? w : `https://${w}`;
}

function LocationPinIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path
        d="M12.4492 6.60278C12.2697 3.59835 10.1488 2.04772 8.00021 2C5.85134 2.04772 3.73045 3.59835 3.55102 6.60278C3.46384 9.67331 5.67743 12.451 7.99998 13.9993C10.3224 12.451 12.5364 9.67331 12.4492 6.60278ZM8.00021 8.4721C6.65905 8.4721 5.57155 7.37751 5.57155 6.02708C5.57155 4.67665 6.65882 3.58206 8.00021 3.58206C9.34161 3.58206 10.4289 4.67665 10.4289 6.02708C10.4289 7.37751 9.34161 8.4721 8.00021 8.4721Z"
        fill="#757575"
      />
    </svg>
  );
}

function BioInfoIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path
        d="M8 14C4.69123 14 2 11.3088 2 8C2 4.69123 4.69123 2 8 2C11.3088 2 14 4.69123 14 8C14 11.3088 11.3088 14 8 14ZM8 4.00974C5.80024 4.00974 4.00974 5.80024 4.00974 8C4.00974 10.1998 5.80024 11.9903 8 11.9903C10.1998 11.9903 11.9903 10.1998 11.9903 8C11.9903 5.80024 10.1998 4.00974 8 4.00974Z"
        fill="#757575"
      />
      <path
        d="M7.26495 10.7395V6.62753H8.75295V10.7395H7.26495ZM7.27295 6.13953V5.01953H8.75295V6.13953H7.27295Z"
        fill="#757575"
      />
    </svg>
  );
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name: string }).name === 'AbortError'
  );
}

export function PublicProfileView({
  profile,
  lists = [],
}: PublicProfileViewProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const usernameForDisplay = profile.username?.trim();
  const handleText = usernameForDisplay
    ? `@${usernameForDisplay.replace(/^@/, '')}`
    : null;

  const city = profile.city?.trim() || '—';
  const country = profile.country?.trim() || '—';
  const bio = profile.bio?.trim() ?? '';

  const tw = getSocialUrl('twitter', profile.twitter_handle || '');
  const ig = getSocialUrl('instagram', profile.instagram_handle || '');
  const href = websiteHref(profile.website);
  const websiteLabel = profile.website?.trim() ?? '';

  const sharePath = profilePathForPlayer({
    username: profile.username,
    wallet_address: profile.wallet_address,
  });

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}${sharePath}`;
    const title = handleText || 'IRL profile';

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url: shareUrl });
        return;
      } catch (error) {
        if (isAbortError(error)) return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Profile link copied');
    } catch {
      toast.error('Could not copy profile link');
    }
  };

  return (
    <div className="min-h-screen bg-white font-grotesk md:bg-[#F5F5F5]">
      <div
        style={DASHBOARD_SHELL_STYLE}
        className="mx-auto min-h-screen w-full overflow-x-hidden pt-2 pb-4 md:max-w-[393px] md:rounded-t-[26px]"
      >
        <div className="mx-auto w-full px-4">
          <div
            className={`sticky top-0 z-50 min-w-0 pb-2 pt-2 -mt-2 transition-colors duration-200 ${
              isScrolled ? 'bg-transparent backdrop-blur-sm' : 'bg-transparent'
            }`}
          >
            <MapNav
              irlLogoVariant="light"
              className={cn('w-full min-w-0', MAP_NAV_SAFE_AREA_X)}
            />
          </div>

          <div className="mt-[50px] flex flex-col items-start gap-3 self-stretch px-1 py-1">
            <ProfileAvatar
              profilePictureUrl={profile.profile_picture_url}
              name={profile.name}
              username={profile.username}
              twitterHandle={profile.twitter_handle}
              size={64}
            />
            <span className="min-w-0 max-w-full truncate rounded bg-[var(--IRL-Yellow,#FFF200)] p-1 title1 font-normal text-[#171717]">
              {handleText ?? '—'}
            </span>
          </div>

          <div className="w-full pt-4">
            <div
              className="flex w-full max-w-full flex-col items-start gap-6 p-4 border"
              style={{ background: 'var(--Backgrounds-Background, #FFF)' }}
            >
              <div className="flex w-full items-end gap-6 self-stretch">
                <div className="flex min-w-0 flex-1 flex-col items-start justify-center gap-2">
                  <div className="flex items-center gap-2">
                    <LocationPinIcon />
                    <span className="label-small uppercase tracking-wide text-[#7D7D7D]">
                      CITY
                    </span>
                  </div>
                  <span className="label-medium min-w-0 w-full text-left font-bold uppercase text-[#171717]">
                    {city}
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col items-start justify-center gap-2">
                  <div className="flex items-center gap-2">
                    <LocationPinIcon />
                    <span className="label-small uppercase tracking-wide text-[#7D7D7D]">
                      COUNTRY
                    </span>
                  </div>
                  <span className="label-medium min-w-0 w-full text-left font-bold uppercase text-[#171717]">
                    {country}
                  </span>
                </div>
              </div>

              <div className="flex w-full items-end gap-6 self-stretch border-t border-[var(--Borders-Light-Border,#DBDBDB)] pt-4">
                <div className="flex min-w-0 flex-[2] flex-col items-start justify-center gap-2 self-stretch">
                  <div className="flex items-center gap-2">
                    <svg
                      width="12"
                      height="11"
                      viewBox="0 0 12 11"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden
                    >
                      <path
                        d="M11.2532 10.6667H0C0.746444 8.18309 3.03832 6.48657 5.60279 6.47662C8.17718 6.46667 10.4919 8.15224 11.2532 10.6667ZM5.62559 0C3.97905 0 2.64477 1.3393 2.64477 2.99204C2.64477 4.64478 3.97905 5.98408 5.62559 5.98408C7.27213 5.98408 8.60641 4.64478 8.60641 2.99204C8.60641 1.3393 7.27213 0 5.62559 0Z"
                        fill="#171717"
                      />
                    </svg>
                    <span className="label-small uppercase text-[#171717]">
                      FOLLOW
                    </span>
                  </div>
                  <div className="flex w-full items-center justify-start gap-1">
                    {tw ? (
                      <a
                        href={tw}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex shrink-0 items-center justify-center transition-opacity hover:opacity-70"
                        aria-label="X (Twitter)"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 48 48"
                          fill="none"
                          aria-hidden
                        >
                          <path
                            d="M33.2016 10H38.1088L27.3888 21.8611L40 38H30.1248L22.392 28.2109L13.5424 38H8.6304L20.0976 25.3144L8 10H18.1248L25.1168 18.9476L33.2016 10ZM31.48 35.1564H34.2L16.6464 12.6942H13.728L31.48 35.1564Z"
                            fill="#171717"
                          />
                        </svg>
                      </a>
                    ) : null}
                    {ig ? (
                      <a
                        href={ig}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex shrink-0 items-center justify-center transition-opacity hover:opacity-70"
                        aria-label="Instagram"
                      >
                        <Image
                          src="/logos/socials/iconoir_instagram.svg"
                          alt="Instagram"
                          width={24}
                          height={24}
                          className="shrink-0"
                        />
                      </a>
                    ) : null}
                  </div>
                </div>

                <div className="flex min-w-0 flex-[3] flex-col items-start justify-center gap-2 self-stretch">
                  <div className="flex w-full items-center gap-2">
                    <Image
                      src="/globe.svg"
                      alt=""
                      width={16}
                      height={16}
                      className="h-4 w-4 shrink-0 brightness-0"
                    />
                    <span className="label-small uppercase text-[#171717]">
                      WEBSITE
                    </span>
                  </div>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-[21px] max-w-full items-center justify-start gap-1 transition-opacity hover:opacity-80"
                    >
                      <span className="label-small inline-block min-w-0 max-w-[calc(100%-20px)] truncate border-b-2 border-[#171717] text-left text-[#171717] font-extrabold">
                        {websiteLabel}
                      </span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        aria-hidden
                      >
                        <path
                          d="M5.68767 2.42969V4.64061L9.57161 4.46205L2.7338 11.3124L4.51454 13.0964L11.341 6.24118L11.1741 10.1566H13.4005V2.42969H5.68767Z"
                          fill="#171717"
                        />
                      </svg>
                    </a>
                  ) : (
                    <span className="label-small flex h-[21px] items-center text-left text-[#A9A9A9]">
                      No website
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleShare}
                className="label-large flex h-11 min-h-11 w-full items-center justify-between bg-[#171717] px-[var(--sds-size-space-400)] py-[var(--sds-size-space-200)] text-white transition-opacity hover:opacity-95"
              >
                Share profile
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white"
                  aria-hidden
                >
                  <Image
                    src="/right-arrow.svg"
                    alt=""
                    width={24}
                    height={24}
                    className="size-4 object-contain"
                    style={{ transform: 'rotate(-45deg)' }}
                  />
                </span>
              </button>
            </div>
          </div>

          <div className="relative -mx-4 mt-6 w-[calc(100%+2rem)] max-w-none rounded-b-[26px] bg-[var(--Backgrounds-Background,#FFF)]">
            <div className="flex flex-col gap-6 px-4 pt-2 pb-4">
              <ProfileFavoritePlacesCarousel
                profile={profile}
                className="-mx-4 px-4"
              />

              {lists.length > 0 ? (
                <PublicProfileListsCarousel
                  lists={lists}
                  className="-mx-4 px-4"
                />
              ) : null}

              {bio ? (
                <div
                  className="flex w-full flex-col items-start gap-3 self-stretch pt-3"
                  style={{
                    borderTop: '1px solid var(--Borders-Light-Border, #DBDBDB)',
                  }}
                >
                  <div className="flex w-full items-center gap-2 self-stretch">
                    <BioInfoIcon />
                    <span className="label-small uppercase text-[#171717]">
                      BIO
                    </span>
                  </div>
                  <p className="body-small min-w-0 w-full whitespace-pre-wrap text-left text-[#171717]">
                    {bio}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
