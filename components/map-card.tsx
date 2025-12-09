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
  eventUrl?: string | null;
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
  eventUrl,
}: MapCardProps) {
  const handleShare = () => {
    if (!placeId) return;
    const shareUrl = `${window.location.origin}/interactive-map?placeId=${encodeURIComponent(placeId)}`;
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        toast.success("Link copied to clipboard");
      })
      .catch(() => {
        toast.error("Failed to copy link");
      });
  };
  return (
    <div className="bg-white border border-[#e8e8e8] rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.08)] overflow-hidden w-[280px]">
      {/* Location Image with Close Button Overlay */}
      {imageUrl && (
        <div className="w-full h-24 relative">
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
          {/* Close Button Overlay */}
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm cursor-pointer flex items-center justify-center w-6 h-6 rounded-full border border-[#e8e8e8] shadow-sm hover:bg-white transition-colors"
              aria-label="Close"
            >
              <svg
                className="w-3 h-3 text-[#666]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Card Content */}
      <div className={`flex flex-col gap-2.5 ${imageUrl ? "p-3" : "p-3.5"}`}>
        {/* Location Info */}
        <div className="flex flex-col gap-1">
          {/* Description */}
          <p className="font-inktrap text-[13px] leading-snug text-[#1a1a1a] line-clamp-2">
            {description || address}
          </p>

          {/* Address */}
          <div className="flex gap-1.5 items-center">
            <MapPin className="w-3 h-3 text-[#999] flex-shrink-0" />
            <span className="font-inktrap text-[10px] text-[#999] uppercase tracking-[0.3px] truncate">
              {name}
            </span>
          </div>
        </div>

        {/* Action Buttons - Horizontal Layout */}
        <div className="flex gap-2">
          {/* Check In / Create Location Button */}
          <button
            onClick={onAction}
            disabled={isLoading}
            className="flex-1 bg-[#1a1a1a] cursor-pointer flex items-center justify-center gap-1.5 h-8 px-3 rounded-full hover:bg-black transition-colors disabled:opacity-50"
          >
            <span className="font-inktrap text-[10px] text-white tracking-[0.3px] uppercase">
              {isLoading ? "..." : isExisting ? "Check In" : "Create"}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-white" />
          </button>

          {/* Share Button */}
          {placeId && (
            <button
              onClick={handleShare}
              className="flex items-center justify-center w-8 h-8 text-[#666] hover:text-[#1a1a1a] hover:bg-[#f5f5f5] transition-colors border border-[#e0e0e0] rounded-full"
              type="button"
              aria-label="Share"
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
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </button>
          )}
          {eventUrl && (
            <a
              href={eventUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full h-8 px-3 font-inktrap text-[10px] uppercase tracking-[0.3px] transition-colors w-full mt-2"
            >
              <button
                className="flex items-center justify-center w-8 h-8 text-[#666] hover:text-[#1a1a1a] hover:bg-[#f5f5f5] transition-colors border border-[#e0e0e0] rounded-full"
                type="button"
                aria-label="Share"
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
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </button>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
