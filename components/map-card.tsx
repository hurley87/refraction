"use client";

import { MapPin, ChevronRight } from "lucide-react";

interface MapCardProps {
  name: string;
  address: string;
  isExisting?: boolean;
  onAction: () => void;
  onClose?: () => void;
  isLoading?: boolean;
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
}: MapCardProps) {
  return (
    <div className="flex flex-col gap-[4px] items-end">
      {/* Close Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="bg-white cursor-pointer flex gap-2 items-center justify-center p-1 relative rounded-full hover:bg-gray-50 transition-colors"
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

      {/* Main Card */}
      <div className="bg-white border border-[#ededed] rounded-2xl  shadow-lg">
        <div className="box-border flex flex-col gap-4 items-start overflow-hidden p-5 rounded-inherit">
          {/* Location Info */}
          <div className="flex flex-col gap-2 items-start justify-center w-full">
            {/* Location Name */}
            <div className="flex gap-6 items-start w-full">
              <h3 className="font-inktrap tracking-[-0.48px] text-sm">
                {name}
              </h3>
            </div>

            {/* Address */}
            <div className="flex gap-2 items-start shrink-0 w-full">
              <div className="flex gap-2 items-start shrink-0">
                <MapPin className="w-4 h-4 text-[#7d7d7d] shrink-0 mt-0.5" />
                <p className="font-inktrap leading-tight relative text-[#7d7d7d] text-[11px] uppercase tracking-[0.44px] break-words flex-1">
                  {address}
                </p>
              </div>
            </div>
          </div>

          {/* Action Section */}
          <div className="flex justify-between gap-5 items-center shrink-0 w-full pt-1">
            {/* Status Label */}
            <p className="font-inktrap leading-4 relative text-[#b5b5b5] text-[11px] uppercase tracking-[0.44px] whitespace-nowrap">
              {isExisting ? "Location" : "No Location"}
            </p>

            {/* Action Button */}
            <button
              onClick={onAction}
              disabled={isLoading}
              className="bg-[#313131] cursor-pointer flex gap-2 h-7 items-center px-3 py-1 relative rounded-[100px] shrink-0 hover:bg-[#131313] transition-colors disabled:opacity-50"
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
  );
}
