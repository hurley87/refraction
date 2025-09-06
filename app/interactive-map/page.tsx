"use client";

import { useState } from "react";
import InteractiveMap from "@/components/interactive-map";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import MobileFooterNav from "@/components/mobile-footer-nav";

export default function InteractiveMapPage() {
  const { user, login } = usePrivy();
  const [playerData] = useState<any>(null);
  const [pointsEarned] = useState<number>(0);
  const [confirmed] = useState(false);

  // If points are confirmed/earned, show the success screen
  if (confirmed) {
    return (
      <div
        style={{
          background:
            "linear-gradient(0deg, #61BFD1 0%, #1BA351 33.66%, #FFE600 62.5%, #EE91B7 100%)",
        }}
        className="min-h-screen p-4 pb-0 font-grotesk"
      >
        <div className="min-h-screen max-w-lg mx-auto">
          {/* Header removed on this screen */}

          <div className="px-0 pt-8">
            <div className="bg-yellow-100 rounded-2xl p-6 mb-6 relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <p className="text-sm text-gray-700 mb-1 font-inktrap">
                    You Earned
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-6xl font-inktrap font-bold text-black">
                      {pointsEarned}
                    </span>
                    <span className="text-lg font-inktrap text-black">pts</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-black font-anonymous">
                You&apos;ve just gained access to events, rewards and bespoke
                experiences.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-4 mb-6">
              <h3 className="text-sm font-inktrap text-gray-600 uppercase mb-3">
                YOUR POINTS
              </h3>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-5xl font-inktrap font-bold text-black">
                  {playerData?.total_points || pointsEarned}
                </span>
                <span className="text-lg font-inktrap text-black">pts</span>
              </div>

              <div className="pt-0">
                <div className="flex items-center justify-between gap-2">
                  <Link className="flex-1" href="/leaderboard">
                    <Button className="bg-yellow-400 hover:bg-yellow-500 text-black font-inktrap px-4 py-2 rounded-full text-sm w-full">
                      Leaderboard
                    </Button>
                  </Link>
                  <Link className="flex-1" href="/interactive-map">
                    <Button className="bg-blue-400 hover:bg-blue-500 text-black font-inktrap px-4 py-2 rounded-full text-sm w-full">
                      Find More
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-b from-green-400 to-cyan-400 rounded-2xl p-6 mb-6 text-center">
              <h3 className="text-xl font-inktrap text-black mb-4">
                Learn more and be the first to know about the latest IRL network
                news
              </h3>
              <Link className="w-full" href="/">
                <Button className="bg-white hover:bg-gray-100 text-black font-inktrap px-6 py-3 rounded-full w-full">
                  Visit IRL.ENERGY
                </Button>
              </Link>
            </div>
          </div>

          <div className="py-6">
            <img
              src="/irl-bottom-logo.svg"
              alt="IRL"
              className="w-full h-auto"
            />
          </div>
        </div>
        <MobileFooterNav showOnDesktop />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-inktrap font-bold mb-4">
            Connect Your Wallet
          </h2>
          <p className="text-gray-600 mb-6">
            Connect your wallet to start exploring and earning points on the
            interactive map.
          </p>
          <Button
            onClick={login}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white"
          >
            Connect Wallet
          </Button>
        </div>
        <MobileFooterNav showOnDesktop />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 font-grotesk">
      <InteractiveMap />
      <MobileFooterNav showOnDesktop />
    </div>
  );
}
