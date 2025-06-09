"use client";

import { Button } from "@/components/ui/button";
import { useCheckInStatus } from "@/hooks/useCheckInStatus";
import { usePrivy } from "@privy-io/react-auth";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Auth from "./auth";

interface CheckpointProps {
  id: string;
}

export default function Checkpoint({ id }: CheckpointProps) {
  const { user } = usePrivy();
  console.log("user", user);
  const address = user?.wallet?.address as `0x${string}`;
  const email = user?.email?.address;
  const { checkinStatus, setCheckinStatus } = useCheckInStatus(address, id);
  console.log("checkinStatus", checkinStatus);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const hasAttemptedCheckIn = useRef(false);
  const router = useRouter();

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
        if (checkinStatus) {
          return;
        }

        // Mark that we've attempted a check-in to prevent duplicate attempt

        // If we get here, user is not checked in, so proceed with check-in
        setIsCheckingIn(true);

        // Make the API call to check in
        await fetch("/api/checkin", {
          method: "POST",
          body: JSON.stringify({ walletAddress: address, email }),
        });

        // Update the status after successful check-in
        setCheckinStatus(true);
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
  }, [user, address, id, email, checkinStatus]);

  return (
    <Auth>
      {!checkinStatus && (
        <div className="flex justify-center items text-center w-full h-screen font-inktrap text-2xl pt-10">
          Loading ...
        </div>
      )}
      {checkinStatus && (
        <div className="min-h-screen bg-gradient-to-b from-cyan-400 via-teal-400 to-yellow-400 to-pink-400">
          <div className="flex flex-col items-center text-center px-4 py-8 gap-6">
            {/* Header Section */}
            <div className="flex flex-col items-center gap-4">
              <h1 className="text-5xl font-inktrap uppercase text-yellow-300 font-bold">
                YOU EARNED
              </h1>
              <h2 className="text-5xl font-inktrap uppercase text-yellow-300 font-bold">
                POINTS
              </h2>
            </div>

            {/* Box Icon */}
            <div className="relative w-48 h-48 my-6">
              <div className="w-full h-full border-4 border-yellow-300 rounded-lg flex items-center justify-center bg-transparent">
                <div className="text-center">
                  <div className="text-yellow-300 text-sm font-inktrap mb-2">
                    TAP YOUR PHONE
                  </div>
                  <div className="w-12 h-8 bg-yellow-300 rounded-full mx-auto mb-2"></div>
                  <div className="text-yellow-300 text-lg font-inktrap font-bold">
                    IRL
                  </div>
                </div>
              </div>
            </div>

            {/* Points Earned Card */}
            <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600 font-inktrap text-sm">
                  You Earned
                </span>
                <span className="text-2xl">+</span>
              </div>
              <div className="text-4xl font-bold text-black font-inktrap mb-2">
                100 <span className="text-lg font-normal">pts</span>
              </div>
              <p className="text-gray-600 text-sm font-inktrap mb-4">
                You've just gained access to events, rewards and bespoke
                experiences.
              </p>

              {/* Rewards Section */}
              <div className="mb-4">
                <div className="text-xs text-gray-500 font-inktrap mb-2">
                  REWARDS
                </div>
                <div className="flex gap-2 mb-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-12 h-12 bg-gray-100 rounded-lg border-2 border-gray-200"
                    ></div>
                  ))}
                </div>
                <Button className="bg-teal-500 text-white w-full rounded-lg font-inktrap text-sm">
                  Rewards →
                </Button>
              </div>
            </div>

            {/* Total Points Card */}
            <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-lg">
              <div className="text-xs text-gray-500 font-inktrap mb-2">
                YOUR POINTS
              </div>
              <div className="text-4xl font-bold text-black font-inktrap mb-4">
                310 <span className="text-lg font-normal">pts</span>
              </div>

              <div className="text-xs text-gray-500 font-inktrap mb-2">
                YOUR PLACE
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-xs">👤</span>
                  </div>
                  <span className="text-gray-600 font-inktrap">9380</span>
                </div>
                <Button className="bg-yellow-400 text-black rounded-lg font-inktrap text-sm px-4 py-2">
                  Leaderboard →
                </Button>
              </div>
            </div>

            {/* Opportunities Section */}
            <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-lg">
              <div className="text-xs text-gray-500 font-inktrap mb-2">
                EARN MORE
              </div>
              <h3 className="text-lg font-inktrap text-black mb-4">
                Opportunities to earn more points
              </h3>

              <div className="flex gap-3">
                <div className="bg-gray-50 rounded-lg p-4 flex-1">
                  <div className="text-xs text-gray-500 font-inktrap mb-1">
                    QUEST
                  </div>
                  <h4 className="text-sm font-inktrap text-black mb-1">
                    Quest Title
                  </h4>
                  <p className="text-xs text-gray-400 font-inktrap mb-2">
                    Description
                  </p>
                  <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                    <span className="text-xs">→</span>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 flex-1">
                  <div className="text-xs text-gray-500 font-inktrap mb-1">
                    QUEST
                  </div>
                  <h4 className="text-sm font-inktrap text-black mb-1">
                    Quest Title
                  </h4>
                  <p className="text-xs text-gray-400 font-inktrap mb-2">
                    Description
                  </p>
                  <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                    <span className="text-xs">→</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Section */}
            <div className="mt-12 px-4">
              <p className="text-white font-inktrap text-xl font-light mb-6 leading-relaxed">
                Learn more and be the first to know about the latest IRL network
                news
              </p>
              <Button
                onClick={() => router.push("/")}
                className="text-black bg-white rounded-lg w-full font-inktrap py-3 text-lg hover:bg-gray-100"
              >
                Visit IRL.ENERGY →
              </Button>
            </div>

            {/* Decorative Elements */}
            <div className="mt-12 opacity-20">
              <div className="w-48 h-48 mx-auto">
                {/* Rings pattern */}
                {[1, 2, 3, 4, 5].map((ring) => (
                  <div
                    key={ring}
                    className="absolute inset-0 border border-white rounded-full"
                    style={{
                      width: `${ring * 40}px`,
                      height: `${ring * 40}px`,
                      left: "50%",
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                    }}
                  ></div>
                ))}
              </div>
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
    </Auth>
  );
}
