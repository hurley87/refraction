'use client';

import Image from 'next/image';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatLocationCategory } from '@/lib/utils/format-location-category';
import { MapCheckinAvatarStack } from '@/components/map/map-checkin-avatar-stack';
import type { MapCheckinAvatarEntry } from '@/lib/map/checkin-avatar-utils';
import { cn } from '@/lib/utils';

interface MapCardProps {
  name: string;
  address: string;
  description?: string | null;
  isExisting?: boolean;
  onAction: () => void;
  onClose?: () => void;
  isLoading?: boolean;
  imageUrl?: string | null;
  placeId?: string | null;
  eventUrl?: string | null;
  /**
   * Compact card for map-click “new spot” flow: POI name, address, one primary CTA
   * styled like the check-in dialog footer button.
   */
  variant?: 'default' | 'createPreview' | 'drawerTile';
  /** Label for the primary button when `variant` is `createPreview`. */
  createPreviewActionLabel?: string;
  /** Location category (e.g. from marker `type`); shown on default variant only. */
  type?: string | null;
  /** Recent check-ins for `drawerTile` avatar stack. */
  recentCheckins?: MapCheckinAvatarEntry[];
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
  isFavoriteLoading?: boolean;
}

/** Bookmark icon for drawer-tile favorite toggle (16×16). */
function DrawerFavoriteBookmarkIcon({
  isFavorited,
  className,
}: {
  isFavorited: boolean;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      className={cn('size-4 shrink-0', !isFavorited && 'opacity-40', className)}
      aria-hidden
    >
      <path
        d="M13.3369 13.9974L7.99953 11.6311L2.66211 13.9974V2H13.3369V13.9974ZM8.00175 9.02329L10.8949 10.3046V4.37273H5.10861V10.3046L8.00175 9.02329Z"
        fill="#171717"
      />
    </svg>
  );
}

function FavoriteToggleButton({
  isFavorited = false,
  onToggleFavorite,
  isFavoriteLoading = false,
  className,
}: {
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
  isFavoriteLoading?: boolean;
  className?: string;
}) {
  if (!onToggleFavorite) return null;

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onToggleFavorite();
      }}
      disabled={isFavoriteLoading}
      className={className}
      aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
      aria-pressed={isFavorited}
    >
      <DrawerFavoriteBookmarkIcon isFavorited={isFavorited} />
    </button>
  );
}

/**
 * MapCard component for displaying location information on the map
 * Based on Figma design: https://www.figma.com/design/pYGiuBEB9oyIzrNyKo3dID/-IRL-Website?node-id=7142-176749&m=dev
 */
export default function MapCard({
  name,
  address,
  description,
  isExisting = false,
  onAction,
  onClose,
  isLoading = false,
  imageUrl,
  eventUrl,
  variant = 'default',
  createPreviewActionLabel = 'Create and check in',
  type,
  recentCheckins = [],
  isFavorited,
  onToggleFavorite,
  isFavoriteLoading = false,
}: MapCardProps) {
  if (variant === 'createPreview') {
    return (
      <div className="flex w-[calc(100vw-32px)] max-w-[361px] flex-col overflow-hidden rounded-sm border border-[rgba(255,255,255,0.15)] bg-white/95 p-2 shadow-[0_4px_16px_0_rgba(0,0,0,0.25)] backdrop-blur-[232px]">
        <div className="flex flex-col gap-3 px-1 pb-1 pt-0">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-start gap-2">
              <p className="title3 min-w-0 flex-1 line-clamp-2 leading-snug font-semibold text-[#000000]">
                {name}
              </p>
              {onClose && (
                <button
                  onClick={onClose}
                  className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center gap-4 border border-[#DBDBDB] bg-white p-1 transition-colors hover:bg-white"
                  aria-label="Close"
                  type="button"
                >
                  <svg
                    className="aspect-square h-6 w-6 shrink-0"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M19.9987 7.32025L16.7199 4L12.0122 8.69045L7.32171 4L4.00146 7.32025L8.69538 11.9969L4.00146 16.6735L7.32171 19.9938L12.0122 15.3033L16.7199 19.9938L19.9987 16.6735L15.3186 11.9969L19.9987 7.32025Z"
                      fill="#757575"
                    />
                  </svg>
                </button>
              )}
            </div>
            <div className="flex min-w-0 items-start gap-2">
              <svg
                aria-hidden
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#757575]"
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
              <p className="label-medium min-w-0 flex-1 line-clamp-3  uppercase text-[#757575]">
                {address}
              </p>
            </div>
          </div>

          <button
            onClick={onAction}
            disabled={isLoading}
            type="button"
            className="flex h-11 w-full items-center justify-between bg-[var(--Dark-Tint-100---Ink-Black,#171717)] px-4 py-2 transition-colors hover:bg-black disabled:opacity-50"
          >
            <span className="label-medium label-large uppercase text-[#ffffff]">
              {isLoading ? '...' : createPreviewActionLabel}
            </span>
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
                fill="#DBDBDB"
              />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  if (variant === 'drawerTile') {
    return (
      <div className="relative size-[206px] shrink-0">
        <button
          type="button"
          onClick={onAction}
          disabled={isLoading}
          className="relative size-full overflow-hidden border border-[rgba(255,255,255,0.15)] bg-lightgray text-left shadow-[0_4px_16px_0_rgba(0,0,0,0.25)] backdrop-blur-[232px] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt=""
              fill
              sizes="206px"
              loading="lazy"
              className="object-cover object-top"
            />
          ) : null}

          <div className="absolute bottom-[var(--sds-size-space-200)] left-[var(--sds-size-space-200)] right-[var(--sds-size-space-200)] z-10 flex h-[58px] flex-col justify-center gap-0.5 bg-[var(--Backgrounds-Background,#FFF)] p-[var(--sds-size-space-200)]">
            <span className="title5 block min-h-4 shrink-0 truncate text-[#171717] font-bold">
              {name}
            </span>
            <div className="flex min-h-0 items-center justify-between gap-1">
              <span className="flex shrink-0 label-small items-center justify-center gap-2 border border-[#171717] px-1 py-0.5 uppercase  text-[#171717]">
                {formatLocationCategory(type)}
              </span>
              <MapCheckinAvatarStack
                checkins={recentCheckins}
                className="ml-auto flex h-7 shrink-0 items-center gap-2 py-0 pl-1 pr-0"
              />
            </div>
          </div>
        </button>
        <FavoriteToggleButton
          isFavorited={isFavorited}
          onToggleFavorite={onToggleFavorite}
          isFavoriteLoading={isFavoriteLoading}
          className="absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center gap-4 bg-[var(--Backgrounds-Secondary-CTA-BG,#DBDBDB)] p-[var(--sds-size-space-100)] transition-opacity hover:opacity-90 disabled:opacity-50"
        />
      </div>
    );
  }

  const descriptionText = description?.trim() || address;
  return (
    <div className="relative flex h-[288px] min-h-[288px] max-h-[288px] w-[calc(100vw-32px)] max-w-[361px] flex-col items-end gap-2 overflow-hidden border border-[rgba(255,255,255,0.15)] bg-lightgray p-2 shadow-[0_4px_16px_0_rgba(0,0,0,0.25)] backdrop-blur-[232px]">
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt=""
          fill
          priority
          sizes="(max-width: 361px) 100vw, 361px"
          className="object-cover object-top"
        />
      ) : null}

      {/* Top actions */}
      {onClose ? (
        <div className="relative z-10 flex w-full items-start justify-start gap-2">
          <button
            onClick={onClose}
            className="cursor-pointer flex h-7 w-7 shrink-0 items-center justify-center gap-4 border border-[#DBDBDB] bg-white p-1 transition-colors hover:bg-white"
            aria-label="Close"
            type="button"
          >
            <svg
              className="h-6 w-6 shrink-0 aspect-square"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M19.9987 7.32025L16.7199 4L12.0122 8.69045L7.32171 4L4.00146 7.32025L8.69538 11.9969L4.00146 16.6735L7.32171 19.9938L12.0122 15.3033L16.7199 19.9938L19.9987 16.6735L15.3186 11.9969L19.9987 7.32025Z"
                fill="#757575"
              />
            </svg>
          </button>
        </div>
      ) : null}

      {/* Card Content */}
      <div className="relative z-10 mt-auto flex self-stretch flex-col items-start gap-2 bg-white p-2">
        {/* Location Info */}
        <div className="flex self-stretch flex-col items-start justify-center gap-[5px] pb-1">
          {/* Name */}
          <p className="title3 leading-snug text-[#1a1a1a] line-clamp-2">
            {name}
          </p>

          {/* Truncated description */}
          <div className="relative flex self-stretch items-center gap-2 pr-14">
            <span className="body-small line-clamp-2">{descriptionText}</span>
            <button
              type="button"
              onClick={onAction}
              className="underline label-medium absolute bottom-1 right-0 cursor-pointer bg-white px-1"
            >
              MORE
            </button>
          </div>
        </div>

        <div className="flex w-full items-center self-stretch">
          <p className="flex label-small items-center justify-center gap-2 border border-[#171717] px-1 py-0.5 uppercase tracking-[0.3px] text-[#171717]">
            {formatLocationCategory(type)}
          </p>
        </div>

        {/* Action Buttons - Horizontal Layout */}
        <div className="flex w-full self-stretch gap-2">
          {/* Check In / Create Location Button */}
          <button
            onClick={onAction}
            disabled={isLoading}
            className="flex h-8 w-full flex-[1_0_0] items-center justify-between bg-[var(--Dark-Tint-100---Ink-Black,#171717)] px-2 py-1 transition-colors hover:bg-black disabled:opacity-50"
          >
            <span className="label-medium uppercase text-white">
              {isLoading ? '...' : isExisting ? 'Check In' : 'Create'}
            </span>
            <svg
              width={24}
              height={24}
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="size-6 shrink-0"
              aria-hidden
            >
              <path
                d="M14.0822 4L11.8239 6.28605L16 10.1453H2V13.8547H15.9812L11.8239 17.7139L14.0822 20L22 11.9846L14.0822 4Z"
                fill="#ffffff"
              />
            </svg>
          </button>

          {eventUrl && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={eventUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-8 h-8 text-[#666] hover:text-[#1a1a1a] hover:bg-[#f5f5f5] transition-colors border border-[#e0e0e0] rounded-full"
                    aria-label="View Event"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View event details</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    </div>
  );
}
