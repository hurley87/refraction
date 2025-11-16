"use client";

import { MapPin, ChevronRight } from "lucide-react";

interface MapCardProps {
  name: string;
  address: string;
  isExisting?: boolean;
  onAction: () => void;
  onClose?: () => void;
  isLoading?: boolean;
  imageUrl?: string | null;
}

/**
 * MapCard component for displaying location information on the map
 * Based on Figma design: https://www.figma.com/design/pYGiuBEB9oyIzrNyKo3dID/-IRL-Website?node-id=7142-176749&m=dev
 */
export default function MapCard({
  name,
  address,
  isExisting = false,
  onAction,
  onClose,
  isLoading = false,
  imageUrl,
}: MapCardProps) {
  return (
    <div className="flex flex-col gap-[4px] items-end bg-white">
      {/* Main Card */}
      <div className="bg-white border border-[#ededed] rounded-2xl  shadow-lg">
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
          <div className={`flex flex-col gap-4 w-full ${imageUrl ? "px-4 pb-3" : "p-5"}`}>
            {/* Location Info */}
            <div className="flex flex-col gap-2 items-start justify-center w-full">
              {/* Location Name */}
              <div className="flex gap-6 items-start w-full">
                <h3 className="font-inktrap tracking-[-0.48px] text-sm">
                  {name}
                </h3>
              </div>

              {/* Address */}
              <div className="flex gap-2 items-start w-full min-w-0">
                <MapPin className="w-4 h-4 text-[#7d7d7d] mt-0.5 flex-shrink-0" />
                <p className="font-inktrap leading-tight relative text-[#7d7d7d] text-[11px] uppercase tracking-[0.44px] break-words flex-1 min-w-0">
                  {address}
                </p>
              </div>
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
          </div>
        </div>
      </div>
    </div>
  );
}
