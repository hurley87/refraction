"use client";

import { MapPin, ChevronRight } from "lucide-react";
import { toast } from "sonner";

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
  placeId,
}: MapCardProps) {
  const handleShare = () => {
    if (!placeId) return;
    const shareUrl = `${window.location.origin}/interactive-map?placeId=${encodeURIComponent(placeId)}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast.success("Link copied to clipboard");
    }).catch(() => {
      toast.error("Failed to copy link");
    });
  };
  return (
    <div className="flex flex-col gap-[4px] items-end bg-white">
      {/* Main Card */}
      <div className="bg-white border border-[#ededed] rounded-[26px]  shadow-lg">
        <div className="box-border flex flex-col gap-2 items-start overflow-hidden rounded-inherit">
          {/* Location Image with Close Button Overlay */}
          {imageUrl && (
            <div className="w-full relative">
              <div className="w-full h-32 overflow-hidden relative rounded-t-2xl">
                <img
                  src={imageUrl}
                  alt={name}
                  className="w-full h-full object-cover"
                />
                {/* Close Button Overlay */}
                {onClose && (
                  <button
                    onClick={onClose}
                    className="absolute top-2 right-2 bg-white cursor-pointer flex gap-2 items-center justify-center p-1 rounded-[100px] border border-[#ededed] shadow-[0_1px_8px_0_rgba(0,0,0,0.08)] hover:bg-gray-50 transition-colors z-10"
                    aria-label="Close"
                  >
                    <svg
                      className="w-4 h-4 text-[#b5b5b5]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Card Content */}
          <div
            className={`flex flex-col gap-4 w-full ${imageUrl ? "px-4 pb-3" : "p-5"}`}
          >
            {/* Location Info */}
            <div className="flex flex-col gap-2 items-start justify-center w-full">
              {/* Location Name */}
              <div className="flex gap-6 items-start w-full">
                <h3 className="font-inktrap tracking-[-0.48px] text-sm">
                  {address}
                </h3>
              </div>

              {/* Address */}
              <div className="flex gap-2 items-start w-full min-w-0">
                <MapPin className="w-4 h-4 text-[#7d7d7d] mt-0.5 flex-shrink-0" />
                <p className="font-inktrap leading-tight relative text-[#7d7d7d] text-[11px] uppercase tracking-[0.44px] break-words flex-1 min-w-0 w-[240px]">
                  {name}
                </p>
              </div>

              {/* Description */}
              {description && (
                <p className="font-inktrap text-[13px] text-[#7d7d7d] leading-tight line-clamp-2">
                  {description}
                </p>
              )}
            </div>

            {/* Action Section */}
            <div className="flex justify-between gap-5 items-center shrink-0 w-full pt-1">
              {/* Action Button */}
              <button
                onClick={onAction}
                disabled={isLoading}
                className="bg-[#313131] cursor-pointer flex justify-between gap-2 h-7 items-center px-3 py-1 relative rounded-[100px] shrink-0 hover:bg-[#131313] transition-colors disabled:opacity-50 w-full"
              >
                <span className="font-inktrap text-[11px] text-white tracking-[0.44px] uppercase whitespace-nowrap">
                  {isLoading
                    ? "Loading..."
                    : isExisting
                      ? "Check In"
                      : "Create Location"}
                </span>
                <ChevronRight className="w-4 h-4 text-white shrink-0" />
              </button>
            </div>

            {/* Share Location Button */}
            {placeId && (
              <button
                onClick={handleShare}
                className="w-full flex items-center justify-center gap-2 text-[#b5b5b5] hover:text-[#7d7d7d] text-[11px] font-inktrap uppercase tracking-[0.44px] h-7 px-3 transition-colors border border-[#ededed] rounded-full"
                type="button"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                Share
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
