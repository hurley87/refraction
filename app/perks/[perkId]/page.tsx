"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Tag,
  Clock,
  MapPin,
  ExternalLink,
  CheckCircle,
  XCircle,
  Copy,
} from "lucide-react";
import { useState, useEffect } from "react";
import {
  useAvailableCodesCount,
  useUserRedemptions,
} from "@/hooks/usePerks";
import { useCurrentPlayer } from "@/hooks/usePlayer";
import { useAnalytics } from "@/hooks/useAnalytics";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { apiClient } from "@/lib/api/client";
import type { Perk } from "@/lib/types";

// Helper function to calculate time left
const getTimeLeft = (endDate: string) => {
  const now = new Date();
  const end = new Date(endDate);
  const diffMs = end.getTime() - now.getTime();

  if (diffMs <= 0) return { expired: true, text: "Expired" };

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(
    (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
  );
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffDays > 0) {
    return {
      expired: false,
      text: `${diffDays} day${diffDays !== 1 ? "s" : ""} left`,
    };
  } else if (diffHours > 0) {
    return {
      expired: false,
      text: `${diffHours} hour${diffHours !== 1 ? "s" : ""} left`,
    };
  } else if (diffMinutes > 0) {
    return { expired: false, text: `${diffMinutes} min left` };
  } else {
    return { expired: false, text: "Less than 1 min left" };
  }
};

// Component for live updating time left
const TimeLeft = ({
  endDate,
  className,
}: {
  endDate: string;
  className?: string;
}) => {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(endDate));

  useEffect(() => {
    const updateTimeLeft = () => {
      setTimeLeft(getTimeLeft(endDate));
    };

    // Update immediately
    updateTimeLeft();

    // Update every minute
    const interval = setInterval(updateTimeLeft, 60000);

    return () => clearInterval(interval);
  }, [endDate]);

  return <span className={className}>{timeLeft.text}</span>;
};

export default function PerkDetailPage() {
  const params = useParams();
  const { user, login } = usePrivy();
  const address = user?.wallet?.address;
  const queryClient = useQueryClient();
  const perkId = params.perkId as string;
  const { trackEvent } = useAnalytics();

  // Fetch perk details
  const {
    data: perk,
    isLoading: perkLoading,
    error,
  } = useQuery<Perk>({
    queryKey: ["perk", perkId],
    queryFn: async () => {
      return apiClient<{ perk: Perk }>(`/api/perks/${perkId}`).then(
        (data) => data.perk
      );
    },
    enabled: !!perkId,
  });

  // Track reward page view when perk data loads
  useEffect(() => {
    if (perk?.id) {
      trackEvent(ANALYTICS_EVENTS.REWARD_PAGE_VIEWED, {
        reward_id: perk.id,
        reward_type: perk.type,
        points_required: perk.points_threshold,
      });
    }
  }, [perk?.id, perk?.type, perk?.points_threshold, trackEvent]);

  // Fetch user's points
  const { data: player } = useCurrentPlayer();

  // Check if user has already redeemed this perk
  const { data: userRedemptions = [] } = useUserRedemptions(address);

  // Get available codes count
  const { data: availableCodesCount = 0 } = useAvailableCodesCount(perkId);

  // Redeem perk mutation
  const redeemPerkMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/perks/redeem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ perkId, walletAddress: address }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to redeem perk");
      }
      const data = await response.json();
      return data.redemption;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["user-redemptions", address],
      });
      queryClient.invalidateQueries({ queryKey: ["user-stats", address] });
      queryClient.invalidateQueries({ queryKey: ["available-codes", perkId] });
      toast.success(
        "Perk redeemed successfully! Your discount code is now available below.",
      );
    },
    onError: (error: any) => {
      console.error("Error redeeming perk:", error);
      toast.error(error.message || "Failed to redeem perk");
    },
  });

  if (error || !perk) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Perk Not Found</h1>
        <p className="text-gray-600 mb-4">
          The perk you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link href="/perks">
          <Button>Back to Perks</Button>
        </Link>
      </div>
    );
  }

  const userPoints = player?.total_points || 0;
  const canAfford = userPoints >= perk.points_threshold;
  const hasRedeemed = userRedemptions.some(
    (redemption: any) => redemption.perk_id === perkId,
  );
  const isExpired = perk.end_date && new Date(perk.end_date) < new Date();
  const isExpiringSoon =
    perk.end_date &&
    new Date(perk.end_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const noCodesAvailable = availableCodesCount === 0;

  // Get the user's discount code if they've redeemed this perk
  const userRedemption = userRedemptions.find(
    (redemption: any) => redemption.perk_id === perkId,
  );
  const userDiscountCode = userRedemption?.perk_discount_codes?.code;

  const handleRedeem = () => {
    if (!address) {
      toast.error("Please connect your wallet to redeem perks");
      return;
    }

    if (isExpired) {
      toast.error("This perk has expired");
      return;
    }

    if (!canAfford) {
      toast.error("Insufficient points to redeem this perk");
      return;
    }

    if (hasRedeemed) {
      toast.error("You have already redeemed this perk");
      return;
    }

    redeemPerkMutation.mutate();
  };

  const handleCopyCode = async () => {
    if (!userDiscountCode) return;

    try {
      await navigator.clipboard.writeText(userDiscountCode);
      toast.success("Discount code copied to clipboard!");
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = userDiscountCode;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        toast.success("Discount code copied to clipboard!");
      } catch {
        toast.error("Failed to copy code. Please copy manually.");
      }
      document.body.removeChild(textArea);
    }
  };

  // removed unused getStatusBadge helper

  if (perkLoading) {
    return (
      <div
        style={{
          background:
            "linear-gradient(0deg, #61BFD1 0%, #1BA351 33.66%, #FFE600 62.5%, #EE91B7 100%)",
        }}
        className="min-h-screen p-4 pb-0 font-grotesk"
      >
        <div className="min-h-screen max-w-lg mx-auto">
          <Header />

          {/* Back Button */}
          <div className="px-0 pt-8 mb-4">
            <div className="bg-white rounded-2xl p-4">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-gray-200 rounded mr-1 animate-pulse"></div>
                <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="px-0 space-y-4">
            {/* Perk Details Skeleton */}
            <div className="bg-white rounded-2xl p-4 animate-pulse">
              <div className="flex justify-between items-start mb-3">
                <div className="w-16 h-6 bg-gray-200 rounded-full"></div>
                <div className="w-20 h-6 bg-gray-200 rounded"></div>
              </div>
              <div className="w-3/4 h-6 bg-gray-200 rounded mb-2"></div>
              <div className="w-full h-4 bg-gray-200 rounded mb-4"></div>
              <div className="w-full h-10 bg-gray-200 rounded"></div>
            </div>

            {/* Your Points Card Skeleton */}
            {address && (
              <div className="bg-white rounded-2xl p-4 animate-pulse">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="w-20 h-3 bg-gray-200 rounded mb-1"></div>
                    <div className="flex items-baseline gap-2">
                      <div className="w-16 h-8 bg-gray-200 rounded"></div>
                      <div className="w-6 h-4 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                  <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                </div>
              </div>
            )}

            {/* Action Button Skeleton */}
            <div className="bg-white rounded-2xl p-4 animate-pulse">
              <div className="w-full h-12 bg-gray-200 rounded-full"></div>
            </div>

            {/* How it Works Skeleton */}
            <div className="bg-white rounded-2xl p-4 animate-pulse">
              <div className="w-24 h-4 bg-gray-200 rounded mb-3"></div>
              <div className="space-y-2">
                <div className="w-full h-3 bg-gray-200 rounded"></div>
                <div className="w-5/6 h-3 bg-gray-200 rounded"></div>
                <div className="w-4/5 h-3 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>

          {/* Bottom IRL Section */}
          <div className="py-6">
            <img
              src="/irl-bottom-logo.svg"
              alt="IRL"
              className="w-full h-auto"
            />
          </div>
        </div>
      </div>
    );
  }

  if (error || !perk) {
    return (
      <div
        style={{
          background:
            "linear-gradient(0deg, #61BFD1 0%, #1BA351 33.66%, #FFE600 62.5%, #EE91B7 100%)",
        }}
        className="min-h-screen p-4 pb-0 font-grotesk"
      >
        <div className="min-h-screen max-w-lg mx-auto">
          <Header />
          <div className="px-0 pt-8 space-y-4">
            <div className="bg-white rounded-2xl p-4">
              <Link href="/perks">
                <button className="flex items-center text-sm font-inktrap text-gray-600 mb-4">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back to Perks
                </button>
              </Link>
            </div>
            <div className="bg-white rounded-2xl p-8 text-center">
              <XCircle className="w-12 h-12 text-red-300 mx-auto mb-3" />
              <p className="text-gray-600 font-inktrap mb-2">Perk Not Found</p>
              <p className="text-sm text-gray-500 font-inktrap">
                The perk you&apos;re looking for doesn&apos;t exist.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background:
          "linear-gradient(0deg, #61BFD1 0%, #1BA351 33.66%, #FFE600 62.5%, #EE91B7 100%)",
      }}
      className="min-h-screen p-4 pb-0 font-grotesk"
    >
      <div className="min-h-screen max-w-lg mx-auto">
        {/* Status Bar */}
        <Header />

        {/* Back Button */}
        <div className="px-0 pt-8 mb-4">
          <div className="bg-white rounded-2xl p-4">
            <Link href="/perks">
              <button className="flex items-center text-sm font-inktrap text-gray-600">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Perks
              </button>
            </Link>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-0 space-y-4">
          {/* Perk Header Card */}
          <div className="bg-white rounded-2xl p-4">
            {/* Status badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full font-inktrap capitalize">
                {perk.type}
              </span>
              {isExpiringSoon && !isExpired && (
                <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full font-inktrap">
                  Ending Soon
                </span>
              )}
              {isExpired && (
                <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full font-inktrap">
                  Expired
                </span>
              )}
              {hasRedeemed && (
                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full font-inktrap">
                  ✓ Redeemed
                </span>
              )}
              {noCodesAvailable && !hasRedeemed && !isExpired && (
                <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full font-inktrap">
                  Sold Out
                </span>
              )}
            </div>

            {/* Title and points */}
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-xl font-inktrap font-bold text-black flex-1 pr-4">
                {perk.title}
              </h1>
              <div className="text-right">
                <div className="text-2xl font-inktrap font-bold text-green-600">
                  {perk.points_threshold.toLocaleString()}
                </div>
                <div className="text-xs font-inktrap text-gray-600">
                  points required
                </div>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm font-inktrap text-gray-600 mb-4 leading-relaxed">
              {perk.description}
            </p>

            {/* Details */}
            <div className="space-y-3">
              {perk.location && (
                <div className="flex items-center text-xs text-gray-600">
                  <MapPin className="w-3 h-3 mr-2" />
                  <span className="font-inktrap">{perk.location}</span>
                </div>
              )}

              {perk.end_date && (
                <div className="flex items-center text-xs">
                  <Clock className="w-3 h-3 mr-2" />
                  <TimeLeft
                    endDate={perk.end_date}
                    className={`font-inktrap ${
                      isExpired
                        ? "text-red-600"
                        : isExpiringSoon
                          ? "text-orange-600"
                          : "text-gray-600"
                    }`}
                  />
                </div>
              )}

              {perk.website_url && (
                <div className="flex items-center text-xs text-blue-600">
                  <ExternalLink className="w-3 h-3 mr-2" />
                  <a
                    href={perk.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-inktrap hover:underline"
                  >
                    Visit Partner Website
                  </a>
                </div>
              )}

              {!hasRedeemed && (
                <div className="flex items-center text-xs text-gray-600">
                  <Tag className="w-3 h-3 mr-2" />
                  <span
                    className={`font-inktrap ${noCodesAvailable ? "text-red-600" : ""}`}
                  >
                    {availableCodesCount} discount codes remaining
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Your Points Card */}
          {address && (
            <div className="bg-white rounded-2xl p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs font-inktrap text-gray-600 uppercase tracking-wide mb-1">
                    YOUR POINTS
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-inktrap font-bold text-black">
                      {userPoints.toLocaleString()}
                    </span>
                    <span className="text-sm font-inktrap text-gray-600">
                      pts
                    </span>
                  </div>
                  {!canAfford && !hasRedeemed && (
                    <p className="text-xs text-red-600 font-inktrap mt-1">
                      Need{" "}
                      {(perk.points_threshold - userPoints).toLocaleString()}{" "}
                      more points
                    </p>
                  )}
                </div>
                {canAfford && !hasRedeemed && (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                )}
              </div>
            </div>
          )}

          {/* Discount Code Card (if redeemed) */}
          {userDiscountCode && hasRedeemed && (
            <div className="bg-white rounded-2xl p-4">
              <p className="text-xs font-inktrap text-gray-600 uppercase tracking-wide mb-3">
                YOUR DISCOUNT CODE
              </p>
              <div className="bg-green-50 border-2 border-green-200 p-4 rounded-2xl">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="text-2xl font-mono font-bold text-green-800">
                    {userDiscountCode}
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-800 rounded-lg transition-colors font-inktrap text-xs font-medium"
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </button>
                </div>
                <p className="text-xs font-inktrap text-green-700 text-center">
                  Use this code at checkout or show it to redeem your discount
                </p>
              </div>
            </div>
          )}

          {/* Connect Wallet Message */}
          {/* Removed duplicate Connect Wallet button here to keep a single CTA below */}

          {/* Action Button */}
          <div className="bg-white rounded-2xl p-4">
            {!address ? (
              <button
                onClick={login}
                className="w-full py-3 rounded-full font-inktrap font-medium text-sm bg-black text-white hover:bg-gray-800"
              >
                Connect Wallet
              </button>
            ) : isExpired ? (
              <button
                className="w-full py-3 rounded-full font-inktrap font-medium text-sm bg-gray-100 text-gray-500"
                disabled
              >
                Perk Expired
              </button>
            ) : noCodesAvailable ? (
              <button
                className="w-full py-3 rounded-full font-inktrap font-medium text-sm bg-gray-100 text-gray-500"
                disabled
              >
                Sold Out - No Codes Available
              </button>
            ) : hasRedeemed ? (
              <div className="space-y-3">
                <button
                  className="w-full py-3 rounded-full font-inktrap font-medium text-sm  text-green-800"
                  disabled
                >
                  ✓ Redeemed
                </button>
                {perk.website_url && (
                  <a
                    href={perk.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <button className="w-full py-3 rounded-full font-inktrap font-medium text-sm bg-blue-100 text-blue-800 hover:bg-blue-200">
                      Visit Partner Website
                    </button>
                  </a>
                )}
              </div>
            ) : (
              <button
                onClick={handleRedeem}
                disabled={!canAfford || redeemPerkMutation.isPending}
                className={`w-full py-3 rounded-full font-inktrap font-medium text-sm transition-colors ${
                  canAfford && !redeemPerkMutation.isPending
                    ? "bg-black text-white hover:bg-gray-800"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {redeemPerkMutation.isPending
                  ? "Redeeming..."
                  : canAfford
                    ? `Redeem`
                    : "Insufficient Points"}
              </button>
            )}
          </div>

          {/* How it Works Card */}
          <div className="bg-white rounded-2xl p-4">
            <h2 className="text-sm font-inktrap font-bold text-black mb-3 uppercase tracking-wide">
              How it Works
            </h2>
            <div className="space-y-2 text-xs font-inktrap text-gray-600">
              <p>• Click &quot;Redeem&quot; to claim your discount code</p>
              <p>• You&apos;ll receive a unique code to use at checkout</p>
              <p>• Present the code at the partner location or use online</p>
              <p>• Each perk can only be redeemed once per user</p>
              <p>• Your points are not deducted - they qualify you for perks</p>
            </div>
          </div>
        </div>

        {/* Bottom IRL Section */}
        <div className="py-6">
          <img src="/irl-bottom-logo.svg" alt="IRL" className="w-full h-auto" />
        </div>
      </div>
    </div>
  );
}
