"use client";

import { Button } from "@/components/ui/button";
import { useCheckInStatus } from "@/hooks/useCheckInStatus";
import { usePrivy } from "@privy-io/react-auth";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Auth from "./auth";

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
    setDailyRewardClaimed,
    // pointsEarnedToday,
    setPointsEarnedToday,
  } = useCheckInStatus(address, id);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [checkinError, setCheckinError] = useState<string | null>(null);

  const [, setTotalPoints] = useState<number>(310);
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

        const result = await response.json().catch(() => null);

        if (!response.ok || !result?.success) {
          setCheckinError(
            result?.error ||
              "Unable to check in right now. Please try again later.",
          );
          setCheckinStatus(false);
          setCheckpointCheckinToday(false);
          setDailyRewardClaimed(false);
          setPointsEarnedToday(0);
          return;
        }

        setCheckinError(null);
        setCheckinStatus(true);
        setCheckpointCheckinToday(true);
        setDailyRewardClaimed(result.dailyRewardClaimed ?? false);
        const earnedToday =
          typeof result.pointsEarnedToday === "number"
            ? result.pointsEarnedToday
            : 0;
        const pointsAwarded =
          typeof result.pointsAwarded === "number" ? result.pointsAwarded : 0;
        setPointsEarnedToday(earnedToday || pointsAwarded);
        if (result?.player && typeof result.player.total_points === "number") {
          setTotalPoints(result.player.total_points);
        }
      } catch (error) {
        console.error("Failed to auto check-in:", error);
        setCheckinError(
          "Something went wrong while checking you in. Please try again.",
        );
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

  if (checkinStatus === null && !checkinError) {
    return (
      <Auth>
        <div className="flex items-center justify-center text-center w-full min-h-dvh font-inktrap text-2xl">
          Loading ...
        </div>
      </Auth>
    );
  }

  return (
    <Auth>
      {checkinError && (
        <div className="flex flex-col items-center justify-center text-center w-full min-h-dvh font-grotesk px-6">
          <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-lg space-y-4">
            <h1 className="text-3xl font-inktrap text-red-600 uppercase">
              Daily Limit Reached
            </h1>
            <p className="text-black text-base">{checkinError}</p>
            <p className="text-gray-500 text-sm">
              You can complete up to 10 checkpoint visits per day. Come back
              tomorrow for more points.
            </p>
            <Button
              onClick={() => router.push("/")}
              className="text-black bg-yellow-300 rounded-full w-full font-inktrap py-3 text-lg hover:bg-yellow-400"
            >
              Visit IRL.ENERGY →
            </Button>
          </div>
        </div>
      )}
      {checkinStatus && !checkinError && (
        <div className="font-grotesk flex flex-col">
          <div className="flex flex-col items-start py-8 gap-8 flex-1">
            {/* Main Title with Graphic */}
            <div className="relative w-full max-w-md flex items-center justify-center my-4 mx-auto">
              {/* Yellow Wireframe Box Graphic */}
              <img
                src="/yellow-points.png"
                alt="Points earned graphic"
                className="w-full h-auto object-contain"
              />
              {/* Overlapping Title */}
              <h1 className="absolute inset-0 flex items-center justify-center text-5xl md:text-6xl font-bold text-white uppercase tracking-tight text-center font-inktrap z-10">
                YOU EARNED POINTS
              </h1>
            </div>

            {/* Points Display */}
            <div className="flex gap-3 w-full mt-2 justify-between">
              <p className="text-white text-xs uppercase tracking-wider font-grotesk pt-1">
                YOU EARNED
              </p>
              <div className="flex items-start gap-2">
                <span
                  style={{ lineHeight: "0.6" }}
                  className="text-7xl md:text-8xl font-bold text-white font-inktrap "
                >
                  {100}
                </span>
                <div className="text-xs text-white font-grotesk uppercase flex flex-col items-end justify-end h-full">
                  <span className="text-xs text-white font-grotesk uppercase bg-gray-500/40 rounded-full px-2.5 py-1 flex flex-col items-end justify-end h-fit">
                    PTS
                  </span>
                </div>
              </div>
            </div>

            {/* Descriptive Text */}
            <div className="">
              <p className="text-white text-sm leading-relaxed font-grotesk">
                You’ve just gained access to events, rewards and bespoke
                experiences.
              </p>
            </div>

            <div className="flex flex-col gap-1 w-full">
              {/* Call to Action Button */}
              <div className="w-full">
                <Button
                  onClick={() => router.push("/leaderboard")}
                  className="bg-white text-black rounded-full hover:bg-white/90 w-full font-inktrap py-6 text-base flex items-center justify-between px-6"
                >
                  <span>Claim Your Reward</span>
                  <Image
                    src="/home/arrow-right.svg"
                    alt="arrow-right"
                    width={20}
                    height={20}
                  />
                </Button>
              </div>

              {/* Spacer to push footer down */}
              <div className="w-full" />

              {/* Footer - Powered by Refraction */}
              <div className="flex items-center justify-between w-full">
                <p className="text-white text-xs uppercase tracking-wider font-inktrap opacity-80">
                  POWERED BY
                </p>
                <p className="text-white text-lg font-bold font-inktrap">
                  REFRACTION
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      {!checkinStatus && !checkinError && (
        <div className="flex items-center justify-center text-center w-full min-h-dvh font-inktrap text-2xl">
          <div className="text-white">
            {isCheckingIn ? "Checking in..." : "Loading..."}
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
