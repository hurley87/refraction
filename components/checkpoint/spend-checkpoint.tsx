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
      <div className="flex min-h-dvh items-center justify-center px-6 py-10">
        <div className="text-sm text-black/70">Loading redemption...</div>
      </div>
    );
  }

  const hasRedeemed = Boolean(redemption?.is_fulfilled);
  const canAfford = currentPoints >= spendItem.points_cost;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 py-5 font-grotesk text-[#17181A] sm:px-6">
      <h1 className="text-center text-[36px] font-medium tracking-[-1.2px] font-pleasure">
        {hasRedeemed ? 'Success!' : 'Confirm Your Purchase'}
      </h1>

      <div className="mt-4 overflow-hidden rounded-[22px] border border-black/10 bg-white shadow-sm">
        {checkpoint.partner_image_url && (
          <Image
            src={checkpoint.partner_image_url}
            alt={checkpoint.name}
            width={760}
            height={520}
            className="h-auto w-full object-cover"
          />
        )}
      </div>

      <div className="mt-5 text-center">
        <h2 className="text-[42px] leading-none tracking-[-1.4px] font-pleasure">
          {checkpoint.name}
        </h2>
        {checkpoint.description && (
          <p className="mt-2 text-sm text-black/65">{checkpoint.description}</p>
        )}
      </div>

      {!hasRedeemed ? (
        <>
          <div className="mt-7 space-y-4 border-y border-black/10 py-5">
            <div className="flex items-end justify-between gap-4">
              <span className="title5 text-black/35">YOU SEND</span>
              <span className="title4">
                {spendItem.points_cost.toLocaleString()} <span className="text-black/40">PTS</span>
              </span>
            </div>
            <div className="flex items-end justify-between gap-4">
              <span className="title5 text-black/35">YOU RECEIVE</span>
              <span className="title4 text-right">{checkpoint.name}</span>
            </div>
          </div>

          <div className="mt-6 rounded-[22px] border border-black/15 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-4">
              <span className="title5 text-black/45">YOUR ACCOUNT</span>
              <span className="rounded-full border border-black/25 px-3 py-1 text-sm font-mono uppercase">
                {user?.email?.address || 'Not logged in'}
              </span>
            </div>
            <div className="flex items-end justify-between gap-4">
              <span className="title5 text-black/45">CURRENT POINTS</span>
              <div className="text-right">
                <div className="title4">
                  {currentPoints.toLocaleString()}{' '}
                  <span className="text-black/40">PTS</span>
                </div>
                <div className="text-sm font-semibold text-[#FF4A2E]">
                  -{spendItem.points_cost.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {submitError && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </p>
          )}

          {!user ? (
            <Button
              onClick={login}
              className="mt-7 h-14 rounded-full bg-[#2A2D34] text-lg font-medium hover:bg-[#1f2228]"
            >
              {checkpoint.login_cta_text?.trim() || 'Login to Redeem'}
            </Button>
          ) : (
            <Button
              onClick={() => redeemMutation.mutate()}
              disabled={redeemMutation.isPending || !canAfford}
              className="mt-7 h-14 rounded-full bg-[#2A2D34] text-lg font-medium hover:bg-[#1f2228] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {redeemMutation.isPending
                ? 'Redeeming...'
                : canAfford
                  ? 'Confirm Purchase'
                  : 'Not Enough Points'}
            </Button>
          )}
        </>
      ) : (
        <>
          <p className="mt-2 text-center title5 text-black/40">YOU RECEIVED</p>
          <div className="mt-6 space-y-3 border-y border-black/10 py-5">
            <div className="flex items-center justify-between">
              <span className="title5 text-black/40">YOU SPENT</span>
              <span className="title4">
                {spendItem.points_cost.toLocaleString()} <span className="text-black/40">PTS</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="title5 text-black/40">YOUR POINTS BALANCE</span>
              <span className="title4">{currentPoints.toLocaleString()}</span>
            </div>
          </div>

          <p className="mt-5 text-center text-base text-black/75">
            This redemption is complete. Show this confirmation at pickup.
          </p>

          <Button
            disabled
            className="mt-7 h-14 cursor-default rounded-full border border-black/20 bg-white text-lg text-black hover:bg-white"
          >
            Redeemed!
          </Button>
        </>
      )}

      {!hasRedeemed && user && canAfford && (
        <p className="mt-3 text-center text-xs text-black/45">
          Balance after purchase: {pointsAfterRedeem.toLocaleString()} PTS
        </p>
      )}
    </div>
  );
}
