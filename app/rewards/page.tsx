"use client";

import { useQuery } from "@tanstack/react-query";
// Button was unused here; removing import to satisfy lint
import { type Perk } from "@/lib/supabase";
import Link from "next/link";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import { ExternalLink, Gift } from "lucide-react";

import { useState, useEffect } from "react";
import MapNav from "@/components/mapnav";

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
  const { data: availableCount = 0 } = useQuery({
    queryKey: ["available-codes", perkId],
    queryFn: async () => {
      const response = await fetch(`/api/perks/${perkId}/available-count`);
      if (!response.ok)
        throw new Error("Failed to fetch available codes count");
      const data = await response.json();
      return data.count;
    },
  });

  return (
    <span className="text-black body-small uppercase font-abc-monument-regular">
      {availableCount} codes available
    </span>
  );
};

export default function PerksPage() {
  const { user } = usePrivy();
  const address = user?.wallet?.address;

  // Fetch all active perks
  const { data: perks = [], isLoading: perksLoading } = useQuery({
    queryKey: ["perks"],
    queryFn: async () => {
      const response = await fetch("/api/perks?activeOnly=true");
      if (!response.ok) throw new Error("Failed to fetch perks");
      const data = await response.json();
      return data.perks;
    },
  });

  // Fetch user's points
  const { data: userStats } = useQuery({
    queryKey: ["user-stats", address],
    queryFn: async () => {
      const response = await fetch(`/api/player?walletAddress=${address}`);
      if (!response.ok) throw new Error("Failed to fetch player stats");
      const data = await response.json();
      return data.player;
    },
    enabled: !!address,
  });

  // Fetch user's redemptions
  const { data: userRedemptions = [] } = useQuery({
    queryKey: ["user-redemptions", address],
    queryFn: async () => {
      const response = await fetch(
        `/api/user/redemptions?walletAddress=${address}`,
      );
      if (!response.ok) throw new Error("Failed to fetch user redemptions");
      const data = await response.json();
      return data.redemptions;
    },
    enabled: !!address,
  });

  const userPoints = userStats?.total_points || 0;

  const canAfford = (perk: Perk) => userPoints >= perk.points_threshold;

  const hasRedeemed = (perkId: string) =>
    userRedemptions.some((redemption: any) => redemption.perk_id === perkId);

  // Get the latest reward (most recently created or updated)
  const latestReward = perks.length > 0
    ? [...perks].sort((a, b) => {
        const aDate = a.created_at || a.updated_at || "";
        const bDate = b.created_at || b.updated_at || "";
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      })[0]
    : null;

  const latestRewardAffordable = latestReward
    ? !address || canAfford(latestReward)
    : false;
  const latestRewardExpired =
    latestReward?.end_date &&
    new Date(latestReward.end_date) < new Date();
  const latestRewardExpiringSoon =
    latestReward?.end_date &&
    new Date(latestReward.end_date) <
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const latestRewardRedeemed = latestReward?.id
    ? hasRedeemed(latestReward.id)
    : false;

  return (
    <div
      style={{
        background:
          "var(--Gradients-Rewards-Pink, linear-gradient(0deg, rgba(0, 0, 0, 0.10) 0%, rgba(0, 0, 0, 0.10) 100%), linear-gradient(0deg, #FFE600 0%, #1BA351 36.06%, #61BFD1 65.39%, #EE91B7 100%))",
      }}
      className="min-h-screen p-4 pb-0 font-grotesk"
    >
      <div className="max-w-md mx-auto">
        {/* Status Bar with Header */}
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <MapNav />
          </div>
        </div>

        {/* Main Content */}
        <div className="px-0 pt-4 space-y-1">
          {/* LATEST REWARD Section */}
          {latestReward && !perksLoading && (
            <div className="mb-6">
              <div
                style={{
                  display: "flex",
                  padding: "16px",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "8px",
                  alignSelf: "stretch",
                  borderRadius: "26px",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  background:
                    "linear-gradient(180deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.45) 100%)",
                }}
              >
                {/* Latest Reward Title */}
                <h1 className="text-black body-small font-monument-grotesk mb-4">
                  LATEST REWARD
                </h1>

                {/* Thumbnail for Featured Reward */}
                {latestReward.thumbnail_url && (
                  <div className="w-full mb-4">
                    <Image
                      src={latestReward.thumbnail_url}
                      alt={latestReward.title}
                      width={400}
                      height={300}
                      className="w-full h-auto rounded-2xl object-contain"
                      style={{
                        borderRadius: "20px",
                      }}
                    />
                  </div>
                )}

                {/* Reward Title */}
                <h2 className="text-black title2 font-pleasure w-full text-left">
                  {latestReward.title}
                </h2>

                {/* Description */}
                {latestReward.description && (
                  <p className="text-black body-small font-abc-monument-regular w-full text-left mb-4">
                    {latestReward.description}
                  </p>
                )}

                {/* Points, Location, and Date */}
                <div className="flex w-full gap-2 flex-wrap">
                  {/* Points Pill */}
                  <div
                    style={{
                      display: "flex",
                      padding: "4px 8px",
                      alignItems: "center",
                      gap: "8px",
                      alignSelf: "stretch",
                      borderRadius: "1000px",
                      border: "1px solid #000000",
                    }}
                  >
                    <span className="text-black body-small uppercase font-abc-monument-regular">
                      {latestReward.points_threshold.toLocaleString()} pts
                    </span>
                  </div>

                  {/* Location Pill */}
                  {latestReward.location && (
                    <div
                      style={{
                        display: "flex",
                        padding: "4px 8px",
                        alignItems: "center",
                        gap: "8px",
                        alignSelf: "stretch",
                        borderRadius: "1000px",
                        border: "1px solid #000000",
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4 inline-block"
                        fill="#7D7D7D"
                        viewBox="0 0 20 20"
                        stroke="none"
                        aria-hidden="true"
                      >
                        <path d="M10 2C7.24 2 5 4.24 5 7c0 5.25 5 11 5 11s5-5.75 5-11c0-2.76-2.24-5-5-5zm0 7.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                      </svg>
                      <span className="flex items-center gap-1 text-black body-small uppercase font-abc-monument-regular">
                        {latestReward.location}
                      </span>
                    </div>
                  )}

                  {/* Date/Time Left Pill */}
                  {latestReward.end_date && (
                    <div
                      style={{
                        display: "flex",
                        padding: "4px 8px",
                        alignItems: "center",
                        gap: "8px",
                        alignSelf: "stretch",
                        borderRadius: "1000px",
                        border: "1px solid #000000",
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4 inline-block"
                        fill="#7D7D7D"
                        viewBox="0 0 20 20"
                        stroke="#7D7D7D"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      >
                        <rect
                          x="3"
                          y="4"
                          width="14"
                          height="13"
                          rx="2"
                          className="fill-transparent"
                          stroke="#7D7D7D"
                        />
                        <path
                          d="M3 8h14"
                          stroke="#7D7D7D"
                          strokeLinecap="round"
                        />
                        <path
                          d="M7 2v2M13 2v2"
                          stroke="#7D7D7D"
                          strokeLinecap="round"
                        />
                      </svg>
                      <TimeLeft
                        endDate={latestReward.end_date}
                        className={`text-black body-small uppercase font-abc-monument-regular ${
                          latestRewardExpired
                            ? "text-red-600"
                            : latestRewardExpiringSoon
                              ? "text-orange-600"
                              : ""
                        }`}
                      />
                    </div>
                  )}
                </div>

                {/* View Details Button */}
                <Link
                  href={`/perks/${latestReward.id}`}
                  className="w-full"
                >
                  <button
                    className={`w-full bg-white text-black font-bold rounded-full py-3 px-4 hover:bg-gray-100 transition-colors flex items-center justify-between ${
                      latestRewardRedeemed
                        ? "bg-green-100"
                        : !latestRewardAffordable || latestRewardExpired
                          ? "opacity-50"
                          : ""
                    }`}
                    disabled={!latestRewardAffordable || latestRewardExpired}
                  >
                    <span className="font-pleasure text-left">
                      {latestRewardRedeemed
                        ? "✓ Redeemed"
                        : latestRewardExpired
                          ? "Expired"
                          : latestRewardAffordable
                            ? "View Details"
                            : "Insufficient Points"}
                    </span>
                    <div
                      style={{
                        display: "flex",
                        width: "24px",
                        height: "24px",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Image
                        src="/home/arrow-right.svg"
                        alt="arrow-right"
                        width={20}
                        height={20}
                        className="w-5 h-5"
                      />
                    </div>
                  </button>
                </Link>
              </div>
            </div>
          )}

          {/* Loading State */}
          {perksLoading && (
            <div className="space-y-1">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    padding: "16px",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: "8px",
                    alignSelf: "stretch",
                    borderRadius: "26px",
                    border: "1px solid #EDEDED",
                    background: "#FFF",
                    boxShadow: "0 1px 8px 0 rgba(0, 0, 0, 0.08)",
                  }}
                  className="animate-pulse"
                >
                  <div className="flex justify-between items-start mb-3 w-full">
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
            <div className="space-y-1">
              {perks.length > 0 ? (
                perks
                  .filter((perk) => perk.id !== latestReward?.id)
                  .map((perk) => {
                  const affordable = !address || canAfford(perk);
                  const isExpired =
                    perk.end_date && new Date(perk.end_date) < new Date();
                  const isExpiringSoon =
                    perk.end_date &&
                    new Date(perk.end_date) <
                      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                  const userRedeemed = perk.id ? hasRedeemed(perk.id) : false;

                  return (
                    <div
                      key={perk.id}
                      style={{
                        display: "flex",
                        padding: "16px",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: "8px",
                        alignSelf: "stretch",
                        borderRadius: "26px",
                        border: "1px solid #EDEDED",
                        background: "#FFF",
                        boxShadow: "0 1px 8px 0 rgba(0, 0, 0, 0.08)",
                        opacity: !affordable || isExpired ? 0.6 : 1,
                      }}
                    >
                      {/* Header */}
                      <div className="flex justify-between items-start w-full">
                        <div className="flex flex-wrap gap-2 flex-1">
                          <span
                            style={{
                              display: "flex",
                              padding: "4px 8px",
                              alignItems: "center",
                              gap: "8px",
                              borderRadius: "1000px",
                              border: "1px solid #EDEDED",
                              background: "#EDEDED",
                            }}
                            className="text-black body-small uppercase font-abc-monument-regular"
                          >
                            {perk.type}
                          </span>
                          {isExpiringSoon && !isExpired && (
                            <span
                              style={{
                                display: "flex",
                                padding: "4px 8px",
                                alignItems: "center",
                                gap: "8px",
                                borderRadius: "1000px",
                                border: "1px solid #EDEDED",
                                background: "#EDEDED",
                              }}
                              className="text-black body-small uppercase font-abc-monument-regular"
                            >
                              Ending Soon
                            </span>
                          )}
                          {isExpired && (
                            <span
                              style={{
                                display: "flex",
                                padding: "4px 8px",
                                alignItems: "center",
                                gap: "8px",
                                borderRadius: "1000px",
                                border: "1px solid #EDEDED",
                                background: "#EDEDED",
                              }}
                              className="text-black body-small uppercase font-abc-monument-regular"
                            >
                              Expired
                            </span>
                          )}
                          {userRedeemed && (
                            <span
                              style={{
                                display: "flex",
                                padding: "4px 8px",
                                alignItems: "center",
                                gap: "8px",
                                borderRadius: "1000px",
                                border: "1px solid #EDEDED",
                                background: "#EDEDED",
                              }}
                              className="text-black body-small uppercase font-abc-monument-regular"
                            >
                              ✓ Redeemed
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-black title3 font-pleasure">
                            {perk.points_threshold.toLocaleString()}
                          </span>
                          <span className="text-black body-small font-abc-monument-regular ml-1">
                            pts
                          </span>
                        </div>
                      </div>

                      {/* Thumbnail and Content */}
                      <div className="flex gap-4 w-full">
                        {/* Thumbnail */}
                        {perk.thumbnail_url && (
                          <div className="flex-shrink-0">
                            <Image
                              src={perk.thumbnail_url}
                              alt={perk.title}
                              width={120}
                              height={120}
                              className="rounded-xl object-cover"
                              style={{
                                width: "120px",
                                height: "120px",
                                borderRadius: "16px",
                              }}
                            />
                          </div>
                        )}

                        {/* Title and Description */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-black title3 font-pleasure text-left w-full">
                            {perk.title}
                          </h3>
                          <p className="text-black body-small font-abc-monument-regular mb-4 line-clamp-2">
                            {perk.description}
                          </p>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="flex w-full gap-2 mb-4 flex-wrap">
                        {perk.location && (
                          <div
                            style={{
                              display: "flex",
                              padding: "4px 8px",
                              alignItems: "center",
                              gap: "8px",
                              alignSelf: "stretch",
                              borderRadius: "1000px",
                              border: "1px solid #EDEDED",
                            }}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="w-4 h-4 text-black inline-block"
                              fill="none"
                              viewBox="0 0 20 20"
                              stroke="#7D7D7D"
                              strokeWidth={1.5}
                              aria-hidden="true"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M10 18s6-5.686 6-10A6 6 0 1 0 4 8c0 4.314 6 10 6 10Z"
                                className="stroke-current"
                              />
                              <circle
                                cx="10"
                                cy="8"
                                r="2.25"
                                className="stroke-current"
                                strokeWidth={1.5}
                              />
                            </svg>
                            <span className="text-black body-small uppercase font-abc-monument-regular">
                              {perk.location}
                            </span>
                          </div>
                        )}

                        {perk.end_date && (
                          <div
                            style={{
                              display: "flex",
                              padding: "4px 8px",
                              alignItems: "center",
                              gap: "8px",
                              alignSelf: "stretch",
                              borderRadius: "1000px",
                              border: "1px solid #EDEDED",
                            }}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="w-4 h-4 inline-block text-black"
                              fill="#7D7D7D"
                              viewBox="0 0 20 20"
                              stroke="#7D7D7D"
                              strokeWidth={1.5}
                              aria-hidden="true"
                            >
                              <rect
                                x="3"
                                y="4"
                                width="14"
                                height="13"
                                rx="2"
                                className="fill-transparent"
                                stroke="#7D7D7D"
                              />
                              <path
                                d="M3 8h14"
                                stroke="#7D7D7D"
                                strokeLinecap="round"
                              />
                              <path
                                d="M7 2v2M13 2v2"
                                stroke="#7D7D7D"
                                strokeLinecap="round"
                              />
                            </svg>
                            <TimeLeft
                              endDate={perk.end_date}
                              className={`text-black body-small uppercase font-abc-monument-regular ${
                                isExpired
                                  ? "text-red-600"
                                  : isExpiringSoon
                                    ? "text-orange-600"
                                    : ""
                              }`}
                            />
                          </div>
                        )}

                        {perk.website_url && (
                          <a
                            href={perk.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "flex",
                              padding: "4px 8px",
                              alignItems: "center",
                              gap: "8px",
                              alignSelf: "stretch",
                              borderRadius: "1000px",
                              border: "1px solid #EDEDED",
                            }}
                            className="text-black body-small uppercase font-abc-monument-regular hover:bg-gray-50"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Visit Website
                          </a>
                        )}

                        {perk.id && (
                          <div
                            style={{
                              display: "flex",
                              padding: "4px 8px",
                              alignItems: "center",
                              gap: "8px",
                              alignSelf: "stretch",
                              borderRadius: "1000px",
                              border: "1px solid #EDEDED",
                            }}
                          >
                            <PerkCodeCount perkId={perk.id} />
                          </div>
                        )}
                      </div>

                      {/* Status Messages */}
                      {!affordable &&
                        address &&
                        !isExpired &&
                        !userRedeemed && (
                          <div className="text-black body-small font-abc-monument-regular mb-3">
                            Need{" "}
                            {(
                              perk.points_threshold - userPoints
                            ).toLocaleString()}{" "}
                            more points
                          </div>
                        )}

                      {/* Action Button */}
                      <Link href={`/perks/${perk.id}`} className="w-full">
                        <button
                          className={`w-full bg-[#EDEDED] text-black font-bold rounded-full py-3 px-4 hover:bg-gray-100 transition-colors flex items-center justify-between ${
                            userRedeemed
                              ? "bg-green-100"
                              : !affordable || isExpired
                                ? "opacity-50"
                                : ""
                          }`}
                          disabled={!affordable || isExpired}
                        >
                          <span className="font-pleasure text-left">
                            {userRedeemed
                              ? "✓ Redeemed"
                              : isExpired
                                ? "Expired"
                                : affordable
                                  ? "View Details"
                                  : "Insufficient Points"}
                          </span>
                          <div
                            style={{
                              display: "flex",
                              width: "24px",
                              height: "24px",
                              justifyContent: "center",
                              alignItems: "center",
                            }}
                          >
                            <Image
                              src="/home/arrow-right.svg"
                              alt="arrow-right"
                              width={20}
                              height={20}
                              className="w-5 h-5"
                            />
                          </div>
                        </button>
                      </Link>
                    </div>
                  );
                })
              ) : (
                <div
                  style={{
                    display: "flex",
                    padding: "16px",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                    alignSelf: "stretch",
                    borderRadius: "26px",
                    border: "1px solid #EDEDED",
                    background: "#FFF",
                    boxShadow: "0 1px 8px 0 rgba(0, 0, 0, 0.08)",
                  }}
                  className="text-center py-8"
                >
                  <Gift className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-black body-small font-abc-monument-regular mb-2">
                    No perks available
                  </p>
                  <p className="text-black body-small font-abc-monument-regular">
                    Check back later for new rewards!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ height: "100px" }} />
      </div>
    </div>
  );
}
