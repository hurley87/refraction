'use client';

import Image from 'next/image';
import type { UserProfile } from '@/lib/types';
import { getSocialUrl } from '@/lib/utils/social-links';

interface DashboardSocialLinksProps {
  profile: UserProfile | null | undefined;
}

function websiteHref(website?: string): string | null {
  const w = website?.trim();
  if (!w) return null;
  return w.startsWith('http') ? w : `https://${w}`;
}

/**
 * Two-column social frame below profile: outer flex pt-3 items-end gap-6;
 * left 141px column (FOLLOW + icons); right column (WEBSITE + link).
 */
export default function DashboardSocialLinks({
  profile,
}: DashboardSocialLinksProps) {
  if (!profile) return null;

  const tw = getSocialUrl('twitter', profile.twitter_handle || '');
  const ig = getSocialUrl('instagram', profile.instagram_handle || '');

  const href = websiteHref(profile.website);
  const websiteLabel = profile.website?.trim() ?? '';

  return (
    <div className="mb-[20px] flex items-end gap-6 self-stretch pt-3">
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
              fill="white"
            />
          </svg>
          <span className="label-small uppercase text-white">FOLLOW</span>
        </div>
        <div className="flex w-full items-center justify-between gap-1">
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

      {/* Right: WEBSITE + url — flex column, 56px tall, padded, left border */}
      <div
        className="flex h-14 min-w-0 flex-[1_0_0] flex-col items-start gap-3 self-stretch overflow-hidden py-0 pl-6 pr-4"
        style={{
          borderLeft: '1px solid var(--Borders-Heavy-Border, #A9A9A9)',
        }}
      >
        <div className="flex items-center gap-2">
          <Image
            src="/globe.svg"
            alt=""
            width={16}
            height={16}
            className="h-4 w-4 shrink-0 brightness-0 invert"
          />
          <span className="label-small uppercase text-white">WEBSITE</span>
        </div>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-w-0 max-w-full items-center gap-2 transition-opacity hover:opacity-80"
          >
            <span className="label-small min-w-0 flex-1 truncate text-left text-white underline decoration-white/50">
              {websiteLabel}
            </span>
            <Image
              src="/home/arrow-right.svg"
              alt=""
              width={16}
              height={16}
              className="h-4 w-4 shrink-0 brightness-0 invert"
            />
          </a>
        ) : (
          <span className="label-small text-left text-white/60">
            No website
          </span>
        )}
      </div>
    </div>
  );
}
