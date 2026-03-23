'use client';

import { Button } from '@/components/ui/button';
import { usePrivy, useCreateWallet } from '@privy-io/react-auth';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useStellarWallet } from '@/hooks/useStellarWallet';
import { useAptosWallet } from '@/hooks/useAptosWallet';
import SpendCheckpoint from '@/components/checkpoint/spend-checkpoint';
import type { Checkpoint } from '@/lib/types';

interface UnifiedCheckpointProps {
  checkpoint: Checkpoint;
}

function extractBaseColor(gradient?: string | null): string {
  if (!gradient) return '#C199C4';
  const match = gradient.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  return '#C199C4';
}

function CheckinSuccessView({
  checkpoint,
  router,
}: {
  checkpoint: Checkpoint;
  router: ReturnType<typeof useRouter>;
}) {
  const brandBg = extractBaseColor(checkpoint.background_gradient);
  const textColor = checkpoint.font_color || '#E3FF30';
  const fontStyle = checkpoint.font_family
    ? { fontFamily: checkpoint.font_family }
    : undefined;
  const ctaText = checkpoint.cta_text || 'Explore The IRL Map';
  const ctaUrl = checkpoint.cta_url || '/interactive-map';

  const handleCta = () => {
    if (ctaUrl.startsWith('http')) {
      window.open(ctaUrl, '_blank');
    } else {
      router.push(ctaUrl);
    }
  };

  return (
    <div
      className="min-h-dvh w-full flex flex-col items-center"
      style={{
        background: checkpoint.background_gradient || brandBg,
        ...fontStyle,
      }}
    >
      <div className="w-full max-w-[430px] mx-auto flex flex-col min-h-dvh px-4">
        {/* Glass header */}
        <div className="sticky top-2 z-20 mt-2">
          <div
            className="rounded-[26px] px-4 py-2 flex items-center justify-between"
            style={{
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,1) 100%)',
              border: '1px solid rgba(255,255,255,0.25)',
              boxShadow: 'inset 0px 4px 8px 0px rgba(255,255,255,0.15)',
              backdropFilter: 'blur(64px)',
            }}
          >
            <Image
              src="/irlfooterlogo.svg"
              alt="IRL"
              width={40}
              height={40}
              className="rounded-full"
            />
            <button
              onClick={() => router.push('/')}
              className="px-3 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider"
              style={{
                background: 'rgba(255,255,255,0.25)',
                color: '#131313',
              }}
            >
              Sign Up
            </button>
          </div>
        </div>

        {/* Partner poster image (centered) */}
        {checkpoint.partner_image_url && (
          <div className="flex justify-center mt-6 mb-4">
            <div
              className="rounded-lg overflow-hidden"
              style={{
                boxShadow: '0px 0px 100px 30px rgba(255,255,255,1)',
                width: 208,
                height: 209,
              }}
            >
              <Image
                src={checkpoint.partner_image_url}
                alt={checkpoint.name}
                width={208}
                height={209}
                className="object-cover w-full h-full"
                priority
              />
            </div>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Content */}
        <div className="flex flex-col gap-8 pb-8">
          <h1
            className="text-[61px] leading-[0.8em] font-extrabold uppercase -tracking-[0.08em]"
            style={{ color: textColor, ...fontStyle }}
          >
            You&apos;re In
          </h1>

          <h2
            className="text-[39px] leading-[0.95em] font-normal -tracking-[0.08em]"
            style={{ color: textColor }}
          >
            Welcome To{' '}
            {checkpoint.name}
          </h2>

          <div className="flex items-end justify-between">
            <span
              className="text-[13px] font-bold uppercase tracking-[0.04em]"
              style={{ color: textColor }}
            >
              You Earned
            </span>
            <div className="flex items-end gap-2">
              <span
                className="text-[100px] leading-[1em] font-normal -tracking-[0.065em]"
                style={{ color: textColor }}
              >
                {checkpoint.points_value}
              </span>
              <span
                className="text-sm font-bold uppercase mb-2"
                style={{ color: textColor }}
              >
                pts
              </span>
            </div>
          </div>

          <p
            className="text-xl leading-[1.2] font-medium -tracking-[0.02em]"
            style={{ color: textColor }}
          >
            {checkpoint.description ||
              "IRL is a platform that connects you to what's happening in music and art scenes around the world, curated by locals."}
          </p>

          <button
            onClick={handleCta}
            className="w-full rounded-full py-5 px-6 text-center text-xl font-bold uppercase -tracking-[0.08em]"
            style={{
              backgroundColor: textColor,
              color: brandBg,
            }}
          >
            {ctaText}
          </button>
        </div>
      </div>
    </div>
  );
}

function CheckinCheckpoint({
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
  const {
    address: aptosAddress,
    connect: connectAptos,
    isConnecting: isAptosConnecting,
    isLoading: isAptosLoading,
    error: aptosError,
  } = useAptosWallet();

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
      case 'aptos':
        return aptosAddress;
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

  // Handle connecting Aptos wallet
  const handleConnectAptosWallet = async () => {
    try {
      await connectAptos();
    } catch (error) {
      console.error('Failed to connect Aptos wallet:', error);
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
    !user ||
    (checkpoint.chain_type === 'stellar' && isStellarLoading) ||
    (checkpoint.chain_type === 'aptos' && isAptosLoading);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center text-center w-full min-h-dvh font-grotesk px-6">
        <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-lg space-y-4">
          <h1 className="text-3xl font-inktrap text-black uppercase">
            {checkpoint.name}
          </h1>
          {checkpoint.description && (
            <p className="text-gray-600 text-base font-grotesk">
              {checkpoint.description}
            </p>
          )}
          <p className="text-gray-500 text-sm font-grotesk">
            Sign in to check in
          </p>
        </div>
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
          : checkpoint.chain_type === 'aptos'
            ? isAptosConnecting
            : false;

    const handleCreateWallet =
      checkpoint.chain_type === 'solana'
        ? handleCreateSolanaWallet
        : checkpoint.chain_type === 'stellar'
          ? handleConnectStellarWallet
          : checkpoint.chain_type === 'aptos'
            ? handleConnectAptosWallet
            : undefined;

    if (checkpoint.chain_type === 'evm') {
      // EVM wallet should be available from Privy login
      return (
        <div className="flex flex-col items-center justify-center text-center w-full h-full font-grotesk px-6">
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
      <div className="flex flex-col items-center justify-center text-center w-full h-full font-grotesk px-6">
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
          {checkpoint.chain_type === 'aptos' && aptosError && (
            <p className="text-red-600 text-sm">{aptosError}</p>
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
    <div className="flex min-h-dvh w-full flex-col justify-center font-sans">
      {checkinError && (
        <div className="flex flex-col items-center justify-center text-center w-full h-full font-grotesk px-6">
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
        <CheckinSuccessView checkpoint={checkpoint} router={router} />
      )}
      {!checkinStatus && !checkinError && (
        <div className="flex min-h-dvh w-full flex-col items-center justify-center text-center font-inktrap text-2xl text-black">
          <div>{isCheckingIn ? 'Checking in...' : 'Loading...'}</div>
        </div>
      )}
    </div>
  );
}

export default function UnifiedCheckpoint({ checkpoint }: UnifiedCheckpointProps) {
  if (checkpoint.checkpoint_mode === 'spend') {
    return <SpendCheckpoint checkpoint={checkpoint} />;
  }

  return <CheckinCheckpoint checkpoint={checkpoint} />;
}
