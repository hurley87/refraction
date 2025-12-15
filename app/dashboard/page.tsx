"use client";

import React, { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Coins } from "lucide-react";
import Image from "next/image";
import MapNav from "@/components/map/mapnav";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface UserStats {
  rank: number;
  total_points: number;
}

interface Activity {
  id: string;
  date: string;
  description: string;
  activityType: string;
  points: number;
  event: string;
  metadata: any;
}

// Helper function to get ordinal suffix
const getOrdinalSuffix = (num: number): string => {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) {
    return "st";
  }
  if (j === 2 && k !== 12) {
    return "nd";
  }
  if (j === 3 && k !== 13) {
    return "rd";
  }
  return "th";
};

export default function DashboardPage() {
  const { user, ready } = usePrivy();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) {
      router.push("/");
    }
  }, [ready, user, router]);

  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoadingUserStats, setIsLoadingUserStats] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  const currentUserAddress = user?.wallet?.address;

  // Track scroll position for sticky header background
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch current user's stats
  useEffect(() => {
    const loadUserStats = async () => {
      if (!currentUserAddress) return;

      setIsLoadingUserStats(true);
      try {
        const response = await fetch(
          `/api/player?walletAddress=${encodeURIComponent(currentUserAddress)}`
        );

        if (response.ok) {
          const result = await response.json();
          const player = result.player;

          if (player) {
            // Get user's actual rank from database
            const rankResponse = await fetch(
              `/api/player/rank?walletAddress=${encodeURIComponent(currentUserAddress)}`
            );

            let actualRank = 999;
            if (rankResponse.ok) {
              const rankResult = await rankResponse.json();
              actualRank = rankResult.rank || 999;
            }

            setUserStats({
              rank: actualRank,
              total_points: player.total_points || 0,
            });
          } else {
            // New user with no data
            setUserStats({
              rank: 999,
              total_points: 0,
            });
          }
        }
      } catch (error) {
        console.error("Error fetching user stats:", error);
        setUserStats({
          rank: 999,
          total_points: 0,
        });
      } finally {
        setIsLoadingUserStats(false);
      }
    };

    if (currentUserAddress) {
      loadUserStats();
    }
  }, [currentUserAddress]);

  // Fetch user's activities
  useEffect(() => {
    const fetchActivities = async () => {
      if (!currentUserAddress) return;

      setIsLoadingActivities(true);
      setActivitiesError(null);

      try {
        const response = await fetch(
          `/api/activities?wallet_address=${currentUserAddress}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch activities");
        }

        const data = await response.json();
        setActivities(data);
      } catch (err) {
        setActivitiesError(
          err instanceof Error ? err.message : "An error occurred"
        );
      } finally {
        setIsLoadingActivities(false);
      }
    };

    if (currentUserAddress) {
      fetchActivities();
    }
  }, [currentUserAddress]);

  // Not logged in state
  if (ready && !user) {
    return null;
  }

  return (
    <div
      style={{
        borderTopLeftRadius: "26px",
        borderTopRightRadius: "26px",
        background:
          "linear-gradient(0deg, rgba(0, 0, 0, 0.10) 0%, rgba(0, 0, 0, 0.10) 100%), linear-gradient(0deg, #EE91B7 0%, #FFE600 37.5%, #1BA351 66.34%, #61BFD1 100%)",
      }}
      className="min-h-screen px-2 pt-2 pb-4 font-grotesk"
    >
      <div className="max-w-md mx-auto">
        {/* Navigation - Sticky Header */}
        <div
          className={`sticky top-0 z-50 pb-2 pt-2 -mt-2 -mx-2 px-2 transition-colors duration-200 ${
            isScrolled ? "bg-transparent backdrop-blur-sm" : "bg-transparent"
          }`}
        >
          <MapNav />
        </div>

        <div className="space-y-2">
          {/* Hero Section - Points Display */}
          <div className="bg-white/20 backdrop-blur-md rounded-[26px] p-2 border border-white/30">
            <div className="flex flex-col gap-4">
              {/* Points Display */}
              <div className="flex flex-col gap-2 pt-2 pl-2 pr-2">
                <div className="flex items-center gap-2">
                  <Image
                    src="/ep-coin-white.svg"
                    alt="Points"
                    width={12}
                    height={12}
                    className="w-4 h-4"
                  />
                  <div className="body-small font-grotesk text-[#EDEDED] uppercase tracking-wide">
                    Your Points
                  </div>
                </div>
                <div className="flex justify-end">
                  {isLoadingUserStats ? (
                    <div className="w-20 h-10 bg-white/20 animate-pulse rounded"></div>
                  ) : (
                    <div className="flex items-end gap-2">
                      <div className="display1 text-white font-inktrap">
                        {userStats?.total_points?.toLocaleString() || "0"}
                      </div>
                      <Image
                        src="/points-label-white.svg"
                        alt="points"
                        width={39}
                        height={18}
                        className="mb-1"
                        style={{ width: "auto", height: "auto" }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Complete Quest Section - Inside Hero */}
              <div 
                className="flex flex-col items-start gap-2 self-stretch rounded-[16px] p-3"
                style={{ background: "rgba(255, 255, 255, 0.15)" }}
              >
                <div className="flex items-center gap-2">
                  <span className="body-small text-[#EDEDED] uppercase tracking-wide">
                    EARN MORE
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="title3 text-white font-grotesk">
                      Complete Quests to Earn Points
                    </div>
                  </div>
                
                </div>
                <Link
                  href="https://app.galxe.com/quest/A2w5Zojdy46VKJVvpptTwf/GCzcut8Kwg?refer=quest_parent_collection"
                  target="_blank"
                  className="w-full h-[40px] bg-white hover:bg-gray-100 text-[#313131] px-4 rounded-full font-pleasure transition-colors duration-200 flex items-center justify-between"
                >
                  <h4>Complete Quests</h4>
                  <Image
                    src="/glxe.png"
                    alt="galxe"
                    width={21}
                    height={21}
                    className="w-[21px] h-[21px]"
                  />
                </Link>
              </div>
            </div>
          </div>

          {/* Rank Section */}
          <div className="bg-white rounded-[26px] p-4">
            <div className="flex flex-col gap-2 p-2">
              <div className="flex items-center gap-2">
                <Image
                  src="/leaderboard.svg"
                  alt="Place"
                  width={12}
                  height={12}
                  className="w-4 h-4"
                />
                <div className="body-small font-grotesk text-[#7D7D7D] uppercase tracking-wide">
                  Your Rank
                </div>
              </div>
              <div className="flex justify-end">
                {isLoadingUserStats ? (
                  <div className="w-16 h-8 bg-gray-200 animate-pulse rounded"></div>
                ) : userStats?.rank ? (
                  <Link
                    href="/leaderboard"
                    className="flex items-end gap-2 hover:opacity-80 transition-opacity"
                  >
                    <div className="flex items-baseline">
                      <div className="display2 text-[#313131] font-inktrap">
                        {userStats.rank}
                      </div>
                      <h4 className="text-[#313131] font-inktrap font-normal">
                        {getOrdinalSuffix(userStats.rank)}
                      </h4>
                    </div>
                    <div className="w-auto h-auto">
                      <Image
                        src="/place-grey.svg"
                        alt="Place"
                        width={39}
                        height={18}
                        className="mb-1"
                        style={{ width: "auto", height: "auto" }}
                      />
                    </div>
                  </Link>
                ) : (
                  <span className="display2 text-[#313131]">?</span>
                )}
              </div>
            </div>
          
          </div>

          {/* Transaction Ledger Section */}
          <div className="bg-white rounded-[26px] p-[16px] pt-[24px]">
            <div className="flex items-center gap-2 mb-4">
              <Image
                src="/list-icon.svg"
                alt="Place"
                width={8}
                height={8}
                className="w-4 h-4"
              />
              <h2 className="body-small font-grotesk text-[#7D7D7D]">
                TRANSACTIONS
              </h2>
            </div>

            {/* Loading State */}
            {isLoadingActivities && (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse flex justify-between items-center py-3 border-b border-gray-100"
                  >
                    <div className="w-20 h-4 bg-gray-200 rounded"></div>
                    <div className="w-32 h-4 bg-gray-200 rounded"></div>
                    <div className="w-16 h-4 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            )}

            {/* Error State */}
            {activitiesError && (
              <div className="text-center py-6">
                <p className="text-red-600 text-sm">{activitiesError}</p>
              </div>
            )}

            {/* Empty State */}
            {!isLoadingActivities &&
              !activitiesError &&
              activities.length === 0 && (
                <div className="text-center py-6">
                  <Coins className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 font-grotesk body-medium">
                    No activity yet
                  </p>
                  <p className="text-sm text-gray-500 font-grotesk mt-1">
                    Check in at locations to start earning points
                  </p>
                  <Link
                    href="/interactive-map"
                    className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-[#1BA351] hover:bg-[#158f44] text-white rounded-full text-sm font-grotesk transition-colors"
                  >
                    <span>Explore Map</span>
                    <Image
                      src="/home/arrow-right.svg"
                      alt="arrow"
                      width={16}
                      height={16}
                      className="w-4 h-4 brightness-0 invert"
                    />
                  </Link>
                </div>
              )}

            {/* Activities List */}
            {!isLoadingActivities &&
              !activitiesError &&
              activities.length > 0 && (
                <>
                  {/* Table Header */}
                  <div className="grid grid-cols-[1fr_2fr_auto] gap-2 pb-2 border-b border-gray-200 mb-2">
                    <span className="body-small text-[#B5B5B5] uppercase tracking-wide">
                      Date
                    </span>
                    <span className="body-small text-[#B5B5B5] uppercase tracking-wide">
                      Activity
                    </span>
                    <span className="body-small text-[#B5B5B5] uppercase tracking-wide text-right">
                      Points
                    </span>
                  </div>

                  {/* Activities */}
                  <div className="space-y-0 max-h-[400px] overflow-y-auto">
                    {activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="grid grid-cols-[1fr_2fr_auto] gap-2 py-3 border-b border-gray-100 last:border-b-0 items-center"
                      >
                        <div className="body-medium text-[#F0A0AF] font-grotesk">
                          {activity.date}
                        </div>
                        <div className="body-medium text-[#4F4F4F] font-grotesk truncate">
                          {activity.event}
                        </div>
                        <div className="body-medium text-[#7D7D7D] font-grotesktext-right whitespace-nowrap">
                          +{activity.points}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* View All Link */}
                  {activities.length >= 20 && (
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <button className="w-full h-[40px] bg-[#ededed] hover:bg-gray-200 text-[#313131] px-4 rounded-full transition-colors duration-200 flex items-center justify-center">
                        <span className="body-small font-grotesk uppercase">
                          Load More
                        </span>
                      </button>
                    </div>
                  )}
                </>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}

