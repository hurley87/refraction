'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { usePrivy } from '@privy-io/react-auth';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentPlayer } from '@/hooks/usePlayer';
import type { Checkpoint, SpendItem, SpendRedemption, Player } from '@/lib/types';

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
      return (responseData.data || responseData) as RedeemSpendCheckpointResponse;
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
        <div className="text-sm" style={{ color: textColor }}>
          Loading redemption...
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

        {/* Content */}
        <div className="flex flex-col gap-6">
          {hasRedeemed ? (
            <>
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
                {checkpoint.name}
              </h2>

              <div className="flex items-end justify-between">
                <span
                  className="text-[13px] font-bold uppercase tracking-[0.04em]"
                  style={{ color: textColor }}
                >
                  You Spent
                </span>
                <div className="flex items-end gap-2">
                  <span
                    className="text-[100px] leading-[1em] font-normal -tracking-[0.065em]"
                    style={{ color: textColor }}
                  >
                    {spendItem.points_cost}
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
                This redemption is complete. Show this confirmation at pickup.
              </p>

              <div
                className="w-full rounded-full py-5 px-6 text-center text-xl font-bold uppercase -tracking-[0.08em]"
                style={{
                  backgroundColor: `${textColor}30`,
                  color: textColor,
                }}
              >
                Redeemed
              </div>
            </>
          ) : (
            <>
              <h1
                className="text-[52px] leading-[0.8em] font-extrabold uppercase -tracking-[0.08em]"
                style={{ color: textColor, ...fontStyle }}
              >
                {checkpoint.name}
              </h1>

              {checkpoint.description && (
                <p
                  className="text-xl leading-[1.2] font-medium -tracking-[0.02em]"
                  style={{ color: textColor }}
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
                    className="text-xs font-medium uppercase tracking-wider"
                    style={{ color: `${textColor}CC` }}
                  >
                    You send
                  </span>
                  <span
                    className="text-[15px] font-medium"
                    style={{ color: textColor }}
                  >
                    {spendItem.points_cost.toLocaleString()}{' '}
                    <span style={{ opacity: 0.75 }}>PTS</span>
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span
                    className="text-xs font-medium uppercase tracking-wider"
                    style={{ color: `${textColor}CC` }}
                  >
                    You receive
                  </span>
                  <span
                    className="text-[15px] font-medium text-right"
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
                    className="text-xs font-medium uppercase tracking-wider"
                    style={{ color: `${textColor}CC` }}
                  >
                    Current points
                  </span>
                  <div className="text-right">
                    <span
                      className="text-[15px] font-medium"
                      style={{ color: textColor }}
                    >
                      {currentPoints.toLocaleString()}{' '}
                      <span style={{ opacity: 0.75 }}>PTS</span>
                    </span>
                    <div className="mt-0.5 text-xs font-semibold text-[#FF4A2E]">
                      -{spendItem.points_cost.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {submitError && (
                <p
                  className="rounded-xl px-4 py-3 text-sm"
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
                  onClick={() => redeemMutation.mutate()}
                  disabled={redeemMutation.isPending || !canAfford}
                  className="w-full rounded-full py-5 px-6 text-center text-xl font-bold uppercase -tracking-[0.08em] disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: textColor,
                    color: brandBg,
                  }}
                >
                  {redeemMutation.isPending
                    ? 'Redeeming...'
                    : canAfford
                      ? 'Confirm Purchase'
                      : 'Not Enough Points'}
                </button>
              )}

              {user && canAfford && (
                <p
                  className="text-center text-xs"
                  style={{ color: `${textColor}CC` }}
                >
                  Balance after purchase: {pointsAfterRedeem.toLocaleString()} PTS
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
