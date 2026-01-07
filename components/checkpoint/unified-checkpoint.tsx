"use client";

import { Button } from "@/components/ui/button";
import { usePrivy, useCreateWallet } from "@privy-io/react-auth";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Footer from "@/components/layout/footer";
import { useStellarWallet } from "@/hooks/useStellarWallet";
import type { Checkpoint } from "@/lib/types";

interface UnifiedCheckpointProps {
  checkpoint: Checkpoint;
}

export default function UnifiedCheckpoint({
  checkpoint,
}: UnifiedCheckpointProps) {
  const { user } = usePrivy();
  const { createWallet } = useCreateWallet();
  const {
    address: stellarAddress,
    connect: connectStellar,
    isConnecting: isStellarConnecting,
    isLoading: isStellarLoading,
    error: stellarError,
  } = useStellarWallet();

  const [isCreatingWallet, setIsCreatingWallet] = useState(false);

  // Get the appropriate wallet address based on chain type
  const getWalletAddress = () => {
    switch (checkpoint.chain_type) {
      case "evm":
        return user?.wallet?.address;
      case "solana": {
        const solanaWallet = user?.linkedAccounts?.find(
          (account) =>
            account.type === "wallet" &&
            "chainType" in account &&
            account.chainType === "solana",
        );
        return solanaWallet && "address" in solanaWallet
          ? solanaWallet.address
          : undefined;
      }
      case "stellar":
        return stellarAddress;
      default:
        return undefined;
    }
  };

  const walletAddress = getWalletAddress();
  const email = user?.email?.address;

  const [checkinStatus, setCheckinStatus] = useState<boolean | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkinError, setCheckinError] = useState<string | null>(null);
  const [, setPointsEarnedToday] = useState<number>(0);
  const [, setTotalPoints] = useState<number>(0);

  const hasAttemptedCheckIn = useRef(false);
  const router = useRouter();

  // Get the appropriate API endpoint based on chain type
  const getCheckinEndpoint = useCallback(() => {
    switch (checkpoint.chain_type) {
      case "evm":
        return "/api/checkin";
      case "solana":
        return "/api/solana-checkin";
      case "stellar":
        return "/api/stellar-checkin";
      default:
        return "/api/checkin";
    }
  }, [checkpoint.chain_type]);

  // Get the appropriate request body based on chain type
  const getCheckinBody = useCallback(() => {
    switch (checkpoint.chain_type) {
      case "evm":
        return {
          walletAddress,
          email,
          checkpoint: checkpoint.id,
        };
      case "solana":
        return {
          solanaWalletAddress: walletAddress,
          email,
          checkpoint: checkpoint.id,
        };
      case "stellar":
        return {
          stellarWalletAddress: walletAddress,
          email,
          checkpoint: checkpoint.id,
        };
      default:
        return {
          walletAddress,
          email,
          checkpoint: checkpoint.id,
        };
    }
  }, [checkpoint.chain_type, checkpoint.id, walletAddress, email]);

  // Handle creating Solana wallet
  const handleCreateSolanaWallet = async () => {
    setIsCreatingWallet(true);
    try {
      await createWallet({ createAdditional: true });
    } catch (error) {
      console.error("Failed to create Solana wallet:", error);
    } finally {
      setIsCreatingWallet(false);
    }
  };

  // Handle connecting Stellar wallet
  const handleConnectStellarWallet = async () => {
    try {
      await connectStellar();
    } catch (error) {
      console.error("Failed to connect Stellar wallet:", error);
    }
  };

  // Fetch player stats
  useEffect(() => {
    const fetchPlayerStats = async () => {
      if (!walletAddress) return;

      try {
        const playerResponse = await fetch(
          `/api/player?walletAddress=${walletAddress}`,
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
  }, [walletAddress]);

  // Auto check-in effect
  useEffect(() => {
    if (hasAttemptedCheckIn.current) {
      return;
    }

    const autoCheckIn = async () => {
      if (!user || !walletAddress || isCheckingIn) {
        return;
      }

      hasAttemptedCheckIn.current = true;
      setIsCheckingIn(true);

      try {
        const response = await fetch(getCheckinEndpoint(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(getCheckinBody()),
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

    if (user && walletAddress) {
      autoCheckIn();
    }
  }, [user, walletAddress, isCheckingIn, getCheckinEndpoint, getCheckinBody]);

  // Loading state while waiting for Privy or wallet fetch
  const isLoading =
    !user || (checkpoint.chain_type === "stellar" && isStellarLoading);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center text-center w-full min-h-dvh font-inktrap text-2xl text-black">
        Loading ...
      </div>
    );
  }

  // No wallet found - prompt to create/connect based on chain type
  if (!walletAddress) {
    const chainLabel =
      checkpoint.chain_type.charAt(0).toUpperCase() +
      checkpoint.chain_type.slice(1);
    const isCreating =
      checkpoint.chain_type === "solana"
        ? isCreatingWallet
        : checkpoint.chain_type === "stellar"
          ? isStellarConnecting
          : false;

    const handleCreateWallet =
      checkpoint.chain_type === "solana"
        ? handleCreateSolanaWallet
        : checkpoint.chain_type === "stellar"
          ? handleConnectStellarWallet
          : undefined;

    if (checkpoint.chain_type === "evm") {
      // EVM wallet should be available from Privy login
      return (
        <div className="flex flex-col items-center justify-center text-center w-full min-h-dvh font-grotesk px-6">
          <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-lg space-y-4">
            <h1 className="text-3xl font-inktrap text-black uppercase">
              Wallet Required
            </h1>
            <p className="text-gray-600 text-base">
              Please connect your wallet to check in at this checkpoint.
            </p>
            <Button
              onClick={() => router.push("/")}
              className="text-white bg-black rounded-full w-full font-inktrap py-3 text-lg hover:bg-gray-800"
            >
              Go Home
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center text-center w-full min-h-dvh font-grotesk px-6">
        <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-lg space-y-4">
          <h1 className="text-3xl font-inktrap text-black uppercase">
            Create {chainLabel} Wallet
          </h1>
          <p className="text-gray-600 text-base">
            A {chainLabel} wallet is required for this checkpoint. Create one
            now to check in and earn points.
          </p>
          {checkpoint.chain_type === "stellar" && stellarError && (
            <p className="text-red-600 text-sm">{stellarError}</p>
          )}
          <Button
            onClick={handleCreateWallet}
            disabled={isCreating}
            className="text-white bg-black rounded-full w-full font-inktrap py-3 text-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {isCreating ? "Creating Wallet..." : `Create ${chainLabel} Wallet`}
          </Button>
          <Button
            onClick={() => router.push("/")}
            variant="outline"
            className="text-black border-black rounded-full w-full font-inktrap py-3 text-lg hover:bg-gray-100"
          >
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full justify-center font-sans">
      {checkinError && (
        <div className="flex flex-col items-center justify-center text-center w-full min-h-dvh font-grotesk px-6">
          <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-lg space-y-4">
            <h1 className="text-3xl font-inktrap text-red-600 uppercase">
              {checkinError.includes("limit") ? "Daily Limit Reached" : "Check-in Error"}
            </h1>
            <p className="text-black text-base">{checkinError}</p>
            {checkinError.includes("limit") && (
              <p className="text-gray-500 text-sm">
                You can complete up to 10 checkpoint visits per day. Come back
                tomorrow for more points.
              </p>
            )}
            <Button
              onClick={() => router.push("/")}
              className="text-white bg-black rounded-full w-full font-inktrap py-3 text-lg hover:bg-yellow-400"
            >
              Visit IRL.ENERGY
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
                  {checkpoint.points_value}
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

              {/* Partner Image (if present) */}
              {checkpoint.partner_image_url && (
                <div className="flex items-center justify-center w-full py-4">
                  <Image
                    src={checkpoint.partner_image_url}
                    alt="Partner"
                    width={200}
                    height={80}
                    className="object-contain max-h-20"
                  />
                </div>
              )}

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
  );
}
