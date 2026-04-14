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
  const towns = getSocialUrl('towns', profile.towns_handle || '');
  const fc = getSocialUrl('farcaster', profile.farcaster_handle || '');
  const tg = getSocialUrl('telegram', profile.telegram_handle || '');

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
                  fill="white"
                />
              </svg>
            </a>
          )}
          {towns && (
            <a
              href={towns}
              target="_blank"
              rel="noopener noreferrer"
              className="flex shrink-0 items-center justify-center transition-opacity hover:opacity-70"
              aria-label="Towns"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 49 48"
                fill="none"
                aria-hidden
              >
                <path
                  d="M35.0089 9.28809C36.267 9.32062 38.7966 10.0821 38.8488 12.8672C38.9008 15.6525 38.8704 17.7375 38.8488 18.4316C38.6318 19.2993 37.7099 21.0411 35.7579 21.0674C34.1704 21.0674 34.1634 22.1296 34.3585 22.6611V31.9678C34.3802 32.4235 34.2024 33.5885 33.3175 34.6035C32.4325 35.6186 31.0614 36.9566 30.4865 37.499C30.2912 37.9003 29.399 38.7031 27.3947 38.7031H19.9767C18.8813 38.4862 16.6836 37.4212 16.6573 34.8965C16.6248 31.7402 16.6574 29.2015 13.5988 29.0713C11.1519 28.9672 10.0844 26.6205 9.85657 25.46V20.416C9.83498 20.0579 9.94168 19.1603 10.5402 18.4316C11.1389 17.7028 14.6286 13.1382 16.299 10.9473C16.6677 10.3941 17.9979 9.28821 20.3663 9.28809H35.0089ZM20.0743 11.8584C18.6426 11.8584 18.3708 12.6184 18.4142 12.998C18.3925 13.8877 18.3621 15.9071 18.4142 16.8701C18.4665 17.8328 19.2387 18.0304 19.6183 18.0088H22.4171C23.5101 18.009 23.7619 18.8116 23.7511 19.2129V28.4531C23.7511 29.6764 24.5315 29.9396 24.922 29.918C26.0933 29.9288 28.6899 29.944 29.7052 29.918C30.72 29.8919 30.9522 29.0831 30.9415 28.6816V19.2129C30.9415 18.1717 31.7881 17.9762 32.2111 18.0088C32.8186 18.0305 34.2611 18.0608 35.172 18.0088C36.0825 17.9567 36.3318 17.2282 36.3429 16.8701V12.998C36.3429 12.1391 35.5625 11.8802 35.172 11.8584H20.0743Z"
                  fill="white"
                />
              </svg>
            </a>
          )}
          {fc && (
            <a
              href={fc}
              target="_blank"
              rel="noopener noreferrer"
              className="flex shrink-0 items-center justify-center transition-opacity hover:opacity-70"
              aria-label="Farcaster"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 49 48"
                fill="none"
                aria-hidden
              >
                <path
                  d="M32.932 8.42285H16.4012C14.3777 8.42285 12.4371 9.22668 11.0063 10.6575C9.57544 12.0883 8.77161 14.0289 8.77161 16.0524L8.77161 31.9474C8.77161 33.9709 9.57544 35.9115 11.0063 37.3423C12.4371 38.7732 14.3777 39.577 16.4012 39.577H32.932C34.9554 39.577 36.8961 38.7732 38.3269 37.3423C39.7577 35.9115 40.5615 33.9709 40.5615 31.9474V16.0524C40.5615 14.0289 39.7577 12.0883 38.3269 10.6575C36.8961 9.22668 34.9554 8.42285 32.932 8.42285ZM34.0128 31.1606V31.8282C34.1026 31.8184 34.1935 31.8275 34.2797 31.8549C34.3658 31.8822 34.4452 31.9273 34.513 31.9871C34.5807 32.047 34.6351 32.1203 34.6728 32.2024C34.7106 32.2845 34.7307 32.3736 34.7321 32.464V33.2164H27.9197V32.4627C27.9212 32.3723 27.9416 32.2832 27.9794 32.2012C28.0173 32.1191 28.0719 32.0459 28.1398 31.9862C28.2076 31.9264 28.2872 31.8815 28.3734 31.8543C28.4596 31.8271 28.5505 31.8182 28.6403 31.8282V31.1606C28.6403 30.8692 28.843 30.6281 29.1145 30.5539L29.1013 24.7735C28.892 22.4727 26.929 20.6699 24.5407 20.6699C22.1525 20.6699 20.1895 22.4727 19.9802 24.7735L19.967 30.546C20.269 30.6016 20.6716 30.8215 20.6822 31.1606V31.8282C20.7721 31.8184 20.863 31.8275 20.9491 31.8549C21.0352 31.8822 21.1147 31.9273 21.1824 31.9871C21.2501 32.047 21.3045 32.1203 21.3423 32.2024C21.38 32.2845 21.4002 32.3736 21.4015 32.464V33.2164H14.5892V32.4627C14.5907 32.3724 14.611 32.2835 14.6488 32.2015C14.6866 32.1196 14.7411 32.0464 14.8088 31.9867C14.8764 31.927 14.9558 31.882 15.0419 31.8548C15.1279 31.8275 15.2187 31.8184 15.3084 31.8282V31.1606C15.3084 30.8255 15.5747 30.5592 15.9098 30.5354V20.0778H15.2607L14.4527 17.3876H17.9509V14.7835H31.1305V17.3876H34.8685L34.0605 20.0765H33.4115V30.5354C33.7452 30.5579 34.0128 30.8268 34.0128 31.1606Z"
                  fill="white"
                />
              </svg>
            </a>
          )}
          {tg && (
            <a
              href={tg}
              target="_blank"
              rel="noopener noreferrer"
              className="flex shrink-0 items-center justify-center transition-opacity hover:opacity-70"
              aria-label="Telegram"
            >
              <Image
                src="/telegram-black.svg"
                alt=""
                width={24}
                height={24}
                className="brightness-0 invert"
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
