'use client';
import Image from 'next/image';
import { toast } from 'sonner';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { MapCheckinAvatarStack } from '@/components/map/map-checkin-avatar-stack';
import { CheckInSuccessScreen } from '@/components/map/check-in-success-screen';
import { MapPinImage } from '@/components/map/map-pin-image';
import { cn } from '@/lib/utils';
import {
  formatLocationCategory,
  isSingleWordLocationCategory,
} from '@/lib/utils/format-location-category';
import {
  getCheckinDisplayName,
  getCheckinInitial,
  buildLocationShareUrl,
} from '@/lib/map/checkin-display';
import type {
  MarkerData,
  LocationCheckinPreview,
} from '@/components/map/interactive-map-types';
type LocationCheckInDialogProps = {
  open: boolean;
  onClose: () => void;
  overlayClassName: string;
  shellClassName: string;
  panelClassName: string;
  checkInSuccess: boolean;
  checkInTarget: MarkerData | null;
  isCheckingIn: boolean;
  favoritePlaceIds: Set<string> | undefined;
  onToggleFavorite: (placeId: string) => void;
  isFavoritePending: boolean;
  locationCheckins: LocationCheckinPreview[];
  isLoadingLocationCheckins: boolean;
  locationCheckinsError: string | null;
  hasUserCheckedInAtLocation: boolean;
  checkInPointsEarned: number;
  checkInTotalPoints: number;
  onOpenCommentModal: () => void;
};
export function LocationCheckInDialog({
  open,
  onClose,
  overlayClassName,
  shellClassName,
  panelClassName,
  checkInSuccess,
  checkInTarget,
  isCheckingIn,
  favoritePlaceIds,
  onToggleFavorite,
  isFavoritePending,
  locationCheckins,
  isLoadingLocationCheckins,
  locationCheckinsError,
  hasUserCheckedInAtLocation,
  checkInPointsEarned,
  checkInTotalPoints,
  onOpenCommentModal,
}: LocationCheckInDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        hideCloseButton
        overlayClassName={overlayClassName}
        className={shellClassName}
      >
        <div className={panelClassName}>
          {/* Hero: location image — first row */}
          {!checkInSuccess && (
            <div className="relative flex h-[258px] w-full shrink-0 items-start overflow-hidden border border-white/15 bg-lightgray p-2">
              {checkInTarget?.imageUrl ? (
                <Image
                  src={checkInTarget.imageUrl}
                  alt=""
                  fill
                  priority
                  sizes="393px"
                  className="object-cover object-center"
                />
              ) : null}
              {checkInTarget?.name ? (
                <button
                  type="button"
                  onClick={() => {
                    const locationName = checkInTarget.name.trim();
                    if (!locationName) return;
                    // Always share by display name — never place_id / Mapbox id.
                    const shareUrl = buildLocationShareUrl(locationName);
                    void navigator.clipboard
                      .writeText(shareUrl)
                      .then(() => {
                        const next = new URL(shareUrl);
                        window.history.replaceState(
                          null,
                          '',
                          `${next.pathname}${next.search}`
                        );
                        toast.success('Link copied to clipboard');
                      })
                      .catch(() => {
                        toast.error('Failed to copy link');
                      });
                  }}
                  className="absolute left-2 top-2 z-10 flex size-10 shrink-0 items-center justify-center gap-4 rounded-[179px] border border-[var(--Borders-Light-Border,#DBDBDB)] bg-[var(--Backgrounds-Background,#FFF)] p-[var(--sds-size-space-200)] shadow-[0_1px_8px_0_rgba(0,0,0,0.08)] transition-opacity hover:opacity-90"
                  aria-label="Share Location"
                >
                  <svg
                    className="size-6 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#757575"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                </button>
              ) : null}
              <button
                onClick={onClose}
                className="absolute right-2 top-2 z-10 flex size-10 shrink-0 items-center justify-center gap-4 rounded-[179px] border border-[var(--Borders-Light-Border,#DBDBDB)] bg-[var(--Backgrounds-Background,#FFF)] p-[var(--sds-size-space-200)] shadow-[0_1px_8px_0_rgba(0,0,0,0.08)] transition-opacity hover:opacity-90 disabled:opacity-50"
                aria-label="Close"
                disabled={isCheckingIn}
                type="button"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width={24}
                  height={24}
                  viewBox="0 0 24 24"
                  fill="none"
                  className="size-6 shrink-0 aspect-square"
                  aria-hidden
                >
                  <path
                    d="M19.9987 7.32025L16.7199 4L12.0122 8.69045L7.32171 4L4.00146 7.32025L8.69538 11.9969L4.00146 16.6735L7.32171 19.9938L12.0122 15.3033L16.7199 19.9938L19.9987 16.6735L15.3186 11.9969L19.9987 7.32025Z"
                    fill="#757575"
                  />
                </svg>
              </button>
            </div>
          )}
          {/* Check-In Dialog Content */}
          <div
            className={cn(
              'relative w-full min-h-0 flex-1',
              checkInSuccess
                ? 'flex flex-col overflow-hidden'
                : 'overflow-y-auto'
            )}
          >
            {!checkInSuccess ? (
              <>
                {checkInTarget && (
                  <div className="flex h-[330px] w-full shrink-0 flex-col items-start gap-0 self-stretch px-4 pb-0 pt-0">
                    <div className="flex w-full items-center justify-between gap-2 bg-[#ffffff] pb-4 pt-4">
                      <h3 className="min-w-0 flex-1 line-clamp-1 leading-tight tracking-[-0.3px] text-[#1a1a1a]">
                        {checkInTarget.name || 'Selected Location'}
                      </h3>
                      {checkInTarget.place_id ? (
                        <button
                          type="button"
                          onClick={() =>
                            onToggleFavorite(checkInTarget.place_id)
                          }
                          disabled={isFavoritePending}
                          className={cn(
                            'flex size-8 shrink-0 items-center justify-center gap-4 p-[var(--sds-size-space-100)] transition-opacity hover:opacity-90 disabled:opacity-50',
                            favoritePlaceIds?.has(checkInTarget.place_id)
                              ? 'bg-[var(--Backgrounds-Secondary-CTA-BG,#DBDBDB)]'
                              : 'border border-[var(--Borders-Light-Border,#DBDBDB)] bg-[var(--Backgrounds-Background,#FFF)] shadow-[0_1px_8px_0_rgba(0,0,0,0.08)]'
                          )}
                          aria-label={
                            favoritePlaceIds?.has(checkInTarget.place_id)
                              ? 'Remove from favorites'
                              : 'Add to favorites'
                          }
                          aria-pressed={favoritePlaceIds?.has(
                            checkInTarget.place_id
                          )}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width={16}
                            height={16}
                            viewBox="0 0 16 16"
                            fill="none"
                            className="size-4 shrink-0"
                            aria-hidden
                          >
                            <path
                              d="M13.3369 13.9974L7.99953 11.6311L2.66211 13.9974V2H13.3369V13.9974ZM8.00175 9.02329L10.8949 10.3046V4.37273H5.10861V10.3046L8.00175 9.02329Z"
                              fill={
                                favoritePlaceIds?.has(checkInTarget.place_id)
                                  ? '#171717'
                                  : '#757575'
                              }
                            />
                          </svg>
                        </button>
                      ) : null}
                    </div>
                    <div
                      className={`flex w-full items-center self-stretch ${isSingleWordLocationCategory(checkInTarget.category) ? 'justify-between' : 'justify-end'}`}
                    >
                      {isSingleWordLocationCategory(checkInTarget.category) ? (
                        <p className="flex label-small items-center justify-center gap-2 border border-[#171717] px-1 py-0.5  uppercase tracking-[0.3px] text-[#171717]">
                          {formatLocationCategory(checkInTarget.category)}
                        </p>
                      ) : null}
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${checkInTarget.latitude},${checkInTarget.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="title5 flex items-center gap-1 uppercase text-[#171717] underline"
                      >
                        Maps Link
                        <Image
                          src="/arrow-diag-right-black-on-white.svg"
                          alt=""
                          width={16}
                          height={16}
                        />
                      </a>
                    </div>
                    <div className="mt-4 flex w-full items-center">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 shrink-0 aspect-square"
                      >
                        <path
                          d="M12.4492 6.60348C12.2698 3.59906 10.1489 2.04842 8.00027 2.0007C5.8514 2.04842 3.73051 3.59906 3.55108 6.60348C3.4639 9.67401 5.67749 12.4517 8.00004 14C10.3225 12.4517 12.5364 9.67401 12.4492 6.60348ZM8.00027 8.4728C6.65911 8.4728 5.57161 7.37821 5.57161 6.02778C5.57161 4.67735 6.65888 3.58276 8.00027 3.58276C9.34167 3.58276 10.4289 4.67735 10.4289 6.02778C10.4289 7.37821 9.34167 8.4728 8.00027 8.4728Z"
                          fill="#A9A9A9"
                        />
                      </svg>
                      <p className="label-small ml-2 line-clamp-1 text-[#454545]">
                        {checkInTarget.address || checkInTarget.name}
                      </p>
                    </div>
                    <div className="mt-3 flex w-full items-start pb-4">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 shrink-0 aspect-square"
                      >
                        <path
                          d="M8 14C4.69123 14 2 11.3088 2 8C2 4.69123 4.69123 2 8 2C11.3088 2 14 4.69123 14 8C14 11.3088 11.3088 14 8 14ZM8 4.00974C5.80024 4.00974 4.00974 5.80024 4.00974 8C4.00974 10.1998 5.80024 11.9903 8 11.9903C10.1998 11.9903 11.9903 10.1998 11.9903 8C11.9903 5.80024 10.1998 4.00974 8 4.00974Z"
                          fill="#A9A9A9"
                        />
                        <path
                          d="M7.26489 10.7386V6.62662H8.75289V10.7386H7.26489ZM7.27289 6.13862V5.01862H8.75289V6.13862H7.27289Z"
                          fill="#A9A9A9"
                        />
                      </svg>
                      <p className="body-small ml-2 text-[#454545]">
                        {checkInTarget.description ||
                          'No description provided.'}
                      </p>
                    </div>
                    {/* Reviews / Check-ins */}{' '}
                    <div
                      className={`relative w-full flex-1 ${checkInSuccess ? 'overflow-hidden' : 'overflow-y-auto'}`}
                    >
                      {!checkInSuccess ? (
                        <>
                          {checkInTarget && (
                            <div className="flex h-[330px] w-full shrink-0 flex-col items-start gap-0 self-stretch px-2 pb-0 pt-0">
                              <div className="flex w-full flex-col justify-start bg-[#ffffff] px-3 pb-4 pt-4">
                                <h3 className="line-clamp-1  leading-tight tracking-[-0.3px] text-[#1a1a1a]">
                                  {checkInTarget.name || 'Selected Location'}
                                </h3>
                              </div>
                              <div
                                className={`flex w-full items-center self-stretch ${isSingleWordLocationCategory(checkInTarget.category) ? 'justify-between' : 'justify-end'}`}
                              >
                                {isSingleWordLocationCategory(
                                  checkInTarget.category
                                ) ? (
                                  <p className="flex label-small items-center justify-center gap-2 border border-[#171717] px-1 py-0.5  uppercase tracking-[0.3px] text-[#171717]">
                                    {formatLocationCategory(
                                      checkInTarget.category
                                    )}
                                  </p>
                                ) : null}
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${checkInTarget.latitude},${checkInTarget.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="title5 flex items-center uppercase font-bold gap-1 text-[#171717] underline"
                                >
                                  Maps Link
                                  <Image
                                    src="/arrow-diag-right-black-on-white.svg"
                                    alt=""
                                    width={16}
                                    height={16}
                                  />
                                </a>
                              </div>
                              <div className="mt-4 flex w-full items-center">
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 16 16"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4 shrink-0 aspect-square"
                                >
                                  <path
                                    d="M12.4492 6.60348C12.2698 3.59906 10.1489 2.04842 8.00027 2.0007C5.8514 2.04842 3.73051 3.59906 3.55108 6.60348C3.4639 9.67401 5.67749 12.4517 8.00004 14C10.3225 12.4517 12.5364 9.67401 12.4492 6.60348ZM8.00027 8.4728C6.65911 8.4728 5.57161 7.37821 5.57161 6.02778C5.57161 4.67735 6.65888 3.58276 8.00027 3.58276C9.34167 3.58276 10.4289 4.67735 10.4289 6.02778C10.4289 7.37821 9.34167 8.4728 8.00027 8.4728Z"
                                    fill="#A9A9A9"
                                  />
                                </svg>
                                <p className="label-small ml-2 line-clamp-1 text-[#454545]">
                                  {checkInTarget.address || checkInTarget.name}
                                </p>
                              </div>
                              <div className="mt-3 flex w-full items-start pb-4">
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 16 16"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4 shrink-0 aspect-square"
                                >
                                  <path
                                    d="M8 14C4.69123 14 2 11.3088 2 8C2 4.69123 4.69123 2 8 2C11.3088 2 14 4.69123 14 8C14 11.3088 11.3088 14 8 14ZM8 4.00974C5.80024 4.00974 4.00974 5.80024 4.00974 8C4.00974 10.1998 5.80024 11.9903 8 11.9903C10.1998 11.9903 11.9903 10.1998 11.9903 8C11.9903 5.80024 10.1998 4.00974 8 4.00974Z"
                                    fill="#A9A9A9"
                                  />
                                  <path
                                    d="M7.26489 10.7386V6.62662H8.75289V10.7386H7.26489ZM7.27289 6.13862V5.01862H8.75289V6.13862H7.27289Z"
                                    fill="#A9A9A9"
                                  />
                                </svg>
                                <p className="body-small ml-2 text-[#454545]">
                                  {checkInTarget.description ||
                                    'No description provided.'}
                                </p>
                              </div>
                              {/* Reviews / Check-ins */}
                              <section className="flex w-full flex-col items-center gap-4 self-stretch border-t border-[#171717] bg-white pt-4">
                                <div className="flex w-full items-center justify-between">
                                  <span className="label-small flex h-[22px] flex-[1_0_0] flex-col justify-center uppercase text-[#757575]">
                                    CHECK-INS
                                  </span>
                                  <div className="flex items-center justify-center gap-2">
                                    {locationCheckins.length > 0 ? (
                                      <MapCheckinAvatarStack
                                        checkins={locationCheckins}
                                      />
                                    ) : (
                                      <div className="flex size-4 items-center justify-center rounded-full bg-[#e8e8e8] text-[8px] font-semibold text-[#999]">
                                        +
                                      </div>
                                    )}
                                    {locationCheckins.length > 3 ? (
                                      <span className="label-small text-[#454545]">
                                        +{locationCheckins.length - 3} OTHERS
                                      </span>
                                    ) : locationCheckins.length === 0 ? (
                                      <span className="label-small text-[#454545]">
                                        Be first
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                                <div className="flex h-[524px] w-full shrink-0 flex-col items-start self-stretch space-y-2">
                                  {isLoadingLocationCheckins ? (
                                    <div className="rounded-xl bg-[#f8f8f8] p-3 animate-pulse">
                                      <div className="flex items-center gap-2">
                                        <div className="size-8 rounded-full bg-[#e8e8e8]" />
                                        <div className="flex-1 space-y-1.5">
                                          <div className="h-2.5 w-16 rounded bg-[#e8e8e8]" />
                                          <div className="h-2 w-12 rounded bg-[#e8e8e8]" />
                                        </div>
                                      </div>
                                    </div>
                                  ) : locationCheckinsError ? (
                                    <div className="rounded-xl bg-[#f8f8f8] p-3">
                                      <p className="text-xs text-[#999] text-center">
                                        {locationCheckinsError}
                                      </p>
                                    </div>
                                  ) : locationCheckins.length === 0 ? (
                                    <div className="rounded-xl bg-[#f8f8f8] p-3 text-center">
                                      <p className="text-[11px] text-[#999] leading-relaxed">
                                        No check-ins yet. Be the first to share!
                                      </p>
                                    </div>
                                  ) : (
                                    locationCheckins
                                      .slice(0, 3)
                                      .map((entry) => (
                                        <div
                                          key={entry.id}
                                          className="w-full rounded-xl bg-[#ffffff] p-2.5"
                                        >
                                          <div className="flex w-full items-start gap-2 border-t border-[#DBDBDB] pt-4">
                                            <div className="size-7 rounded-full bg-gradient-to-br from-[#fff3d7] via-[#ffd1a8] to-[#ffb27d] text-[10px] font-semibold text-[#313131] flex items-center justify-center shrink-0 overflow-hidden">
                                              {entry.profilePictureUrl ? (
                                                <img
                                                  src={entry.profilePictureUrl}
                                                  alt={getCheckinDisplayName(
                                                    entry
                                                  )}
                                                  className="size-7 rounded-full object-cover"
                                                />
                                              ) : (
                                                getCheckinInitial(entry)
                                              )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center justify-between gap-2"></div>
                                              <p className="leading-snug text-[#454545] mt-0.5 body-small">
                                                {entry.comment}
                                              </p>
                                              <div className="mt-2 inline-flex self-start items-center justify-center gap-[var(--sds-size-space-050)] border border-solid border-[var(--Text-Support-Text,#A9A9A9)] px-[var(--sds-size-space-100)] py-[var(--sds-size-space-050)]">
                                                <svg
                                                  width="16"
                                                  height="16"
                                                  viewBox="0 0 16 16"
                                                  fill="none"
                                                  xmlns="http://www.w3.org/2000/svg"
                                                  className="h-4 w-4 shrink-0"
                                                >
                                                  <path
                                                    d="M3.05009 8.71835C3.52996 8.26915 4.16079 8.01803 4.81751 8.01586C6.33908 8.01045 8.74814 7.9769 8.74814 7.9769H9.69817C10.2535 7.9769 10.7043 8.42935 10.7043 8.98679C10.7043 9.54424 10.2535 9.99669 9.69817 9.99669H6.28085C6.08675 9.99669 5.92931 10.1547 5.92931 10.3496C5.92931 10.5444 6.08675 10.7024 6.28085 10.7024H9.74671C10.6428 10.7024 11.3696 9.97288 11.3696 9.07339V8.6231C11.3696 8.51378 11.4117 8.4077 11.4883 8.32868L12.8955 6.79056C13.2891 6.35976 13.962 6.34677 14.3718 6.7635C14.7438 7.14126 14.7665 7.74093 14.4246 8.14575L11.6597 11.4179C11.2607 11.8898 10.6752 12.1615 10.0584 12.1615H5.57776L4.29343 13.0372C4.25353 13.0773 1.56519 10.1093 1.56519 10.1093L3.05117 8.71835H3.05009ZM8.68237 3.33331C7.55332 3.33331 6.63886 4.2512 6.63886 5.3845C6.63886 6.51779 7.55332 7.43569 8.68237 7.43569C9.81141 7.43569 10.7259 6.51779 10.7259 5.3845C10.7259 4.2512 9.81141 3.33331 8.68237 3.33331Z"
                                                    fill="#757575"
                                                  />
                                                </svg>
                                                <span className="label-small text-[#171717]">
                                                  +{entry.pointsEarned}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ))
                                  )}
                                </div>
                              </section>
                            </div>
                          )}
                        </>
                      ) : (
                        /* Success Screen */
                        <div
                          className="relative flex flex-col items-center justify-center min-h-[400px] w-full overflow-hidden"
                          style={{
                            backgroundImage: "url('/city-bg.jpg')",
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                          }}
                        >
                          <div className="relative z-10 flex flex-col items-center gap-7 px-4 py-16 w-full h-full justify-center">
                            {/* Location Marker Icon */}
                            <div
                              className="relative shrink-0"
                              style={{ width: '46px', height: '66px' }}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="46"
                                height="66"
                                viewBox="0 0 46 66"
                                fill="none"
                                className="absolute inset-0"
                              >
                                <g filter="url(#filter_checkin_success)">
                                  <path
                                    d="M41.2 16.6438C41.2 25.836 25.9572 45 25.2 45C24.4429 45 9.20001 25.836 9.20001 16.6438C9.20001 7.4517 16.3635 0 25.2 0C34.0366 0 41.2 7.4517 41.2 16.6438Z"
                                    fill="white"
                                  />
                                </g>
                                <defs>
                                  <filter
                                    id="filter_checkin_success"
                                    x="0"
                                    y="0"
                                    width="50.4"
                                    height="64.2"
                                    filterUnits="userSpaceOnUse"
                                    colorInterpolationFilters="sRGB"
                                  >
                                    <feFlood
                                      floodOpacity="0"
                                      result="BackgroundImageFix"
                                    />
                                    <feColorMatrix
                                      in="SourceAlpha"
                                      type="matrix"
                                      values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                                      result="hardAlpha"
                                    />
                                    <feOffset dy="10" />
                                    <feGaussianBlur stdDeviation="4.6" />
                                    <feComposite
                                      in2="hardAlpha"
                                      operator="out"
                                    />
                                    <feColorMatrix
                                      type="matrix"
                                      values="0 0 0 0 1 0 0 0 0 0.949019608 0 0 0 0 0 0 0 0 1 0"
                                    />
                                    <feBlend
                                      mode="normal"
                                      in2="BackgroundImageFix"
                                      result="effect1_dropShadow_7557_31214"
                                    />
                                    <feBlend
                                      mode="normal"
                                      in="SourceGraphic"
                                      in2="effect1_dropShadow_7557_31214"
                                      result="shape"
                                    />
                                  </filter>
                                </defs>
                              </svg>
                              {checkInTarget?.imageUrl && (
                                <div
                                  className="absolute bg-[#ededed] rounded-full shadow-[0px_0px_16px_0px_rgba(255,255,255,0.7)]"
                                  style={{
                                    width: '30px',
                                    height: '30px',
                                    top: '0px',
                                    left: '10px',
                                  }}
                                >
                                  <MapPinImage
                                    imageUrl={checkInTarget.imageUrl}
                                    imageThumbUrl={checkInTarget.imageThumbUrl}
                                    alt={checkInTarget.name}
                                    className="w-full h-full rounded-full object-cover"
                                  />
                                </div>
                              )}
                            </div>
                            {/* Upper Section */}
                            <div className="flex flex-col gap-4 items-center w-full">
                              {/* Reward Section */}
                              <div className="flex flex-col gap-2 items-center w-full">
                                <p className="text-[11px] text-white uppercase tracking-[0.44px] font-medium">
                                  You Earned
                                </p>
                                <p
                                  className="text-6xl text-white tracking-[-4px] font-bold"
                                  style={{
                                    fontFamily:
                                      '"Pleasure Variable Trial", sans-serif',
                                  }}
                                >
                                  {checkInPointsEarned}
                                </p>
                              </div>
                              {/* Checking In At Section */}
                              <div className="flex flex-col gap-2 items-center w-full">
                                <p
                                  className="text-[11px] text-white uppercase tracking-[0.44px]"
                                  style={{
                                    fontFamily:
                                      '"ABC Monument Grotesk Semi-Mono Unlicensed Trial", sans-serif',
                                    fontWeight: 500,
                                  }}
                                >
                                  Checking In At
                                </p>
                                <div className="flex items-center">
                                  <div className="flex gap-1 items-center justify-center border border-white rounded-full px-2 py-1.5">
                                    <div className="shrink-0 w-4 h-4">
                                      <svg
                                        className="w-4 h-4 text-white"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                        />
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                        />
                                      </svg>
                                    </div>
                                    <p className="text-[11px] text-white uppercase tracking-[0.44px] font-medium">
                                      {checkInTarget?.name || 'Location'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <section className="flex w-full flex-col items-center gap-4 self-stretch border-t border-[#171717] bg-white pt-4">
                      <div className="flex w-full items-center justify-between">
                        <span className="label-small flex h-[22px] flex-[1_0_0] flex-col justify-center uppercase text-[#757575]">
                          CHECK-INS
                        </span>
                        <div className="flex items-center justify-center gap-2">
                          {locationCheckins.length > 0 ? (
                            <MapCheckinAvatarStack
                              checkins={locationCheckins}
                            />
                          ) : (
                            <div className="flex size-4 items-center justify-center rounded-full bg-[#e8e8e8] text-[8px] font-semibold text-[#999]">
                              +
                            </div>
                          )}
                          {locationCheckins.length > 3 ? (
                            <span className="label-small text-[#454545]">
                              +{locationCheckins.length - 3} OTHERS
                            </span>
                          ) : locationCheckins.length === 0 ? (
                            <span className="label-small text-[#454545]">
                              Be first
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex h-[524px] w-full shrink-0 flex-col items-start self-stretch space-y-2 [&>*]:w-full">
                        {isLoadingLocationCheckins ? (
                          <div className="rounded-xl bg-[#f8f8f8] p-3 animate-pulse">
                            <div className="flex items-center gap-2">
                              <div className="size-8 rounded-full bg-[#e8e8e8]" />
                              <div className="flex-1 space-y-1.5">
                                <div className="h-2.5 w-16 rounded bg-[#e8e8e8]" />
                                <div className="h-2 w-12 rounded bg-[#e8e8e8]" />
                              </div>
                            </div>
                          </div>
                        ) : locationCheckinsError ? (
                          <div className="rounded-xl bg-[#f8f8f8] p-3">
                            <p className="text-xs text-[#999] text-center">
                              {locationCheckinsError}
                            </p>
                          </div>
                        ) : locationCheckins.length === 0 ? (
                          <div className="rounded-xl bg-[#f8f8f8] p-3 text-center">
                            <p className="text-[11px] text-[#999] leading-relaxed">
                              No check-ins yet. Be the first to share!
                            </p>
                          </div>
                        ) : (
                          locationCheckins.slice(0, 3).map((entry) => (
                            <div
                              key={entry.id}
                              className="rounded-xl bg-[#ffffff]"
                            >
                              <div className="flex w-full items-start gap-2 border-t border-[#DBDBDB] pt-4">
                                <div className="size-7 rounded-full bg-gradient-to-br from-[#fff3d7] via-[#ffd1a8] to-[#ffb27d]  font-semibold text-[#313131] flex items-center justify-center shrink-0 overflow-hidden">
                                  {entry.profilePictureUrl ? (
                                    <img
                                      src={entry.profilePictureUrl}
                                      alt={getCheckinDisplayName(entry)}
                                      className="size-7 rounded-full object-cover"
                                    />
                                  ) : (
                                    getCheckinInitial(entry)
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2"></div>
                                  <p className="leading-snug text-[#454545] mt-0.5 body-small">
                                    {entry.comment}
                                  </p>
                                  <div className="mt-2 inline-flex self-start items-center justify-center gap-[var(--sds-size-space-050)] border border-solid border-[var(--Text-Support-Text,#A9A9A9)] px-[var(--sds-size-space-100)] py-[var(--sds-size-space-050)]">
                                    <svg
                                      width="16"
                                      height="16"
                                      viewBox="0 0 16 16"
                                      fill="none"
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-4 w-4 shrink-0"
                                    >
                                      <path
                                        d="M3.05009 8.71835C3.52996 8.26915 4.16079 8.01803 4.81751 8.01586C6.33908 8.01045 8.74814 7.9769 8.74814 7.9769H9.69817C10.2535 7.9769 10.7043 8.42935 10.7043 8.98679C10.7043 9.54424 10.2535 9.99669 9.69817 9.99669H6.28085C6.08675 9.99669 5.92931 10.1547 5.92931 10.3496C5.92931 10.5444 6.08675 10.7024 6.28085 10.7024H9.74671C10.6428 10.7024 11.3696 9.97288 11.3696 9.07339V8.6231C11.3696 8.51378 11.4117 8.4077 11.4883 8.32868L12.8955 6.79056C13.2891 6.35976 13.962 6.34677 14.3718 6.7635C14.7438 7.14126 14.7665 7.74093 14.4246 8.14575L11.6597 11.4179C11.2607 11.8898 10.6752 12.1615 10.0584 12.1615H5.57776L4.29343 13.0372C4.25353 13.0773 1.56519 10.1093 1.56519 10.1093L3.05117 8.71835H3.05009ZM8.68237 3.33331C7.55332 3.33331 6.63886 4.2512 6.63886 5.3845C6.63886 6.51779 7.55332 7.43569 8.68237 7.43569C9.81141 7.43569 10.7259 6.51779 10.7259 5.3845C10.7259 4.2512 9.81141 3.33331 8.68237 3.33331Z"
                                        fill="#757575"
                                      />
                                    </svg>
                                    <span className="label-small text-[#171717]">
                                      +{entry.pointsEarned}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </section>
                  </div>
                )}
              </>
            ) : checkInTarget ? (
              <CheckInSuccessScreen
                target={checkInTarget}
                pointsEarned={checkInPointsEarned}
                totalPoints={checkInTotalPoints}
                onBackToMap={onClose}
              />
            ) : null}
          </div>
          {/* Footer */}
          {!checkInSuccess ? (
            <div className="sticky bottom-0 z-20 w-full border-t border-[#DBDBDB] bg-white px-4 py-2">
              <div className="flex w-full items-center justify-between gap-2 self-stretch">
                <div className="flex self-stretch items-center gap-2 border border-[#DBDBDB] pl-2 pr-4">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12.2716 2.99296C12.0826 2.84567 11.8803 2.71177 11.6557 2.61804C9.99048 1.91953 7.6916 1.88382 5.93186 2.16278C5.12148 2.2911 3.4529 2.70954 3.27393 3.67808L3.28615 11.8962C3.28615 12.2811 3.66411 12.5947 3.95536 12.7743C4.51896 13.1213 5.12258 13.2898 5.77623 13.4048C7.59266 13.7239 10.1672 13.706 11.8758 12.8725C12.2238 12.7029 12.7229 12.2677 12.7229 11.8638L12.7262 3.91575C12.7262 3.52856 12.565 3.2217 12.2705 2.99296H12.2716ZM11.8514 7.58794C11.8514 7.77986 11.7569 7.96174 11.5946 8.06217C11.101 8.36902 10.2417 8.5509 9.79483 8.6145C8.24853 8.83655 5.92408 8.8187 4.49006 8.1068C4.23438 7.98853 4.16546 7.85128 4.15435 7.66717C4.14323 7.48306 4.16546 6.96866 4.16546 6.94857C6.09861 7.86355 9.90822 7.88587 11.8503 6.94188L11.8525 7.58794H11.8514ZM5.55835 3.14471C7.14356 2.79992 8.78434 2.79099 10.3729 3.12574C10.6975 3.19492 11.7747 3.50959 11.8325 3.81532C11.8847 4.09428 10.7764 4.43796 10.4774 4.50491C8.83215 4.87425 7.14578 4.86421 5.52389 4.50268C5.23153 4.43796 4.12989 4.10209 4.16213 3.81198C4.19325 3.53191 5.24932 3.21166 5.55835 3.1436V3.14471ZM4.15879 4.90437C6.09194 5.81935 9.90155 5.84167 11.8436 4.89768L11.8458 5.54375C11.8458 5.73567 11.7513 5.91755 11.589 6.01797C11.0955 6.32483 10.2362 6.5067 9.78927 6.5703C8.24297 6.79235 5.91852 6.7745 4.4845 6.0626C4.22882 5.94433 4.15991 5.80708 4.14879 5.62297C4.13767 5.43886 4.1599 4.92446 4.1599 4.90437H4.15879ZM4.15879 8.93475C6.09194 9.84973 9.90155 9.87204 11.8436 8.92805L11.8458 9.57412C11.8458 9.76604 11.7513 9.94792 11.589 10.0483C11.0955 10.3552 10.2362 10.5371 9.78927 10.6007C8.24297 10.8227 5.91852 10.8049 4.4845 10.093C4.22882 9.9747 4.15991 9.83745 4.14879 9.65334C4.13767 9.46923 4.1599 8.95483 4.1599 8.93475H4.15879ZM11.5946 12.0725C11.101 12.3793 10.2417 12.5612 9.79483 12.6248C8.24853 12.8468 5.92408 12.829 4.49006 12.1171C4.23438 11.9988 4.16546 11.8616 4.15435 11.6775C4.14323 11.4933 4.16546 10.9789 4.16546 10.9589C6.09861 11.8738 9.90822 11.8962 11.8503 10.9522L11.8525 11.5982C11.8525 11.7902 11.758 11.972 11.5957 12.0725H11.5946Z"
                      fill="#757575"
                    />
                  </svg>
                  <span className="label-medium text-[#000000]">
                    {checkInTarget?.points_value ?? 100}
                  </span>
                  <svg
                    width="32"
                    height="18"
                    viewBox="0 0 32 18"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M32 18H0V0H32V18ZM22.5732 5.2959C21.9935 5.29593 21.4873 5.39475 21.0566 5.59277C20.6252 5.79157 20.2953 6.06956 20.0664 6.42871C19.8375 6.78718 19.7236 7.20801 19.7236 7.68848C19.7237 8.16857 19.824 8.53138 20.0264 8.84375C20.2281 9.15694 20.5131 9.40625 20.8789 9.59375C21.2448 9.78047 21.6915 9.93144 22.2178 10.0459C22.6906 10.1453 23.0479 10.2388 23.2881 10.3262C23.5282 10.4142 23.7026 10.52 23.8096 10.6465C23.9165 10.7722 23.9697 10.9357 23.9697 11.1338C23.9696 11.401 23.8516 11.6204 23.6152 11.792C23.3788 11.9636 23.0352 12.0488 22.585 12.0488C22.1045 12.0488 21.7274 11.9458 21.457 11.7402C21.1863 11.534 21.0393 11.2366 21.0166 10.8477H19.4941C19.5243 11.5801 19.805 12.1676 20.335 12.6104C20.8651 13.0532 21.6232 13.2744 22.6074 13.2744C23.1797 13.2744 23.7008 13.1809 24.1699 12.9941C24.6391 12.8074 25.0134 12.5227 25.292 12.1416C25.5706 11.7598 25.71 11.2907 25.71 10.7334C25.7099 10.0241 25.4887 9.49139 25.0459 9.13672L25.0469 9.13574C24.6041 8.78104 23.9553 8.5269 23.1006 8.37402C22.6654 8.29044 22.3313 8.20663 22.0986 8.12305C21.8661 8.0395 21.6946 7.93748 21.584 7.81934C21.4733 7.7011 21.418 7.55019 21.418 7.36719C21.418 7.10817 21.522 6.90188 21.7275 6.74902C21.9339 6.59629 22.2275 6.52051 22.6084 6.52051C22.9894 6.52054 23.2968 6.60986 23.5068 6.78906C23.7168 6.96828 23.8363 7.21835 23.8672 7.53906H25.4014C25.3404 6.82966 25.0575 6.27787 24.5537 5.88477C24.05 5.49192 23.3901 5.2959 22.5732 5.2959ZM6.99512 13.1582H8.91895V10.4004H10.0859C10.7268 10.4004 11.2786 10.2964 11.7402 10.0908C12.2016 9.88451 12.5528 9.59504 12.793 9.22168C13.0332 8.84823 13.1533 8.40895 13.1533 7.90527C13.1533 7.40146 13.029 6.93009 12.7812 6.55957C12.5335 6.18998 12.1804 5.90503 11.7227 5.70703H11.7236C11.2658 5.50897 10.7193 5.40918 10.0859 5.40918H6.99512V13.1582ZM13.5547 6.70312H15.3975V13.1582H17.332V6.70312H19.1865V5.40918H13.5547V6.70312ZM9.99414 6.69141C10.4136 6.69141 10.7305 6.79539 10.9443 7.00098C11.1582 7.20732 11.2656 7.50844 11.2656 7.90527C11.2656 8.30193 11.157 8.59022 10.9395 8.79199C10.7218 8.99457 10.4061 9.0957 9.99414 9.0957H8.91797V6.69141H9.99414Z"
                      fill="#757575"
                    />
                  </svg>
                </div>
                <button
                  onClick={() => {
                    if (hasUserCheckedInAtLocation) return;
                    onOpenCommentModal();
                  }}
                  disabled={
                    isCheckingIn || !checkInTarget || hasUserCheckedInAtLocation
                  }
                  className={cn(
                    'flex h-11 w-full flex-[1_0_0] self-stretch items-center justify-between px-4 py-2 transition-colors',
                    hasUserCheckedInAtLocation
                      ? 'cursor-not-allowed bg-[#DBDBDB]'
                      : 'bg-[var(--Dark-Tint-100---Ink-Black,#171717)] hover:bg-black disabled:opacity-50'
                  )}
                  type="button"
                >
                  <span
                    className={cn(
                      'label-medium label-large uppercase',
                      hasUserCheckedInAtLocation
                        ? 'text-[#999]'
                        : 'text-[#ffffff]'
                    )}
                  >
                    {hasUserCheckedInAtLocation ? 'CHECKED IN' : 'Check-In'}
                  </span>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="block size-6 max-w-none"
                    aria-hidden="true"
                  >
                    <path
                      d="M14.0822 4L11.8239 6.28605L16 10.1453H2V13.8547H15.9812L11.8239 17.7139L14.0822 20L22 11.9846L14.0822 4Z"
                      fill={hasUserCheckedInAtLocation ? '#b0b0b0' : '#DBDBDB'}
                    />
                  </svg>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
