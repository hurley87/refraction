"use client";

import { Button } from "@/components/ui/button";
import { useCheckInStatus } from "@/hooks/useCheckInStatus";
import { usePrivy } from "@privy-io/react-auth";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Auth from "./auth";
import Link from "next/link";

interface CheckpointProps {
  id: string;
}

export default function Checkpoint({ id }: CheckpointProps) {
  const { user } = usePrivy();
  const address = user?.wallet?.address as `0x${string}`;
  const email = user?.email?.address;
  const {
    checkinStatus,
    setCheckinStatus,
    checkpointCheckinToday,
    setCheckpointCheckinToday,
    dailyRewardClaimed,
    setDailyRewardClaimed,
    pointsEarnedToday,
    setPointsEarnedToday,
  } = useCheckInStatus(address, id);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  const [totalPoints, setTotalPoints] = useState<number>(310);
  const hasAttemptedCheckIn = useRef(false);
  const router = useRouter();

  // Fetch player stats (rank and points)
  useEffect(() => {
    const fetchPlayerStats = async () => {
      if (!address) return;

      try {
        // Get player data
        const playerResponse = await fetch(
          `/api/player?walletAddress=${address}`,
        );
        if (playerResponse.ok) {
          const playerData = await playerResponse.json();
          if (playerData.success && playerData.player) {
            setTotalPoints(playerData.player.total_points);
          }
        }
      } catch (error) {
        console.error("Failed to fetch player stats:", error);
      }
    };

    fetchPlayerStats();
  }, [address]);

  useEffect(() => {
    if (!checkpointCheckinToday) {
      hasAttemptedCheckIn.current = false;
    }
  }, [checkpointCheckinToday]);

  useEffect(() => {
    // Skip if we've already attempted a check-in in this session
    if (hasAttemptedCheckIn.current) {
      return;
    }

    const autoCheckIn = async () => {
      // Only proceed if we have the required user data and aren't already checking in
      if (!user || !address || isCheckingIn) {
        return;
      }

      try {
        // If checkinStatus is already true, no need to check again
        if (checkpointCheckinToday) {
          return;
        }

        // Mark that we've attempted a check-in to prevent duplicate attempt
        hasAttemptedCheckIn.current = true;
        // If we get here, user is not checked in, so proceed with check-in
        setIsCheckingIn(true);

        // Make the API call to check in and update points
        const response = await fetch("/api/checkin", {
          method: "POST",
          body: JSON.stringify({
            walletAddress: address,
            email,
            checkpoint: id,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result?.success) {
            setCheckinStatus(true);
            setCheckpointCheckinToday(true);
            setDailyRewardClaimed(result.dailyRewardClaimed ?? false);
            const earnedToday =
              typeof result.pointsEarnedToday === "number"
                ? result.pointsEarnedToday
                : 0;
            const pointsAwarded =
              typeof result.pointsAwarded === "number"
                ? result.pointsAwarded
                : 0;
            setPointsEarnedToday(earnedToday || pointsAwarded);
            if (
              result?.player &&
              typeof result.player.total_points === "number"
            ) {
              setTotalPoints(result.player.total_points);
            }
          }
        }
      } catch (error) {
        console.error("Failed to auto check-in:", error);
        // Reset the attempt flag on error so we can try again if needed
        hasAttemptedCheckIn.current = false;
      } finally {
        setIsCheckingIn(false);
      }
    };

    // Only run the auto check-in if we have a user and the checkinStatus is not null
    // This ensures we don't run before the hook has had a chance to fetch the initial status
    if (user && checkinStatus !== null) {
      autoCheckIn();
    }
  }, [
    user,
    address,
    id,
    email,
    checkinStatus,
    checkpointCheckinToday,
    isCheckingIn,
    setCheckinStatus,
    setCheckpointCheckinToday,
    setDailyRewardClaimed,
    setPointsEarnedToday,
  ]);

  const rewardPoints = dailyRewardClaimed
    ? pointsEarnedToday || 100
    : pointsEarnedToday;
  const hasDailyReward = dailyRewardClaimed || rewardPoints >= 100;
  const headerTitle = hasDailyReward ? "YOU EARNED" : "YOU'RE CHECKED IN";
  const headerSubtitle = hasDailyReward
    ? `${rewardPoints} POINTS`
    : "COME BACK TOMORROW";

  return (
    <Auth>
      {!checkinStatus && (
        <div className="flex items-center justify-center text-center w-full min-h-dvh font-inktrap text-2xl">
          Loading ...
        </div>
      )}
      {checkinStatus && (
        <div className="font-grotesk">
          <div className="flex flex-col items-center text-center py-8 gap-6">
            {/* Header Section */}
            <div className="flex flex-col items-center gap-1">
              <h1 className="text-5xl font-inktrap uppercase text-yellow-300 font-bold">
                {headerTitle}
              </h1>
              <h2 className="text-5xl font-inktrap uppercase text-yellow-300 font-bold">
                {headerSubtitle}
              </h2>
            </div>

            {/* Total Points Card */}
            <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-lg">
              <div className="text-xs text-gray-500 font-inktrap mb-2">
                YOUR POINTS
              </div>
              <div className="text-4xl font-bold text-black font-inktrap mb-4">
                {totalPoints} <span className="text-lg font-normal">pts</span>
              </div>

              <div className="flex justify-between items-center">
                <Link href="/leaderboard" className="w-full">
                  <Button className="bg-yellow-400 hover:bg-yellow-500 text-black rounded-full font-inktrap text-sm px-4 py-2 w-full">
                    Leaderboard →
                  </Button>
                </Link>
              </div>
            </div>

            {/* Footer Section */}
            <div className="mt-12 px-4 max-w-sm ">
              <p className="text-black font-anonymous text-2xl font-semibold mb-6">
                Learn more and be the first to know about the latest IRL network
                news.
              </p>
              <Button
                onClick={() => router.push("/")}
                className="text-black bg-white rounded-full w-full font-inktrap py-3 text-lg hover:bg-gray-100"
              >
                Visit IRL.ENERGY →
              </Button>
            </div>
            {/* Bottom IRL Section */}
            <div className="py-20">
              <img
                src="/irl-bottom-logo.svg"
                alt="IRL"
                className="w-full h-auto"
              />
            </div>
            {/* Powered by Refraction */}
            <div className="mt-8 mb-8">
              <p className="text-white text-xs font-inktrap opacity-60">
                POWERED BY
              </p>
              <p className="text-white text-lg font-inktrap font-bold">
                REFRACTION
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Map Modal */}
      {isMapModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setIsMapModalOpen(false)}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setIsMapModalOpen(false)}
              className="absolute top-4 right-4 text-white text-2xl font-bold bg-black bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-75 transition-colors z-10"
            >
              ×
            </button>
            <img
              src="/mutek/mutek-map.jpg"
              alt="IRL Venue Map - Full Size"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </Auth>
  );
}
