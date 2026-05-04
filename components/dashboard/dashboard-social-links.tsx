'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { UserProfile } from '@/lib/types';
import { getSocialUrl } from '@/lib/utils/social-links';
import EditSocialsModal from '@/components/dashboard/edit-socials-modal';

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

/** Collapsed state: show “expand” chevron */
function SocialsChevronCollapsedIcon() {
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
        d="M11.8095 7.88328L9.23713 10.6548V1.33398H6.76291V10.6548L4.1905 7.88328L2.66669 9.38876L8.00952 14.6673L13.3334 9.38876L11.8095 7.88328Z"
        fill="#171717"
      />
    </svg>
  );
}

/** Expanded (default): show “collapse” chevron */
function SocialsChevronExpandedIcon() {
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
        d="M11.8095 8.11672L9.23711 5.3452V14.666H6.7629V5.3452L4.19048 8.11672L2.66667 6.61124L8.00951 1.33268L13.3333 6.61124L11.8095 8.11672Z"
        fill="#171717"
      />
    </svg>
  );
}

/**
 * ABOUT YOU toolbar (edit profile, expand/collapse), optional FOLLOW | WEBSITE row,
 * then location (361px) + bio blocks — all toggled together.
 */
export default function DashboardSocialLinks({
  profile,
}: DashboardSocialLinksProps) {
  const [aboutYouExpanded, setAboutYouExpanded] = useState(true);
  const [editSocialsOpen, setEditSocialsOpen] = useState(false);

  if (!profile) return null;

  const tw = getSocialUrl('twitter', profile.twitter_handle || '');
  const ig = getSocialUrl('instagram', profile.instagram_handle || '');

  const href = websiteHref(profile.website);
  const websiteLabel = profile.website?.trim() ?? '';

  const city = profile.city?.trim() ?? '';
  const country = profile.country?.trim() ?? '';
  const bio = profile.bio?.trim() ?? '';
  const hasLocation = Boolean(city || country);
  const hasBio = Boolean(bio);

  return (
    <div className="mb-[20px] flex flex-col gap-3 self-stretch pt-3">
      <div className="flex items-start gap-3 self-stretch">
        <div className="flex min-w-0 flex-[1_0_0] items-start gap-2">
          <BioInfoIcon />
          <span className="label-small uppercase text-[#171717]">
            ABOUT YOU
          </span>
        </div>
        <button
          type="button"
          onClick={() => setEditSocialsOpen(true)}
          className="flex shrink-0 items-center gap-2 text-[#171717] transition-opacity hover:opacity-70"
        >
          <span className="label-medium uppercase">EDIT</span>
          <EditPencilIcon />
        </button>
        <button
          type="button"
          onClick={() => setAboutYouExpanded((e) => !e)}
          className="flex shrink-0 items-center justify-center gap-4 p-1 transition-opacity hover:opacity-90"
          style={{
            background: 'var(--Backgrounds-Secondary-CTA-BG, #DBDBDB)',
          }}
          aria-expanded={aboutYouExpanded}
          aria-label={
            aboutYouExpanded
              ? 'Hide about you details'
              : 'Show about you details'
          }
        >
          {aboutYouExpanded ? (
            <SocialsChevronExpandedIcon />
          ) : (
            <SocialsChevronCollapsedIcon />
          )}
        </button>
      </div>

      {aboutYouExpanded && (
        <div className="flex flex-col gap-3 self-stretch">
          <div className="flex items-end gap-6 self-stretch">
            {/* Left: 141px, column, center, start align, gap 8px */}
            <div className="flex w-[141px] shrink-0 flex-col items-start justify-center gap-2 self-stretch">
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
                      className="shrink-0 "
                    />
                  </a>
                )}
              </div>
            </div>

            {/* Right: WEBSITE + url — column 56px, padding 0 16px 0 24px, gap 12px */}
            <div className="flex h-14 min-w-0 flex-[1_0_0] flex-col items-start gap-3 self-stretch py-0 pl-6 pr-4">
              <div className="flex w-full items-center gap-2 self-stretch">
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
                  className="flex h-[21px] w-[172px] shrink-0 items-center justify-start gap-1 transition-opacity hover:opacity-80"
                >
                  <span className="label-small inline-block min-w-0 w-fit max-w-[calc(172px-20px)] truncate border-b-2 border-[#171717] text-left text-[#171717] font-extrabold">
                    {websiteLabel}
                  </span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      d="M5.68767 2.42969V4.64061L9.57161 4.46205L2.7338 11.3124L4.51454 13.0964L11.341 6.24118L11.1741 10.1566H13.4005V2.42969H5.68767Z"
                      fill="#171717"
                    />
                  </svg>
                </a>
              ) : (
                <span className="label-small flex h-[21px] w-[172px] shrink-0 items-center text-left text-white/60">
                  No website
                </span>
              )}
            </div>
          </div>

          {(hasLocation || hasBio) && (
            <div className="flex flex-col gap-3 self-stretch">
              {hasLocation && (
                <div className="self-stretch border-t border-[#A9A9A9] pt-3">
                  <div className="flex w-[361px] max-w-full shrink-0 items-end gap-6 self-stretch">
                    <div className="flex w-[168px] shrink-0 flex-col items-start justify-center gap-2 self-stretch">
                      <div className="flex items-center gap-2">
                        <LocationPinIcon />
                        <span className="label-small uppercase text-[#171717]">
                          CITY
                        </span>
                      </div>
                      <span className="label-medium min-w-0 w-full text-left font-bold uppercase text-[#171717]">
                        {city || '—'}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col items-start justify-center gap-2 self-stretch">
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
                </div>
              )}
              {hasBio && (
                <div
                  className="flex w-[361px] max-w-full shrink-0 flex-col items-end gap-6 self-stretch pt-3"
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
                  <div className="flex w-full items-start gap-4 self-stretch">
                    <p className="body-small min-w-0 flex-1 whitespace-pre-wrap text-left text-[#171717]">
                      {bio}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <EditSocialsModal
        open={editSocialsOpen}
        onOpenChange={setEditSocialsOpen}
        profile={profile}
      />
    </div>
  );
}
