"use client";

import { Button } from "@/components/ui/button";
import { usePrivy, useCreateWallet } from "@privy-io/react-auth";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Auth from "@/components/auth/auth";
import Footer from "@/components/layout/footer";

interface SolanaCheckpointProps {
  id: string;
}

export default function SolanaCheckpoint({ id }: SolanaCheckpointProps) {
  const { user } = usePrivy();
  const { createWallet } = useCreateWallet();
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);

  // Get Solana embedded wallet from linked accounts
  const solanaWallet = user?.linkedAccounts?.find(
    (account) =>
      account.type === "wallet" &&
      "chainType" in account &&
      account.chainType === "solana",
  );
  const solanaAddress =
    solanaWallet && "address" in solanaWallet
      ? solanaWallet.address
      : undefined;
  const email = user?.email?.address;

  const [checkinStatus, setCheckinStatus] = useState<boolean | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkinError, setCheckinError] = useState<string | null>(null);
  const [, setPointsEarnedToday] = useState<number>(0);
  const [, setTotalPoints] = useState<number>(0);

  // Handle creating Solana wallet
  const handleCreateWallet = async () => {
    setIsCreatingWallet(true);
    try {
      await createWallet({ createAdditional: true });
    } catch (error) {
      console.error("Failed to create Solana wallet:", error);
    } finally {
      setIsCreatingWallet(false);
    }
  };

  const hasAttemptedCheckIn = useRef(false);
  const router = useRouter();

  // Fetch player stats
  useEffect(() => {
    const fetchPlayerStats = async () => {
      if (!solanaAddress) return;

      try {
        const playerResponse = await fetch(
          `/api/player?walletAddress=${solanaAddress}`,
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
  }, [solanaAddress]);

  // Auto check-in effect
  useEffect(() => {
    if (hasAttemptedCheckIn.current) {
      return;
    }

    const autoCheckIn = async () => {
      if (!user || !solanaAddress || isCheckingIn) {
        return;
      }

      hasAttemptedCheckIn.current = true;
      setIsCheckingIn(true);

      try {
        const response = await fetch("/api/solana-checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            solanaWalletAddress: solanaAddress,
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
          return;
        }

        setCheckinError(null);
        setCheckinStatus(true);
        setPointsEarnedToday(
          result.pointsEarnedToday || result.pointsAwarded || 0,
        );
        if (result?.player && typeof result.player.total_points === "number") {
          setTotalPoints(result.player.total_points);
        }
      } catch (error) {
        console.error("Failed to auto check-in:", error);
        setCheckinError(
          "Something went wrong while checking you in. Please try again.",
        );
        hasAttemptedCheckIn.current = false;
      } finally {
        setIsCheckingIn(false);
      }
    };

    if (user && solanaAddress) {
      autoCheckIn();
    }
  }, [user, solanaAddress, id, email, isCheckingIn]);

  // Loading state while waiting for Privy
  if (!user) {
    return (
      <Auth>
        <div className="flex items-center justify-center text-center w-full min-h-dvh font-inktrap text-2xl text-black">
          Loading ...
        </div>
      </Auth>
    );
  }

  // No Solana wallet found - prompt to create one
  if (!solanaAddress) {
    return (
      <Auth>
        <div className="flex flex-col items-center justify-center text-center w-full min-h-dvh font-grotesk px-6">
          <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-lg space-y-4">
            <h1 className="text-3xl font-inktrap text-black uppercase">
              Create Solana Wallet
            </h1>
            <p className="text-gray-600 text-base">
              A Solana wallet is required for this checkpoint. Create one now to
              check in and earn points.
            </p>
            <Button
              onClick={handleCreateWallet}
              disabled={isCreatingWallet}
              className="text-white bg-black rounded-full w-full font-inktrap py-3 text-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {isCreatingWallet ? "Creating Wallet..." : "Create Solana Wallet"}
            </Button>
            <Button
              onClick={() => router.push("/")}
              variant="outline"
              className="text-black border-black rounded-full w-full font-inktrap py-3 text-lg hover:bg-gray-100"
            >
              Go Home →
            </Button>
          </div>
        </div>
      </Auth>
    );
  }

  return (
    <Auth>
      <div className="flex flex-col w-full justify-center font-sans">
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
                className="text-white bg-black rounded-full w-full font-inktrap py-3 text-lg hover:bg-yellow-400"
              >
                Visit IRL.ENERGY →
              </Button>
            </div>
          </div>
        )}
        {checkinStatus && !checkinError && (
          <div className="font-grotesk flex flex-col">
            <div className="flex flex-col items-start pt-8 gap-8 flex-1 max-w-xl mx-auto">
              {/* Main Title */}
              <div className="relative w-full max-w-md my-10 mx-auto">
                <h1 className="text-5xl md:text-6xl font-bold uppercase tracking-tight text-center font-inktrap z-10 text-black">
                  YOU&apos;RE IN
                </h1>
              </div>

              {/* Points Display */}
              <div className="flex gap-3 w-full mt-2 justify-between">
                <p className="text-md md:text-xl uppercase tracking-wider font-grotesk pt-1 text-black">
                  YOU EARNED
                </p>
                <div className="flex items-start gap-2">
                  <span
                    style={{ lineHeight: "0.6" }}
                    className="text-7xl md:text-8xl font-bold font-inktrap text-black"
                  >
                    {100}
                  </span>
                  <div className="text-xs font-grotesk uppercase flex flex-col items-end justify-end h-full">
                    <span className="text-xs font-grotesk uppercase bg-gray-500/40 rounded-full px-2.5 py-1 flex flex-col items-end justify-end h-fit text-black">
                      PTS
                    </span>
                  </div>
                </div>
              </div>

              {/* Descriptive Text */}
              <div>
                <p className="text-md md:text-xl leading-relaxed font-grotesk text-black">
                  IRL gives you access to global cultural intel. Discover new
                  places, earn real rewards.
                </p>
              </div>

              <div className="flex flex-col gap-1 w-full">
                {/* Call to Action Button */}
                <div className="w-full">
                  <Button
                    onClick={() => router.push("/interactive-map")}
                    className="bg-white text-black rounded-full hover:bg-white/90 w-full font-inktrap py-6 text-base flex items-center justify-between px-6"
                  >
                    <span>Go to the IRL Map</span>
                    <Image
                      src="/home/arrow-right.svg"
                      alt="arrow-right"
                      width={20}
                      height={20}
                    />
                  </Button>
                </div>

                <div className="w-full" />

                {/* Footer - Powered by Refraction */}
                <div className="flex items-center justify-between w-full">
                  <p className="text-xs uppercase tracking-wider font-inktrap opacity-80 text-black">
                    POWERED BY
                  </p>
                  <Image
                    src="/refraction-black.svg"
                    alt="Refraction"
                    width={120}
                    height={40}
                    className="object-contain h-10"
                  />
                </div>

                <div className="h-[30px]" aria-hidden="true"></div>
                <div className="w-full max-w-xl mx-auto p-0">
                  <div className="rounded-2xl overflow-hidden w-full [&>footer]:max-w-none [&>footer]:mx-0 [&>footer]:rounded-2xl">
                    <Footer />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {!checkinStatus && !checkinError && (
          <div className="flex items-center justify-center text-center w-full min-h-dvh font-inktrap text-2xl text-black">
            <div>{isCheckingIn ? "Checking in..." : "Loading..."}</div>
          </div>
        )}
      </div>
    </Auth>
  );
}
