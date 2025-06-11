"use client";

import { Button } from "@/components/ui/button";
import { Menu, ArrowRight } from "lucide-react";
import Header from "./header";

// Mock leaderboard data
const leaderboardData = [
  { rank: 1, name: "Member", points: 1005, color: "bg-blue-500" },
  { rank: 2, name: "Member", points: 1005, color: "bg-green-500" },
  { rank: 3, name: "Member", points: 1005, color: "bg-purple-500" },
  { rank: 4, name: "Member", points: 1005, color: "bg-orange-500" },
  { rank: 5, name: "Member", points: 1005, color: "bg-blue-600" },
  { rank: 6, name: "Member", points: 1005, color: "bg-pink-500" },
  { rank: 7, name: "Member", points: 1005, color: "bg-teal-500" },
  { rank: 8, name: "Member", points: 1005, color: "bg-blue-400" },
  { rank: 9, name: "Member", points: 1005, color: "bg-yellow-500" },
];

export default function LeaderboardPage() {
  // Mock user data
  const playerData = {
    total_points: 310,
    rank: 178,
  };

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

        {/* Leaderboard Header */}
        <div className="px-0 pt-8 mb-6">
          <div className="bg-white rounded-2xl p-4 flex items-center justify-between">
            <h1 className="text-xl font-inktrap font-bold text-black">
              Leaderboard
            </h1>
            <Button variant="ghost" size="sm" className="p-2">
              <Menu className="w-5 h-5 text-gray-600" />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-0 space-y-4">
          {/* Your Place and Points Card */}
          <div className="bg-white rounded-2xl p-4">
            <div className="grid grid-cols-2 gap-6">
              {/* Your Place */}
              <div>
                <p className="text-xs font-inktrap text-gray-600 mb-3 uppercase tracking-wide">
                  YOUR PLACE
                </p>
                <div className="flex items-center">
                  <div className="bg-gray-100 rounded-full px-4 py-2 flex items-center gap-2 border border-gray-300">
                    <span className="font-inktrap font-medium text-black text-lg">
                      {playerData.rank}
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-600" />
                  </div>
                </div>
              </div>

              {/* Your Points */}
              <div>
                <p className="text-xs font-inktrap text-gray-600 mb-3 uppercase tracking-wide">
                  YOUR POINTS
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-inktrap font-bold text-black">
                    {playerData.total_points}
                  </span>
                  <span className="text-sm font-inktrap text-gray-600">
                    pts
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Leaderboard Table */}
          <div className="bg-white rounded-2xl p-4">
            {/* Table Header */}
            <div className="grid grid-cols-3 gap-4 pb-3 border-b border-gray-200 mb-4">
              <span className="text-xs font-inktrap text-gray-600 uppercase tracking-wide">
                PLACE
              </span>
              <span className="text-xs font-inktrap text-gray-600 uppercase tracking-wide">
                NAME
              </span>
              <span className="text-xs font-inktrap text-gray-600 uppercase tracking-wide text-right">
                PTS
              </span>
            </div>

            {/* Leaderboard Entries */}
            <div className="space-y-2">
              {leaderboardData.map((entry) => (
                <div
                  key={entry.rank}
                  className="bg-gray-50 rounded-2xl p-4 grid grid-cols-3 gap-4 items-center"
                >
                  {/* Rank */}
                  <div className="flex items-center">
                    <span className="text-lg font-inktrap font-medium text-black w-6">
                      {entry.rank}
                    </span>
                  </div>

                  {/* Name with colored dot */}
                  <div className="flex items-center gap-2">
                    <span className="font-inktrap text-black text-sm">
                      {entry.name}
                    </span>
                  </div>

                  {/* Points */}
                  <div className="text-right">
                    <span className="font-inktrap font-medium text-black">
                      {entry.points}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-2 py-6">
            {/* Page 1 (active) */}
            <button className="w-10 h-10 rounded-full bg-black text-white font-inktrap font-medium text-sm flex items-center justify-center">
              1
            </button>

            {/* Page 2 */}
            <button className="w-10 h-10 rounded-full bg-white text-black font-inktrap font-medium text-sm flex items-center justify-center border border-gray-200 hover:bg-gray-50">
              2
            </button>

            {/* Page 3 */}
            <button className="w-10 h-10 rounded-full bg-white text-black font-inktrap font-medium text-sm flex items-center justify-center border border-gray-200 hover:bg-gray-50">
              3
            </button>

            {/* Ellipsis */}
            <span className="px-2 text-gray-500 font-inktrap">...</span>

            {/* Page 44 */}
            <button className="w-10 h-10 rounded-full bg-white text-black font-inktrap font-medium text-sm flex items-center justify-center border border-gray-200 hover:bg-gray-50">
              44
            </button>

            {/* Page 45 */}
            <button className="w-10 h-10 rounded-full bg-white text-black font-inktrap font-medium text-sm flex items-center justify-center border border-gray-200 hover:bg-gray-50">
              45
            </button>

            {/* Page 46 */}
            <button className="w-10 h-10 rounded-full bg-white text-black font-inktrap font-medium text-sm flex items-center justify-center border border-gray-200 hover:bg-gray-50">
              46
            </button>

            {/* Next button */}
            <button className="w-10 h-10 rounded-full bg-white text-black font-inktrap font-medium text-sm flex items-center justify-center border border-gray-200 hover:bg-gray-50">
              <ArrowRight className="w-4 h-4" />
            </button>
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
