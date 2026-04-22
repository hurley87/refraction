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
import { cn } from '@/lib/utils';

/** Same arrow as `components/home/hero.tsx` “Find Spots Nearby” CTA. */
function HomepageHeroCtaArrow({ className }: { className?: string }) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-hidden
    >
      <path
        d="M14.0822 4L11.8239 6.28605L16 10.1453H2V13.8547H15.9812L11.8239 17.7139L14.0822 20L22 11.9846L14.0822 4Z"
        fill="currentColor"
      />
    </svg>
  );
}

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
      <div className="w-full max-w-[430px] mx-auto flex flex-col justify-center min-h-dvh px-4 py-8">
        {/* Partner poster image (centered) */}
        {checkpoint.partner_image_url && (
          <div className="flex justify-center mb-10">
            <div
              className="rounded-lg overflow-hidden"
              style={{
                boxShadow: '0px 0px 100px 30px rgba(255,255,255,1)',
                width: 208,
                height: 260,
              }}
            >
              <Image
                src={checkpoint.partner_image_url}
                alt={checkpoint.name}
                width={208}
                height={260}
                className="object-cover w-full h-full"
                priority
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex flex-col gap-8 align-center justify-center">
          <h1
            className="display0 sm:display0-sm text-[#171717] uppercase text-center"
            style={{ color: textColor, ...fontStyle }}
          >
            You Are In
          </h1>

          <h2
            className="body-large sm:body-small text-[#171717] uppercase text-center"
            style={{ color: textColor }}
          >
            Welcome To {checkpoint.name}
          </h2>

          <div className="flex items-end justify-between">
            <span
              className="body-large uppercase tracking-[0.04em]"
              style={{ color: '#ffffff' }}
            >
              You Earned
            </span>
            <div className="flex items-end gap-2">
              <span
                className="display2 sm:display2-sm text-[#ffffff] leading-[1em] -tracking-[0.065em]"
                style={{ color: textColor }}
              >
                {checkpoint.points_value}
              </span>
              <span
                className="display1 sm:display1-sm font-bold uppercase mb-2"
                style={{ color: textColor }}
              >
                <img
                  src="/pts.svg"
                  alt="points"
                  width={20}
                  height={20}
                  style={{
                    width: 'auto',
                    height: 'auto',
                    filter: 'invert(1) brightness(1000%)',
                  }}
                />
              </span>
            </div>
          </div>

          <p
            className="body-medium text-[#ffffff] leading-[1.2] font-medium -tracking-[0.02em] text-center uppercase"
            style={{ color: textColor }}
          >
            {checkpoint.description ||
              "IRL is a platform that connects you to what's happening in music and art scenes around the world, curated by locals."}
          </p>

          <button
            type="button"
            onClick={handleCta}
            className="label-large flex h-[44px] w-full cursor-pointer items-center justify-between py-2 pl-4 pr-2 text-left transition-opacity hover:opacity-90"
            style={{
              backgroundColor: textColor,
              color: brandBg,
            }}
          >
            <span className="min-w-0 truncate pr-2">{ctaText}</span>
            <HomepageHeroCtaArrow />
          </button>
        </div>
      </div>
    </div>
  );
}

function CheckinCheckpoint({ checkpoint }: UnifiedCheckpointProps) {
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
      <div className="relative min-h-dvh w-full overflow-hidden bg-[#FAFF00] px-5 py-10 font-grotesk text-black">
        <div
          className="pointer-events-none absolute -left-20 top-0 h-full w-40 -skew-y-1 bg-gradient-to-r from-black/20 to-transparent blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.03) 1px, rgba(0,0,0,0.03) 2px)',
          }}
          aria-hidden
        />
        <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center text-center">
          <h1 className="mt-1 sm:display2-sm display2 text-[#171717] uppercase leading-[0.82] tracking-[-0.08em]">
            {checkpoint.name}
          </h1>
          {checkpoint.description && (
            <p className="label-medium mx-auto mt-8 max-w-sm text-balance text-base font-bold leading-snug tracking-[-0.02em] text-[#454545]">
              {checkpoint.description}
            </p>
          )}
          <p className="label-large mt-6 text-[#171717] uppercase tracking-[0.24em]">
            Sign in to check in
          </p>
          <ul
            className="mt-10 flex list-none flex-col items-center gap-2 border-t-4 border-black pt-5 label-medium text-[#454545] uppercase leading-tight tracking-wide sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-5 sm:gap-y-1"
            aria-label="How IRL works"
          >
            <li>
              <span className="mr-1" aria-hidden>
                ❶
              </span>
              Check in
            </li>
            <li>
              <span className="mr-1" aria-hidden>
                ❷
              </span>
              Earn points
            </li>
            <li>
              <span className="mr-1" aria-hidden>
                ❸
              </span>
              Unlock rewards
            </li>
          </ul>
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
      <div className="relative min-h-dvh w-full overflow-hidden bg-[#FAFF00] px-5 py-10 font-grotesk text-black">
        <div
          className="pointer-events-none absolute -left-20 top-0 h-full w-40 -skew-y-1 bg-gradient-to-r from-black/20 to-transparent blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.03) 1px, rgba(0,0,0,0.03) 2px)',
          }}
          aria-hidden
        />
        <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center text-center">
          <h1 className="mt-1 sm:display2-sm display2 text-[#171717] uppercase leading-[0.82] tracking-[-0.08em]">
            Create {chainLabel} wallet
          </h1>
          <p className="label-medium mx-auto mt-8 max-w-sm text-balance text-base font-bold leading-snug tracking-[-0.02em] text-[#454545]">
            A {chainLabel} wallet is required for this checkpoint. Create one
            now to check in and earn points.
          </p>
          {checkpoint.chain_type === 'stellar' && stellarError && (
            <p className="mt-4 text-balance text-sm font-bold text-red-700">
              {stellarError}
            </p>
          )}
          {checkpoint.chain_type === 'aptos' && aptosError && (
            <p className="mt-4 text-balance text-sm font-bold text-red-700">
              {aptosError}
            </p>
          )}
          <div className="mt-8 flex w-full max-w-sm flex-col gap-3 self-center">
            <button
              type="button"
              onClick={handleCreateWallet}
              disabled={isCreating}
              className="label-large flex h-[44px] w-full cursor-pointer items-center justify-between bg-[#000000] py-2 pl-4 pr-2 text-[#FFFFFF] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="whitespace-nowrap">
                {isCreating
                  ? 'Creating Wallet...'
                  : `Create ${chainLabel} Wallet`}
              </span>
              <HomepageHeroCtaArrow />
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="label-large flex h-[44px] w-full cursor-pointer items-center justify-between border-2 border-[#000000] bg-[#000000] py-2 pl-4 pr-2 text-[#FFFFFF] transition-opacity hover:opacity-80"
            >
              <span className="whitespace-nowrap">Go Home</span>
              <HomepageHeroCtaArrow />
            </button>
          </div>
          <ul
            className="mt-10 flex list-none flex-col items-center gap-2 border-t-4 border-black pt-5 label-medium text-[#454545] uppercase leading-tight tracking-wide sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-5 sm:gap-y-1"
            aria-label="How IRL works"
          >
            <li>
              <span className="mr-1" aria-hidden>
                ❶
              </span>
              Check in
            </li>
            <li>
              <span className="mr-1" aria-hidden>
                ❷
              </span>
              Earn points
            </li>
            <li>
              <span className="mr-1" aria-hidden>
                ❸
              </span>
              Unlock rewards
            </li>
          </ul>
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
        <div className="sm:display0-sm display0 flex min-h-dvh w-full items-center justify-center bg-[#fff200] text-center uppercase text-[#171717]">
          {isCheckingIn ? 'Checking In' : 'Loading'}
        </div>
      )}
    </div>
  );
}

export default function UnifiedCheckpoint({
  checkpoint,
}: UnifiedCheckpointProps) {
  if (checkpoint.checkpoint_mode === 'spend') {
    return <SpendCheckpoint checkpoint={checkpoint} />;
  }

  return <CheckinCheckpoint checkpoint={checkpoint} />;
}
