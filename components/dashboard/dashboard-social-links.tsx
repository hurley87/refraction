'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { UserProfile } from '@/lib/types';
import { getSocialUrl } from '@/lib/utils/social-links';
import EditSocialsModal from '@/components/dashboard/edit-socials-modal';
import { MapYellowTip } from '@/components/map/map-yellow-tip';
import {
  getMissingProfileCompletionLabels,
  getProfileCompletionCount,
  clearProfileCompleteRewardsTipSeen,
  hasSeenProfileCompleteRewardsTip,
  isProfileComplete,
  markProfileCompleteRewardsTipSeen,
  PROFILE_COMPLETION_FIELDS,
} from '@/lib/profile-completion';

interface DashboardSocialLinksProps {
  profile: UserProfile | null | undefined;
}

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

function EditPencilIcon() {
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
        d="M3.85005 11.4019L3.85413 10.2458V10.2437L3.8572 9.2608C3.8572 9.14499 3.88578 9.05582 3.97462 8.97383L8.93808 3.98246L11.5541 6.61138L8.71242 9.47194L6.56918 11.6243C6.50077 11.6817 6.43235 11.7175 6.33127 11.7175L4.14514 11.7309C4.12983 11.7309 4.11553 11.7288 4.10225 11.7268H3.85515V11.4521C3.85209 11.4357 3.85107 11.4183 3.85107 11.4019H3.85005ZM2.79834 14H11.8226V12.6697H2.79834V14ZM13.2266 3.43515L12.1055 2.30978C11.694 1.89674 11.0282 1.89674 10.6167 2.30978L9.51397 3.4167L12.1238 6.0364L13.2266 4.92948C13.6381 4.51644 13.6381 3.84819 13.2266 3.43515Z"
        fill="#171717"
      />
    </svg>
  );
}

/**
 * Identity extras under the username: city + country, then Instagram / X / website icons.
 */
export default function DashboardSocialLinks({
  profile,
}: DashboardSocialLinksProps) {
  const [editSocialsOpen, setEditSocialsOpen] = useState(false);
  const [showCompleteRewardsTip, setShowCompleteRewardsTip] = useState(false);

  useEffect(() => {
    if (!profile?.wallet_address) {
      setShowCompleteRewardsTip(false);
      return;
    }
    const complete =
      Boolean(profile.profile_completion_awarded) || isProfileComplete(profile);
    if (!complete) {
      // Allow the tip to show again after an admin/dev reset of completion fields.
      clearProfileCompleteRewardsTipSeen(profile.wallet_address);
      setShowCompleteRewardsTip(false);
      return;
    }
    setShowCompleteRewardsTip(
      !hasSeenProfileCompleteRewardsTip(profile.wallet_address)
    );
  }, [profile, profile?.profile_completion_awarded, profile?.wallet_address]);

  if (!profile) return null;

  const tw = getSocialUrl('twitter', profile.twitter_handle || '');
  const ig = getSocialUrl('instagram', profile.instagram_handle || '');
  const href = websiteHref(profile.website);

  const city = profile.city?.trim() ?? '';
  const country = profile.country?.trim() ?? '';
  const hasLocation = Boolean(
    profile.geo_city_id || profile.country_id || city || country
  );
  const hasFollowIcons = Boolean(ig || tw || href);

  const completedFields = getProfileCompletionCount(profile);
  const missingFields = getMissingProfileCompletionLabels(profile);
  const profileComplete =
    Boolean(profile.profile_completion_awarded) || isProfileComplete(profile);
  const showIncompleteTip =
    !profile.profile_completion_awarded && !profileComplete;

  const dismissCompleteRewardsTip = () => {
    markProfileCompleteRewardsTipSeen(profile.wallet_address);
    setShowCompleteRewardsTip(false);
  };

  return (
    <div className="flex w-full flex-col items-start gap-3 self-stretch">
      {hasLocation && (
        <div className="flex w-full max-w-full items-end gap-6 self-stretch">
          <div className="flex w-[168px] shrink-0 flex-col items-start justify-center gap-2">
            <div className="flex items-center gap-2">
              <LocationPinIcon />
              <span className="label-small uppercase text-[#171717]">CITY</span>
            </div>
            <span className="label-medium min-w-0 w-full text-left font-bold uppercase text-[#171717]">
              {city || '—'}
            </span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col items-start justify-center gap-2">
            <div className="flex items-center gap-2">
              <LocationPinIcon />
              <span className="label-small uppercase text-[#171717]">
                COUNTRY
              </span>
            </div>
            <span className="label-medium min-w-0 w-full text-left font-bold uppercase text-[#171717]">
              {country || '—'}
            </span>
          </div>
        </div>
      )}

      {showIncompleteTip && (
        <MapYellowTip
          pointer="bottom"
          pointerAlign="end"
          className="w-full max-w-[280px] self-end"
        >
          <span className="block">
            {completedFields} / {PROFILE_COMPLETION_FIELDS.length} · Complete
            your profile to earn 1,000 IRL Points
          </span>
          <ul className="mt-2 list-disc space-y-0.5 pl-4">
            {missingFields.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </MapYellowTip>
      )}

      {showCompleteRewardsTip && (
        <MapYellowTip
          pointer="bottom"
          pointerAlign="end"
          className="w-full max-w-[280px] self-end"
          onDismiss={dismissCompleteRewardsTip}
        >
          <p>Profile complete! You earned 1000 points.</p>
          <p className="mt-2">
            Free drinks, secret guest list and hotel discounts are waiting for
            you…
          </p>
          <Link
            href="/rewards"
            className="mt-3 inline-block uppercase underline underline-offset-2"
            onClick={dismissCompleteRewardsTip}
          >
            GO TO REWARDS
          </Link>
        </MapYellowTip>
      )}

      <div
        className={`flex w-full items-center gap-3 self-stretch ${
          hasFollowIcons ? 'justify-between' : 'justify-end'
        }`}
      >
        {hasFollowIcons ? (
          <div className="flex items-center justify-start gap-1">
            {ig && (
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
            )}
            {tw && (
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
            )}
            {href && (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex size-6 shrink-0 items-center justify-center transition-opacity hover:opacity-70"
                aria-label="Website"
              >
                <Image
                  src="/globe.svg"
                  alt=""
                  width={24}
                  height={24}
                  className="h-6 w-6 shrink-0 brightness-0"
                />
              </a>
            )}
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => setEditSocialsOpen(true)}
          className="flex shrink-0 items-center gap-2 text-[#171717] transition-opacity hover:opacity-70"
        >
          <span className="label-medium uppercase">EDIT</span>
          <EditPencilIcon />
        </button>
      </div>

      <EditSocialsModal
        open={editSocialsOpen}
        onOpenChange={setEditSocialsOpen}
        profile={profile}
      />
    </div>
  );
}
