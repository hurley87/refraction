'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { usePrivy } from '@privy-io/react-auth';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentPlayer } from '@/hooks/usePlayer';
import type {
  Checkpoint,
  SpendItem,
  SpendRedemption,
  Player,
} from '@/lib/types';
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

type SpendCheckpointResponse = {
  checkpoint: Checkpoint;
  spendItem: SpendItem;
  redemption: SpendRedemption | null;
};

type RedeemSpendCheckpointResponse = {
  checkpoint: Checkpoint;
  spendItem: SpendItem;
  redemption: SpendRedemption;
  player: Player;
};

interface SpendCheckpointProps {
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

export default function SpendCheckpoint({ checkpoint }: SpendCheckpointProps) {
  const { user, login, getAccessToken } = usePrivy();
  const queryClient = useQueryClient();
  const walletAddress = user?.wallet?.address;
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: player } = useCurrentPlayer();

  const { data, isLoading } = useQuery<SpendCheckpointResponse>({
    queryKey: ['spend-checkpoint', checkpoint.id, walletAddress],
    queryFn: async () => {
      const search = walletAddress
        ? `?walletAddress=${encodeURIComponent(walletAddress)}`
        : '';
      const headers: HeadersInit = {};
      if (walletAddress) {
        const token = await getAccessToken();
        if (!token) {
          throw new Error('Please log in to view redemption status.');
        }
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(
        `/api/checkpoints/${checkpoint.id}/spend${search}`,
        { headers }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to load spend checkpoint');
      }
      const responseData = await response.json();
      return responseData.data || responseData;
    },
  });

  const redeemMutation = useMutation({
    mutationFn: async () => {
      if (!walletAddress) {
        throw new Error('Please log in to redeem this item.');
      }
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Please log in to redeem this item.');
      }
      const response = await fetch(`/api/checkpoints/${checkpoint.id}/spend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ walletAddress }),
      });
      const responseData = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(responseData?.error || 'Failed to redeem');
      }
      return (responseData.data ||
        responseData) as RedeemSpendCheckpointResponse;
    },
    onSuccess: async () => {
      setSubmitError(null);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['spend-checkpoint', checkpoint.id, walletAddress],
        }),
        queryClient.invalidateQueries({ queryKey: ['player', walletAddress] }),
      ]);
    },
    onError: (error) => {
      setSubmitError(
        error instanceof Error ? error.message : 'Failed to redeem item.'
      );
    },
  });

  const spendItem = data?.spendItem;
  const redemption = data?.redemption;
  const currentPoints = player?.total_points ?? 0;

  const pointsAfterRedeem = useMemo(() => {
    if (!spendItem) return currentPoints;
    return Math.max(0, currentPoints - spendItem.points_cost);
  }, [currentPoints, spendItem]);

  const brandBg = extractBaseColor(checkpoint.background_gradient);
  const textColor = checkpoint.font_color || '#E3FF30';
  const fontStyle = checkpoint.font_family
    ? { fontFamily: checkpoint.font_family }
    : undefined;

  if (isLoading || !spendItem) {
    return (
      <div
        className="min-h-dvh w-full flex flex-col items-center justify-center"
        style={{
          background: checkpoint.background_gradient || brandBg,
          ...fontStyle,
        }}
      >
        <div className="display2 sm:display2-sm text-center" style={{ color: textColor }}>
          Loading Redemption...
        </div>
      </div>
    );
  }

  const hasRedeemed = Boolean(redemption?.is_fulfilled);
  const canAfford = currentPoints >= spendItem.points_cost;

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
        <div className="flex flex-col gap-6">
          {hasRedeemed ? (
            <>
              <h1
                className="display0 sm:display0-sm uppercase text-center"
                style={{ color: textColor, ...fontStyle }}
              >
                You Are In
              </h1>

              <h2
                className="body-large sm:body-large uppercase text-center"
                style={{ color: textColor }}
              >
                {checkpoint.name}
              </h2>

              <div className="flex items-end justify-between">
                <span
                  className="label-medium uppercase tracking-[0.04em]"
                  style={{ color: textColor }}
                >
                  You Spent
                </span>
                <div className="flex items-end gap-2">
                  <span
                    className="display2 sm:display2-sm leading-[1em] font-normal -tracking-[0.065em]"
                    style={{ color: textColor }}
                  >
                    {spendItem.points_cost.toLocaleString()}
                  </span>
                  <img
                    src="/pts.svg"
                    alt="points"
                    width={20}
                    height={20}
                    className="h-5 w-auto shrink-0"
                    style={{ filter: 'invert(1) brightness(1000%)' }}
                  />
                </div>
              </div>

              <p
                className="body-medium sm:body-small leading-[1.2] font-medium -tracking-[0.02em] text-center"
                style={{ color: textColor }}
              >
                This redemption is complete. Show this confirmation at pickup.
              </p>

              <div
                role="status"
                className="label-large flex h-[44px] w-full items-center justify-center py-2 pl-4 pr-2 text-center uppercase"
                style={{
                  backgroundColor: textColor,
                  color: brandBg,
                }}
              >
                <span className="min-w-0 truncate pr-2">Redeemed</span>
                
              </div>
            </>
          ) : (
            <>
              <h1
                className="display1 sm:display1-sm text-center uppercase "
                style={{ color: textColor, ...fontStyle }}
              >
                {checkpoint.name}
              </h1>

              {checkpoint.description && (
                <p
                  className="label-medium text-[#eeeeee] leading-[1.2] font-medium -tracking-[0.02em] text-center"
                  style={{ color: '#eeeeee' }}
                >
                  {checkpoint.description}
                </p>
              )}

              <div
                className="rounded-2xl p-4 space-y-3.5"
                style={{ backgroundColor: `${textColor}22` }}
              >
                <div className="flex items-center justify-between gap-4">
                  <span
                    className="label-medium uppercase tracking-wider"
                    style={{ color: `${textColor}CC` }}
                  >
                    You send
                  </span>
                  <span
                    className="label-medium inline-flex items-center gap-1.5 whitespace-nowrap font-medium"
                    style={{ color: textColor }}
                  >
                    {spendItem.points_cost.toLocaleString()}
                    <img
                      src="/pts.svg"
                      alt="points"
                      width={20}
                      height={20}
                      className="h-5 w-auto shrink-0"
                      style={{
                        filter: 'invert(1) brightness(1000%)',
                      }}
                    />
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span
                    className="label-medium uppercase tracking-wider"
                    style={{ color: `${textColor}CC` }}
                  >
                    You receive
                  </span>
                  <span
                    className="label-medium text-right"
                    style={{ color: textColor }}
                  >
                    {checkpoint.name}
                  </span>
                </div>
              </div>

              <div
                className="rounded-2xl p-4"
                style={{ backgroundColor: `${textColor}1A` }}
              >
                <div className="flex items-center justify-between gap-4">
                  <span
                    className="label-medium uppercase tracking-wider"
                    style={{ color: `${textColor}CC` }}
                  >
                    Current points
                  </span>
                  <div className="flex flex-col items-end text-right">
                    <span
                      className="label-medium inline-flex items-center justify-end gap-1.5 whitespace-nowrap font-medium"
                      style={{ color: textColor }}
                    >
                      {currentPoints.toLocaleString()}
                      <img
                        src="/pts.svg"
                        alt="points"
                        width={20}
                        height={20}
                        className="h-5 w-auto shrink-0"
                        style={{
                          filter: 'invert(1) brightness(1000%)',
                        }}
                      />
                    </span>
                    <div className="mt-0.5 label-medium font-semibold text-[#FF4A2E]">
                      -{spendItem.points_cost.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {submitError && (
                <p
                  className="label-small rounded-xl px-4 py-3"
                  style={{
                    backgroundColor: `${textColor}1A`,
                    border: `1px solid ${textColor}40`,
                    color: textColor,
                  }}
                >
                  {submitError}
                </p>
              )}

              {!user ? (
                <button
                  onClick={login}
                  className="w-full rounded-full py-5 px-6 text-center text-xl font-bold uppercase -tracking-[0.08em]"
                  style={{
                    backgroundColor: textColor,
                    color: brandBg,
                  }}
                >
                  {checkpoint.login_cta_text?.trim() || 'Login to Redeem'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => redeemMutation.mutate()}
                  disabled={redeemMutation.isPending || !canAfford}
                  className="label-large flex h-[44px] w-full cursor-pointer items-center justify-between py-2 pl-4 pr-2 text-left transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    backgroundColor: textColor,
                    color: brandBg,
                  }}
                >
                  <span className="min-w-0 truncate pr-2">
                    {redeemMutation.isPending
                      ? 'Redeeming...'
                      : canAfford
                        ? 'Confirm Purchase'
                        : 'Not Enough Points'}
                  </span>
                  <HomepageHeroCtaArrow />
                </button>
              )}

              {user && canAfford && (
                <p
                  className="label-medium text-center"
                  style={{ color: `${textColor}CC` }}
                >
                  Balance after purchase: {pointsAfterRedeem.toLocaleString()}{' '}
                  PTS
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
