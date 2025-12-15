"use client";

import type { Perk } from "@/lib/types";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { Tag, Clock, MapPin, ExternalLink, Gift } from "lucide-react";

import { useState, useEffect } from "react";
import MapNav from "@/components/map/mapnav";
import {
  usePerks,
  useAvailableCodesCount,
  useUserRedemptions,
} from "@/hooks/usePerks";
import { useCurrentPlayer } from "@/hooks/usePlayer";

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

const PerkCodeCount = ({ perkId }: { perkId: string }) => {
  const { data: availableCount = 0 } = useAvailableCodesCount(perkId);

  return (
    <div className="flex items-center text-xs text-gray-600">
      <Tag className="w-3 h-3 mr-1" />
      {availableCount} codes available
    </div>
  );
};

export default function PerksPage() {
  const { user } = usePrivy();
  const address = user?.wallet?.address;

  // Fetch all active perks
  const { data: perks = [], isLoading: perksLoading } = usePerks(true);

  // Fetch user's points
  const { data: player } = useCurrentPlayer();

  // Fetch user's redemptions
  const { data: userRedemptions = [] } = useUserRedemptions(address);

  const userPoints = player?.total_points || 0;

  const canAfford = (perk: Perk) => userPoints >= perk.points_threshold;

  const hasRedeemed = (perkId: string) =>
    userRedemptions.some((redemption: any) => redemption.perk_id === perkId);

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
        <MapNav />

        {/* Perks Header */}
        <div className="px-0 pt-8 mb-6">
          <div className="bg-white rounded-2xl p-4 flex items-center justify-between">
            <h1 className="text-xl font-inktrap font-bold text-black">
              Perks & Rewards
            </h1>
            <Gift className="w-6 h-6 text-gray-600" />
          </div>
        </div>

        {/* Main Content */}
        <div className="px-0 space-y-4">
          {/* Your Points Card */}
          {address && (
            <div className="bg-white rounded-2xl p-4">
              <div className="text-center">
                <p className="text-xs font-inktrap text-gray-600 mb-3 uppercase tracking-wide">
                  YOUR POINTS
                </p>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-3xl font-inktrap font-bold text-black">
                    {userPoints.toLocaleString()}
                  </span>
                  <span className="text-sm font-inktrap text-gray-600">
                    pts
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Connect Wallet Message */}
          {!address && (
            <div className="bg-white rounded-2xl p-4 text-center">
              <p className="text-sm font-inktrap text-gray-600">
                Connect your wallet to see which perks you can redeem
              </p>
            </div>
          )}

          {/* Loading State */}
          {perksLoading && (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                  <div className="flex justify-between items-start mb-3">
                    <div className="w-16 h-6 bg-gray-200 rounded-full"></div>
                    <div className="w-20 h-6 bg-gray-200 rounded"></div>
                  </div>
                  <div className="w-3/4 h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="w-full h-4 bg-gray-200 rounded mb-4"></div>
                  <div className="w-full h-10 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          )}

          {/* Perks List */}
          {!perksLoading && (
            <div className="space-y-4">
              {perks.length > 0 ? (
                perks.map((perk) => {
                  const affordable = !address || canAfford(perk);
                  const isExpired = Boolean(
                    perk.end_date && new Date(perk.end_date) < new Date()
                  );
                  const isExpiringSoon = Boolean(
                    perk.end_date &&
                      new Date(perk.end_date) <
                        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                  );
                  const userRedeemed = perk.id ? hasRedeemed(perk.id) : false;

                  return (
                    <div
                      key={perk.id}
                      className={`bg-white rounded-2xl p-4 ${
                        !affordable || isExpired ? "opacity-60" : ""
                      }`}
                    >
                      {/* Header */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-wrap gap-2">
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
                          {userRedeemed && (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full font-inktrap">
                              ✓ Redeemed
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-inktrap font-bold text-green-600">
                            {perk.points_threshold.toLocaleString()}
                          </span>
                          <span className="text-xs font-inktrap text-gray-600 ml-1">
                            pts
                          </span>
                        </div>
                      </div>

                      {/* Title and Description */}
                      <h3 className="text-lg font-inktrap font-bold text-black mb-2">
                        {perk.title}
                      </h3>
                      <p className="text-sm font-inktrap text-gray-600 mb-4 line-clamp-2">
                        {perk.description}
                      </p>

                      {/* Details */}
                      <div className="space-y-2 mb-4">
                        {perk.location && (
                          <div className="flex items-center text-xs text-gray-600">
                            <MapPin className="w-3 h-3 mr-2" />
                            <span className="font-inktrap">
                              {perk.location}
                            </span>
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
                              className="font-inktrap hover:underline truncate"
                            >
                              Visit Website
                            </a>
                          </div>
                        )}

                        {perk.id && <PerkCodeCount perkId={perk.id} />}
                      </div>

                      {/* Status Messages */}
                      {!affordable &&
                        address &&
                        !isExpired &&
                        !userRedeemed && (
                          <div className="text-xs text-red-600 mb-3 font-inktrap">
                            Need{" "}
                            {(
                              perk.points_threshold - userPoints
                            ).toLocaleString()}{" "}
                            more points
                          </div>
                        )}

                      {/* Action Button */}
                      <Link href={`/perks/${perk.id}`}>
                        <button
                          className={`w-full py-3 rounded-full font-inktrap font-medium text-sm transition-colors ${
                            userRedeemed
                              ? "bg-green-100 text-green-800"
                              : affordable && !isExpired
                                ? "bg-black text-white hover:bg-gray-800"
                                : "bg-gray-100 text-gray-500"
                          }`}
                          disabled={!affordable || isExpired}
                        >
                          {userRedeemed
                            ? "✓ Redeemed"
                            : isExpired
                              ? "Expired"
                              : affordable
                                ? "View Details"
                                : "Insufficient Points"}
                        </button>
                      </Link>
                    </div>
                  );
                })
              ) : (
                <div className="bg-white rounded-2xl p-8 text-center">
                  <Gift className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 font-inktrap mb-2">
                    No perks available
                  </p>
                  <p className="text-sm text-gray-500 font-inktrap">
                    Check back later for new rewards!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom IRL Section */}
        <div className="py-6">
          <img src="/irl-bottom-logo.svg" alt="IRL" className="w-full h-auto" />
        </div>
      </div>
    </div>
  );
}
