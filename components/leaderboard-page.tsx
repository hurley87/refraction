"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Trophy, ChevronRight, Gift, Menu } from "lucide-react";
import Header from "./header";
import { usePrivy } from "@privy-io/react-auth";
import {
  PointsActivity,
  PointsActivityConfig,
  POINTS_ACTIVITIES_CONFIG,
  getActiveActivities,
  getActivitiesByCategory,
  PointsCategory,
} from "@/lib/points-activities";

interface LeaderboardEntry {
  id: string;
  wallet_address: string;
  username?: string;
  total_points: number;
  rank: number;
  badge_level: number;
  badge_name: string;
}

export default function LeaderboardPage() {
  const { user } = usePrivy();
  const walletAddress = user?.wallet?.address;

  // Mock data - replace with actual API calls
  const [playerData, setPlayerData] = useState({
    total_points: 310,
    rank: 2380,
    badge_level: 4,
    badge_name: "Badge Name",
    points_to_next_level: 690,
    next_level_threshold: 1000,
  });

  const [pointsActivity] = useState<PointsActivity[]>([
    {
      id: "1",
      user_wallet_address: walletAddress || "",
      activity_type: "daily_checkin",
      points_earned: 30,
      description: "Daily check-in completed",
      created_at: "2024-01-01T10:00:00Z",
      processed: true,
    },
    {
      id: "2",
      user_wallet_address: walletAddress || "",
      activity_type: "social_share",
      points_earned: 20,
      description: "Shared content on social media",
      created_at: "2024-01-01T14:30:00Z",
      processed: true,
    },
    {
      id: "3",
      user_wallet_address: walletAddress || "",
      activity_type: "transaction_complete",
      points_earned: 25,
      description: "Completed a transaction",
      created_at: "2024-01-02T09:15:00Z",
      processed: true,
    },
    {
      id: "4",
      user_wallet_address: walletAddress || "",
      activity_type: "community_post",
      points_earned: 30,
      description: "Created a community post",
      created_at: "2024-01-02T16:45:00Z",
      processed: true,
    },
    {
      id: "5",
      user_wallet_address: walletAddress || "",
      activity_type: "nft_mint",
      points_earned: 150,
      description: "Minted an NFT",
      created_at: "2024-01-03T11:20:00Z",
      processed: true,
    },
    {
      id: "6",
      user_wallet_address: walletAddress || "",
      activity_type: "referral_signup",
      points_earned: 100,
      description: "Friend signed up using referral",
      created_at: "2024-01-03T18:00:00Z",
      processed: true,
    },
    {
      id: "7",
      user_wallet_address: walletAddress || "",
      activity_type: "achievement_unlock",
      points_earned: 100,
      description: "Unlocked first achievement",
      created_at: "2024-01-04T12:30:00Z",
      processed: true,
    },
    {
      id: "8",
      user_wallet_address: walletAddress || "",
      activity_type: "level_up",
      points_earned: 200,
      description: "Advanced to level 2",
      created_at: "2024-01-04T20:15:00Z",
      processed: true,
    },
  ]);

  const progressPercentage =
    ((playerData.next_level_threshold - playerData.points_to_next_level) /
      playerData.next_level_threshold) *
    100;

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

        {/* Dashboard Header */}
        <div className="px-4 pt-8 mb-6">
          <div className="bg-white rounded-2xl p-4 flex items-center justify-between">
            <h1 className="text-xl font-inktrap font-bold text-black">
              Dashboard
            </h1>
            <Button variant="ghost" size="sm" className="p-2">
              <Menu className="w-5 h-5 text-gray-600" />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-4 space-y-4">
          {/* Your Points Card */}
          <div className="bg-white rounded-2xl p-4">
            <p className="text-xs font-inktrap text-gray-600 mb-2 uppercase tracking-wide">
              YOUR POINTS
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-inktrap font-bold text-black">
                {playerData.total_points}
              </span>
              <span className="text-lg font-inktrap text-gray-600">pts</span>
            </div>
            <hr className="my-4 border-gray-200" />

            {/* Your Place Section */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-inktrap text-gray-600 mb-2 uppercase tracking-wide">
                  YOUR PLACE
                </p>
                <div className="flex items-center gap-3">
                  <div className="bg-gray-100 rounded-full px-3 py-1 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-gray-600" />
                    <span className="font-inktrap font-medium text-black">
                      {playerData.rank}
                    </span>
                  </div>
                </div>
              </div>
              <Button className="bg-yellow-400 hover:bg-yellow-500 text-black font-inktrap rounded-full px-6 py-2">
                Leaderboard
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>

          {/* Your Level Card */}
          <div className="bg-white rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-inktrap text-gray-600 mb-2 uppercase tracking-wide">
                  YOUR LEVEL
                </p>
                <p className="text-lg font-inktrap font-medium text-black">
                  {playerData.badge_name}
                </p>
              </div>
              <div className="text-6xl font-inktrap font-bold text-black">
                {playerData.badge_level}
              </div>
            </div>

            <hr className="my-4 border-gray-200" />

            {/* Next Level Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-inktrap text-gray-600 mb-1 uppercase tracking-wide">
                    NEXT LEVEL
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-inktrap font-bold text-black">
                      {playerData.points_to_next_level}
                    </span>
                    <span className="text-sm font-inktrap text-gray-600">
                      pts left
                    </span>
                  </div>
                </div>
                <Button className="bg-teal-400 hover:bg-teal-500 text-black font-inktrap rounded-full px-6 py-2">
                  Rewards
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-inktrap text-gray-600">
                  <span>100</span>
                  <span>250</span>
                  <span>500</span>
                  <span>750</span>
                  <span>1000</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
                  <div className="grid grid-cols-4 h-full">
                    <div className="bg-gray-400 border-r border-white"></div>
                    <div className="bg-gray-400 border-r border-white"></div>
                    <div className="bg-gray-400 border-r border-white"></div>
                    <div className="bg-gray-200"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Points Activity Card */}
          <div className="bg-yellow-100 rounded-2xl p-4 mb-6">
            <h3 className="text-lg font-inktrap font-medium text-black mb-4">
              Points Activity
            </h3>

            {/* Table Header */}
            <div className="grid grid-cols-4 gap-4 pb-2 border-b border-gray-300 mb-2">
              <span className="text-xs font-inktrap text-gray-600 uppercase tracking-wide">
                REWARD
              </span>
              <span className="text-xs font-inktrap text-gray-600 uppercase tracking-wide">
                POINTS
              </span>
              <span className="text-xs font-inktrap text-gray-600 uppercase tracking-wide">
                DESCRIPTION
              </span>
              <span className="text-xs font-inktrap text-gray-600 uppercase tracking-wide">
                EVE
              </span>
            </div>

            {/* Activity List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {pointsActivity.map((activity) => {
                const activityConfig = POINTS_ACTIVITIES_CONFIG.find(
                  (config) => config.type === activity.activity_type
                );

                return (
                  <div
                    key={activity.id}
                    className="grid grid-cols-4 gap-4 items-center py-2 border-b border-gray-200 last:border-b-0"
                  >
                    <div className="flex items-center">
                      <span className="text-lg">
                        {activityConfig?.icon || "🏷️"}
                      </span>
                    </div>
                    <span className="font-inktrap font-medium text-black">
                      {activity.points_earned}
                    </span>
                    <span className="font-inktrap text-black text-sm">
                      {activity.description}
                    </span>
                    <span className="font-inktrap text-black text-sm">
                      {activityConfig?.category || "activity"}
                    </span>
                  </div>
                );
              })}
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
