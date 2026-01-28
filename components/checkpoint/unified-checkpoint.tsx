'use client';

import { Button } from '@/components/ui/button';
import { usePrivy, useCreateWallet } from '@privy-io/react-auth';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useStellarWallet } from '@/hooks/useStellarWallet';
import type { Checkpoint } from '@/lib/types';

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
      case 'evm':
        return user?.wallet?.address;
      case 'solana': {
        const solanaWallet = user?.linkedAccounts?.find(
          (account) =>
            account.type === 'wallet' &&
            'chainType' in account &&
            account.chainType === 'solana'
        );
        return solanaWallet && 'address' in solanaWallet
          ? solanaWallet.address
          : undefined;
      }
      case 'stellar':
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

  // Get the unified request body with chain type
  const getCheckinBody = useCallback(() => {
    return {
      chain: checkpoint.chain_type,
      walletAddress,
      email,
      checkpoint: checkpoint.id,
    };
  }, [checkpoint.chain_type, checkpoint.id, walletAddress, email]);

  // Handle creating Solana wallet
  const handleCreateSolanaWallet = async () => {
    setIsCreatingWallet(true);
    try {
      await createWallet({ createAdditional: true });
    } catch (error) {
      console.error('Failed to create Solana wallet:', error);
    } finally {
      setIsCreatingWallet(false);
    }
  };

  // Handle connecting Stellar wallet
  const handleConnectStellarWallet = async () => {
    try {
      await connectStellar();
    } catch (error) {
      console.error('Failed to connect Stellar wallet:', error);
    }
  };

  // Fetch player stats
  useEffect(() => {
    const fetchPlayerStats = async () => {
      if (!walletAddress) return;

      try {
        const playerResponse = await fetch(
          `/api/player?walletAddress=${walletAddress}`
        );
        if (playerResponse.ok) {
          const responseData = await playerResponse.json();
          // Unwrap the apiSuccess wrapper
          const playerData = responseData.data || responseData;
          if (playerData.player) {
            setTotalPoints(playerData.player.total_points);
          }
        }
      } catch (error) {
        console.error('Failed to fetch player stats:', error);
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
        const response = await fetch('/api/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(getCheckinBody()),
        });

        const result = await response.json().catch(() => null);

        if (!response.ok || !result?.success) {
          setCheckinError(
            result?.error ||
              'Unable to check in right now. Please try again later.'
          );
          setCheckinStatus(false);
          return;
        }

        setCheckinError(null);
        setCheckinStatus(true);
        setPointsEarnedToday(
          result.pointsEarnedToday || result.pointsAwarded || 0
        );
        if (result?.player && typeof result.player.total_points === 'number') {
          setTotalPoints(result.player.total_points);
        }
      } catch (error) {
        console.error('Failed to auto check-in:', error);
        setCheckinError(
          'Something went wrong while checking you in. Please try again.'
        );
        hasAttemptedCheckIn.current = false;
      } finally {
        setIsCheckingIn(false);
      }
    };

    if (user && walletAddress) {
      autoCheckIn();
    }
  }, [user, walletAddress, isCheckingIn, getCheckinBody]);

  // Loading state while waiting for Privy or wallet fetch
  const isLoading =
    !user || (checkpoint.chain_type === 'stellar' && isStellarLoading);

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
      checkpoint.chain_type === 'solana'
        ? isCreatingWallet
        : checkpoint.chain_type === 'stellar'
          ? isStellarConnecting
          : false;

    const handleCreateWallet =
      checkpoint.chain_type === 'solana'
        ? handleCreateSolanaWallet
        : checkpoint.chain_type === 'stellar'
          ? handleConnectStellarWallet
          : undefined;

    if (checkpoint.chain_type === 'evm') {
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
              onClick={() => router.push('/')}
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
          {checkpoint.chain_type === 'stellar' && stellarError && (
            <p className="text-red-600 text-sm">{stellarError}</p>
          )}
          <Button
            onClick={handleCreateWallet}
            disabled={isCreating}
            className="text-white bg-black rounded-full w-full font-inktrap py-3 text-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {isCreating ? 'Creating Wallet...' : `Create ${chainLabel} Wallet`}
          </Button>
          <Button
            onClick={() => router.push('/')}
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
              {checkinError.includes('limit')
                ? 'Daily Limit Reached'
                : 'Check-in Error'}
            </h1>
            <p className="text-black text-base">{checkinError}</p>
            {checkinError.includes('limit') && (
              <p className="text-gray-500 text-sm">
                You can complete up to 10 checkpoint visits per day. Come back
                tomorrow for more points.
              </p>
            )}
            <Button
              onClick={() => router.push('/')}
              className="text-white bg-black rounded-full w-full font-inktrap py-3 text-lg hover:bg-yellow-400"
            >
              Visit IRL.ENERGY
            </Button>
          </div>
        </div>
      )}
      {checkinStatus && !checkinError && (
        <div className="h-full flex flex-col justify-center pt-8 sm:pt-12">
          {/* Main Content */}
          <div className="flex flex-col px-4 sm:px-6 pb-4 max-w-lg mx-auto w-full">
            {/* Event Header */}
            <div className="text-center mb-4 sm:mb-6">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold uppercase tracking-tight font-inktrap text-black">
                {checkpoint.name}
              </h1>
              {checkpoint.description && (
                <p className="text-sm md:text-base text-black/70 font-grotesk px-2 mt-1">
                  {checkpoint.description}
                </p>
              )}
            </div>

            {/* Partner Image */}
            {checkpoint.partner_image_url && (
              <div className="w-full mb-5 sm:mb-8 rounded-xl sm:rounded-2xl overflow-hidden">
                <Image
                  src={checkpoint.partner_image_url}
                  alt={checkpoint.name}
                  width={800}
                  height={400}
                  className="w-full h-auto object-cover"
                />
              </div>
            )}

            {/* Success Card */}
            <div className="bg-white rounded-2xl sm:rounded-3xl px-5 py-6 sm:p-8 shadow-xl space-y-5 sm:space-y-6">
              {/* Success Badge */}
              <div className="flex justify-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-500 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 sm:w-8 sm:h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>

              {/* You're In */}
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold uppercase tracking-tight text-center font-inktrap text-black">
                You&apos;re In
              </h2>

              {/* Points Earned */}
              <div className="text-center">
                <p className="text-xs sm:text-sm uppercase tracking-wider text-gray-500 font-grotesk mb-1 sm:mb-2">
                  You earned
                </p>
                <div className="flex items-baseline justify-center gap-1.5 sm:gap-2">
                  <span className="text-5xl sm:text-6xl md:text-7xl font-bold font-inktrap text-black">
                    {checkpoint.points_value}
                  </span>
                  <span className="text-base sm:text-lg font-grotesk uppercase text-gray-500">
                    pts
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200" />

              {/* Description */}
              <p className="text-center text-gray-600 font-grotesk text-sm leading-relaxed">
                IRL gives you access to global cultural intel. Discover new
                places, earn real rewards.
              </p>

              {/* CTA Button */}
              <Button
                onClick={() => router.push('/interactive-map')}
                className="bg-black text-white rounded-full hover:bg-gray-800 w-full font-inktrap py-4 sm:py-6 text-sm sm:text-base flex items-center justify-center gap-2 sm:gap-3"
              >
                <span>Explore the IRL Map</span>
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </Button>
            </div>

            {/* Powered by Refraction */}
            <div className="flex items-center justify-center gap-2 text-black/70 mt-4">
              <span className="text-xs uppercase tracking-wider font-grotesk">
                Powered by
              </span>
              <Image
                src="/refraction-black.svg"
                alt="Refraction"
                width={80}
                height={24}
                className="object-contain"
              />
            </div>
          </div>
        </div>
      )}
      {!checkinStatus && !checkinError && (
        <div className="flex items-center justify-center text-center w-full min-h-dvh font-inktrap text-2xl text-black">
          <div>{isCheckingIn ? 'Checking in...' : 'Loading...'}</div>
        </div>
      )}
    </div>
  );
}
