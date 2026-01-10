"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface MarkerData {
  latitude: number;
  longitude: number;
  place_id: string;
  display_name: string;
  name: string;
  description?: string | null;
  creator_wallet_address?: string | null;
  creator_username?: string | null;
  imageUrl?: string | null;
  type?: string;
  event_url?: string | null;
}

interface LocationCheckinPreview {
  id: number;
  comment: string;
  imageUrl?: string | null;
  pointsEarned: number;
  createdAt?: string | null;
  username?: string | null;
  walletAddress?: string | null;
}

interface CheckInDialogProps {
  open: boolean;
  onClose: () => void;
  checkInTarget: MarkerData | null;
  checkInComment: string;
  setCheckInComment: (comment: string) => void;
  checkInSuccess: boolean;
  checkInPointsEarned: number;
  isCheckingIn: boolean;
  locationCheckins: LocationCheckinPreview[];
  isLoadingLocationCheckins: boolean;
  locationCheckinsError: string | null;
  onCheckIn: () => void;
  onViewOnMap: () => void;
}

function getCheckinDisplayName(entry: LocationCheckinPreview) {
  if (entry.username && entry.username.trim().length > 0) {
    return entry.username;
  }
  if (entry.walletAddress && entry.walletAddress.length > 8) {
    return `${entry.walletAddress.slice(0, 6)}...${entry.walletAddress.slice(-4)}`;
  }
  return "Explorer";
}

function getCheckinInitial(entry: LocationCheckinPreview) {
  if (entry.username && entry.username.trim().length > 0) {
    return entry.username.trim().charAt(0).toUpperCase();
  }
  if (entry.walletAddress && entry.walletAddress.length > 2) {
    return entry.walletAddress.slice(2, 3).toUpperCase();
  }
  return "+";
}

function formatCheckinTimestamp(timestamp?: string | null) {
  if (!timestamp) return "Moments ago";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Recently";
  try {
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Recently";
  }
}

export default function CheckInDialog({
  open,
  onClose,
  checkInTarget,
  checkInComment,
  setCheckInComment,
  checkInSuccess,
  checkInPointsEarned,
  isCheckingIn,
  locationCheckins,
  isLoadingLocationCheckins,
  locationCheckinsError,
  onCheckIn,
  onViewOnMap,
}: CheckInDialogProps) {
  const handleShare = () => {
    if (!checkInTarget?.place_id) return;
    const shareUrl = `${window.location.origin}/interactive-map?placeId=${encodeURIComponent(checkInTarget.place_id)}`;
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
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent className="w-full max-w-[340px] p-0 bg-transparent border-none shadow-none [&>button]:hidden">
        <div
          className={`rounded-2xl overflow-hidden max-h-[85vh] flex flex-col bg-white shadow-[0_8px_32px_rgba(0,0,0,0.12)]`}
        >
          {/* Header */}
          {!checkInSuccess && (
            <div className="bg-white flex items-center justify-between px-3 py-2.5 border-b border-[#f0f0f0]">
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="text-[#999] hover:text-[#666] transition-colors disabled:opacity-50"
                  aria-label="Close"
                  disabled={isCheckingIn}
                >
                  <svg
                    className="w-5 h-5"
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
                <h2 className="text-sm font-inktrap text-[#1a1a1a] tracking-[-0.5px]">
                  Check In
                </h2>
              </div>
              <div className="flex items-center gap-1">
                {/* View on Map Button */}
                <button
                  onClick={onViewOnMap}
                  className="cursor-pointer flex items-center justify-center rounded-full w-7 h-7 text-[#666] hover:bg-[#f5f5f5] transition-colors"
                  aria-label="View on Map"
                  type="button"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </button>
                {/* Share Button */}
                <button
                  onClick={handleShare}
                  className="cursor-pointer flex items-center justify-center rounded-full w-7 h-7 text-[#666] hover:bg-[#f5f5f5] transition-colors"
                  aria-label="Share Location"
                  type="button"
                >
                  <svg
                    className="w-4 h-4"
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
              </div>
            </div>
          )}

          <div
            className={`flex-1 relative ${checkInSuccess ? "overflow-hidden" : "overflow-y-auto"}`}
          >
            {!checkInSuccess ? (
              <>
                {/* Location Header with Image */}
                {checkInTarget && (
                  <div className="flex items-center gap-3 p-3 bg-[#fafafa] border-b border-[#f0f0f0]">
                    {checkInTarget.imageUrl ? (
                      <img
                        src={checkInTarget.imageUrl}
                        alt={checkInTarget.name}
                        className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#e8e8e8] to-[#d0d0d0] flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-5 h-5 text-[#999]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-inktrap text-[13px] leading-tight tracking-[-0.3px] text-[#1a1a1a] line-clamp-1">
                        {checkInTarget?.name || "Selected Location"}
                      </h3>
                      <p className="font-inktrap text-[10px] uppercase tracking-[0.3px] text-[#999] mt-0.5 line-clamp-1">
                        {checkInTarget?.display_name}
                      </p>
                    </div>
                  </div>
                )}

                {/* Form Content */}
                <div className="p-3">
                  <div className="flex flex-col gap-4">
                    {/* Check-ins Section */}
                    <section className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-inktrap uppercase tracking-[0.3px] text-[#999]">
                          Check-ins
                        </span>
                        <div className="flex items-center gap-1.5">
                          <div className="flex -space-x-1.5">
                            {locationCheckins.length > 0 ? (
                              locationCheckins.slice(0, 2).map((entry) => (
                                <div
                                  key={`badge-${entry.id}`}
                                  className="size-6 rounded-full border-2 border-white bg-gradient-to-br from-[#fff3d7] via-[#ffd1a8] to-[#ffb27d] text-[10px] font-semibold text-[#313131] flex items-center justify-center shadow-sm"
                                >
                                  {getCheckinInitial(entry)}
                                </div>
                              ))
                            ) : (
                              <div className="size-6 rounded-full border-2 border-white bg-[#e8e8e8] text-[10px] font-semibold text-[#999] flex items-center justify-center">
                                +
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] font-inktrap text-[#999]">
                            {locationCheckins.length > 0
                              ? `+${Math.max(locationCheckins.length - 2, 0)}`
                              : "Be first"}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2 overflow-y-auto max-h-[180px]">
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
                              className="rounded-xl bg-[#f8f8f8] p-2.5"
                            >
                              <div className="flex items-start gap-2">
                                <div className="size-7 rounded-full bg-gradient-to-br from-[#fff3d7] via-[#ffd1a8] to-[#ffb27d] text-[10px] font-semibold text-[#313131] flex items-center justify-center shrink-0">
                                  {getCheckinInitial(entry)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-medium text-[#1a1a1a] truncate">
                                      {getCheckinDisplayName(entry)}
                                    </span>
                                    <span className="text-[9px] text-[#b5b5b5] shrink-0">
                                      {formatCheckinTimestamp(entry.createdAt)}
                                    </span>
                                  </div>
                                  <p className="text-[11px] leading-snug text-[#666] mt-0.5 line-clamp-2">
                                    {entry.comment}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </section>

                    {/* Comment Input */}
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="checkInComment"
                        className="text-[10px] font-medium text-[#999] uppercase tracking-[0.3px]"
                      >
                        Your Comment <span className="text-red-500">*</span>
                      </label>
                      <Textarea
                        id="checkInComment"
                        value={checkInComment}
                        onChange={(e) => setCheckInComment(e.target.value)}
                        placeholder="Share why this place is worth visiting..."
                        className="min-h-[80px] rounded-xl p-3 border border-[#e8e8e8] bg-white text-sm tracking-[-0.2px] text-[#1a1a1a] placeholder:text-[#c0c0c0] focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-[#999] resize-none"
                        maxLength={500}
                        disabled={isCheckingIn}
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Success Screen */
              <div
                className="relative flex flex-col items-center justify-center min-h-[400px] w-full overflow-hidden"
                style={{
                  backgroundImage: "url('/city-bg.jpg')",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                }}
              >
                <div className="relative z-10 flex flex-col items-center gap-7 px-4 py-16 w-full h-full justify-center">
                  {/* Location Marker Icon */}
                  <div
                    className="relative shrink-0"
                    style={{ width: "46px", height: "66px" }}
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
                          <feComposite in2="hardAlpha" operator="out" />
                          <feColorMatrix
                            type="matrix"
                            values="0 0 0 0 0.4 0 0 0 0 0.835294 0 0 0 0 0.458824 0 0 0 1 0"
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
                          width: "30px",
                          height: "30px",
                          top: "0px",
                          left: "10px",
                        }}
                      >
                        <img
                          src={checkInTarget.imageUrl}
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
                          fontFamily: '"Pleasure Variable Trial", sans-serif',
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
                            {checkInTarget?.name || "Location"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {!checkInSuccess ? (
            <div className="p-3 pt-0">
              <div className="flex w-full gap-2">
                <button
                  onClick={onClose}
                  className="bg-[#f0f0f0] hover:bg-[#e8e8e8] text-[#666] rounded-full h-9 font-inktrap text-[11px] uppercase tracking-[0.3px] flex-1 disabled:opacity-50 transition-colors flex items-center justify-center"
                  disabled={isCheckingIn}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  onClick={onCheckIn}
                  disabled={isCheckingIn || !checkInTarget || !checkInComment.trim()}
                  className="bg-[#1a1a1a] hover:bg-black text-white rounded-full h-9 font-inktrap text-[11px] uppercase tracking-[0.3px] flex items-center justify-center transition-colors disabled:opacity-50 flex-1"
                  type="button"
                >
                  {isCheckingIn ? "..." : "Check In"}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3">
              <button
                onClick={onClose}
                className="bg-[#1a1a1a] hover:bg-black text-white rounded-full h-9 font-inktrap text-[11px] uppercase tracking-[0.3px] flex items-center justify-center transition-colors w-full"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
