'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { usePrivy } from '@privy-io/react-auth';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
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

  if (isLoading || !spendItem) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4 py-10">
        <div className="rounded-3xl bg-white px-8 py-10 text-center shadow-sm">
          <div className="text-sm text-black/50">Loading redemption...</div>
        </div>
      </div>
    );
  }

  const hasRedeemed = Boolean(redemption?.is_fulfilled);
  const canAfford = currentPoints >= spendItem.points_cost;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center px-4 py-8 font-grotesk sm:px-6">
      <div className="w-full overflow-hidden rounded-3xl bg-white shadow-xl">
        {checkpoint.partner_image_url && (
          <Image
            src={checkpoint.partner_image_url}
            alt={checkpoint.name}
            width={760}
            height={520}
            className="h-auto w-full object-cover"
          />
        )}

        <div className="px-5 pb-7 pt-6 sm:px-7">
          <h1 className="text-center text-[32px] font-medium tracking-[-1px] font-pleasure text-[#17181A]">
            {hasRedeemed ? 'Success!' : 'Confirm Your Purchase'}
          </h1>

          <div className="mt-4 text-center">
            <h2 className="text-[28px] leading-tight tracking-[-0.8px] font-pleasure text-[#17181A] sm:text-[34px]">
              {checkpoint.name}
            </h2>
            {checkpoint.description && (
              <p className="mt-1.5 text-sm text-black/50">{checkpoint.description}</p>
            )}
          </div>

          {!hasRedeemed ? (
            <>
              <div className="mt-6 space-y-3.5 border-t border-black/8 pt-5">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-medium uppercase tracking-wider text-black/40">You send</span>
                  <span className="text-[15px] font-medium text-[#17181A]">
                    {spendItem.points_cost.toLocaleString()} <span className="text-black/35">PTS</span>
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-medium uppercase tracking-wider text-black/40">You receive</span>
                  <span className="text-[15px] font-medium text-right text-[#17181A]">{checkpoint.name}</span>
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-[#F7F7F8] p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-medium uppercase tracking-wider text-black/40">Your account</span>
                  <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-mono text-black/70">
                    {user?.email?.address || 'Not logged in'}
                  </span>
                </div>
                <div className="mt-3.5 flex items-center justify-between gap-4">
                  <span className="text-xs font-medium uppercase tracking-wider text-black/40">Current points</span>
                  <div className="text-right">
                    <span className="text-[15px] font-medium text-[#17181A]">
                      {currentPoints.toLocaleString()} <span className="text-black/35">PTS</span>
                    </span>
                    <div className="mt-0.5 text-xs font-semibold text-[#FF4A2E]">
                      -{spendItem.points_cost.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {submitError && (
                <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {submitError}
                </p>
              )}

              {!user ? (
                <Button
                  onClick={login}
                  className="mt-6 h-[52px] w-full rounded-2xl bg-[#17181A] text-base font-medium text-white hover:bg-[#2A2D34] transition-colors"
                >
                  {checkpoint.login_cta_text?.trim() || 'Login to Redeem'}
                </Button>
              ) : (
                <Button
                  onClick={() => redeemMutation.mutate()}
                  disabled={redeemMutation.isPending || !canAfford}
                  className="mt-6 h-[52px] w-full rounded-2xl bg-[#17181A] text-base font-medium text-white hover:bg-[#2A2D34] transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {redeemMutation.isPending
                    ? 'Redeeming...'
                    : canAfford
                      ? 'Confirm Purchase'
                      : 'Not Enough Points'}
                </Button>
              )}

              {user && canAfford && (
                <p className="mt-3 text-center text-xs text-black/40">
                  Balance after purchase: {pointsAfterRedeem.toLocaleString()} PTS
                </p>
              )}
            </>
          ) : (
            <>
              <div className="mt-1 text-center">
                <span className="text-xs font-medium uppercase tracking-wider text-black/40">You received</span>
              </div>

              <div className="mt-5 space-y-3.5 border-t border-black/8 pt-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-black/40">You spent</span>
                  <span className="text-[15px] font-medium text-[#17181A]">
                    {spendItem.points_cost.toLocaleString()} <span className="text-black/35">PTS</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-black/40">Points balance</span>
                  <span className="text-[15px] font-medium text-[#17181A]">
                    {currentPoints.toLocaleString()} <span className="text-black/35">PTS</span>
                  </span>
                </div>
              </div>

              <p className="mt-5 text-center text-xl font-semibold text-black">
                This redemption is complete. Show this confirmation at pickup.
              </p>

              <div className="mt-6 flex h-[52px] w-full items-center justify-center rounded-2xl border border-black/10 bg-[#F7F7F8] text-base font-medium text-black/50">
                Redeemed
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
