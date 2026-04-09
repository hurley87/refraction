'use client';

import Image from 'next/image';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  variant?: 'default' | 'createPreview';
  /** Label for the primary button when `variant` is `createPreview`. */
  createPreviewActionLabel?: string;
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
}: MapCardProps) {
  if (variant === 'createPreview') {
    return (
      <div className="flex w-[calc(100vw-32px)] max-w-[361px] flex-col overflow-hidden rounded-sm border border-[rgba(255,255,255,0.15)] bg-white/95 p-2 shadow-[0_4px_16px_0_rgba(0,0,0,0.25)] backdrop-blur-[232px]">
        {onClose && (
          <button
            onClick={onClose}
            className="cursor-pointer mb-1 flex h-7 w-7 items-center justify-center gap-4 border border-[#DBDBDB] bg-white p-1 transition-colors hover:bg-white"
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
        )}

        <div className="flex flex-col gap-3 px-1 pb-1 pt-0">
          <div className="flex flex-col gap-1.5">
            <p className="title4 line-clamp-2 leading-snug text-[#1a1a1a]">
              {name}
            </p>
            <p className="body-small line-clamp-3 text-[#454545]">{address}</p>
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

  const descriptionText = description?.trim() || address;
  return (
    <div
      className="flex h-[288px] min-h-[288px] max-h-[288px] w-[calc(100vw-32px)] max-w-[361px] flex-col items-end gap-2 overflow-hidden border border-[rgba(255,255,255,0.15)] p-2 shadow-[0_4px_16px_0_rgba(0,0,0,0.25)] backdrop-blur-[232px]"
      style={{
        background: imageUrl
          ? `url(${imageUrl}) lightgray center top / cover no-repeat`
          : 'lightgray',
      }}
    >
      {/* Close Button Overlay */}
      {onClose && (
        <button
          onClick={onClose}
          className="cursor-pointer self-start flex h-7 w-7 items-center justify-center gap-4 border border-[#DBDBDB] bg-white p-1 transition-colors hover:bg-white"
          aria-label="Close"
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
      )}

      {/* Card Content */}
      <div className="mt-auto flex self-stretch flex-col items-start gap-2 bg-white p-2">
        {/* Location Info */}
        <div className="flex self-stretch flex-col items-start justify-center gap-[5px] pb-1">
          {/* Name */}
          <p className="title4 leading-snug text-[#1a1a1a] line-clamp-2">
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

        {/* Action Buttons - Horizontal Layout */}
        <div className="flex w-full self-stretch gap-2">
          {/* Check In / Create Location Button */}
          <button
            onClick={onAction}
            disabled={isLoading}
            className="flex h-8 w-full flex-[1_0_0] items-center justify-between bg-[var(--Dark-Tint-100---Ink-Black,#171717)] px-2 py-1 transition-colors hover:bg-black disabled:opacity-50"
          >
            <span className="label-medium text-white">
              {isLoading ? '...' : isExisting ? 'Check In' : 'Create'}
            </span>
            <Image
              src="/arrow-right.svg"
              alt=""
              width={24}
              height={24}
              className="block size-6 max-w-none"
            />
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
