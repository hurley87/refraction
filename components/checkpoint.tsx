"use client";

import { Button } from "@/components/ui/button";
import { useCheckInStatus } from "@/hooks/useCheckInStatus";
import { usePrivy } from "@privy-io/react-auth";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Auth from "./auth";
import Link from "next/link";
import { mutek } from "@/lib/mutek";

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
  const [language, setLanguage] = useState<'english' | 'french'>('english');
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  const [totalPoints, setTotalPoints] = useState<number>(310);
  const hasAttemptedCheckIn = useRef(false);
  const router = useRouter();

  // Find matching sassoon content
  const mutekContent = mutek.find((item) => item.checkpoint === id);


  

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
          setCheckinStatus(true);
          if (
            result?.player &&
            typeof result.player.total_points === "number"
          ) {
            setTotalPoints(result.player.total_points);
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
  }, [user, address, id, email, checkinStatus]);

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
                YOU EARNED
              </h1>
              <h2 className="text-5xl font-inktrap uppercase text-yellow-300 font-bold">
                100 POINTS
              </h2>
            </div>

            {/* Content Section */}
            {mutekContent && (
              <div
                className="rounded-xl p-4 w-full my-6 mx-4 max-w-sm bg-black text-left"
                style={{
                  background: `linear-gradient(0deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.8) 100%), lightgray 90% / cover no-repeat`,
                }}
              >
                <div className="mb-6">
                  <img
                    src={mutekContent.image}
                    alt={mutekContent.title}
                    style={{
                      boxShadow: "0px 4px 24px 4px rgba(0, 0, 0, 0.35)",
                    }}
                    className="w-full h-auto mb-6 rounded-sm overflow-hidden"
                  />
                  <h3 className="text-white text-3xl font-inktrap font-bold mb-1">
                    {language === 'english' ? mutekContent.title : mutekContent.title_fr}
                  </h3>
                  <h4 className="text-white text-2xl font-inktrap">
                    {mutekContent.subtitle}
                  </h4>
                </div>
                
                {/* Language Toggle */}
                <div className="flex justify-end mb-4">
                  <div className="flex bg-gray-800 rounded-full p-1">
                    <button
                      onClick={() => setLanguage('english')}
                      className={`px-4 py-2 rounded-full text-sm font-inktrap transition-colors ${
                        language === 'english'
                          ? 'bg-yellow-400 text-black'
                          : 'text-white hover:text-gray-300'
                      }`}
                    >
                      EN
                    </button>
                    <button
                      onClick={() => setLanguage('french')}
                      className={`px-4 py-2 rounded-full text-sm font-inktrap transition-colors ${
                        language === 'french'
                          ? 'bg-yellow-400 text-black'
                          : 'text-white hover:text-gray-300'
                      }`}
                    >
                      FR
                    </button>
                  </div>
                </div>
                
                <div className="text-white font-anonymous text-base leading-relaxed whitespace-pre-line">
                  {language === 'english' ? mutekContent.content : mutekContent.content_fr}
                </div>
              </div>
            )}

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

            {/* Map Card */}
            <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-lg">
              <div className="text-xs text-gray-500 font-inktrap mb-2">
                {language === 'english' ? 'MUTEK MAP' : 'PLAN DU LIEU DE MUTEK'}
              </div>
              <div className="mb-4">
                <img
                  src="/mutek/mutek-map.jpg"
                  alt="IRL Venue Map"
                  className="w-full h-auto rounded-lg shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setIsMapModalOpen(true)}
                />
              </div>
              <div className="text-sm text-gray-600 font-anonymous">
                {language === 'english' 
                  ? 'Explore the IRL network venue and discover all checkpoints'
                  : 'Explorez le lieu du réseau IRL et découvrez tous les points de contrôle'
                }
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
