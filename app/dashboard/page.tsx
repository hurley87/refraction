"use client";

import React, { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import Image from "next/image";
import MapNav from "@/components/map/mapnav";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCurrentPlayer,
  usePlayerRank,
  usePlayerActivities,
} from "@/hooks/usePlayer";
import Transactions from "@/components/transactions";

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
  const currentUserAddress = user?.wallet?.address;

  // Use new hooks for data fetching
  const { data: player, isLoading: isLoadingPlayer } =
    useCurrentPlayer();
  const { data: rank, isLoading: isLoadingRank } = usePlayerRank(
    currentUserAddress
  );
  const {
    data: activities = [],
    isLoading: isLoadingActivities,
    error: activitiesError,
  } = usePlayerActivities(currentUserAddress);

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (ready && !user) {
      router.push("/");
    }
  }, [ready, user, router]);

  // Track scroll position for sticky header background
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Compute user stats from hooks
  const isLoadingUserStats = isLoadingPlayer || isLoadingRank;
  const userStats = player
    ? {
        rank: rank ?? 999,
        total_points: player.total_points || 0,
      }
    : null;

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
          <Transactions
            activities={activities}
            isLoading={isLoadingActivities}
            error={activitiesError}
            showEmptyStateAction={true}
            emptyStateActionHref="/interactive-map"
            emptyStateActionLabel="Explore Map"
            maxHeight="400px"
          />
        </div>
      </div>
    </div>
  );
}

