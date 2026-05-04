'use client';

import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useSpendItem,
  useSpendPoints,
  useVerifySpendRedemption,
  useUserSpendRedemptions,
} from '@/hooks/useSpend';
import { useCurrentPlayer } from '@/hooks/usePlayer';
import { usePrivy } from '@privy-io/react-auth';
import type { SpendRedemption } from '@/lib/types';
import {
  SpendPageShell,
  spendPrimaryCtaClass,
} from '@/components/spend/spend-page-shell';
import { cn } from '@/lib/utils';

type SpendItemPageProps = {
  itemId: string;
};

/**
 * Legacy checkpoint spend item flow (drink ticket).
 */
export function SpendItemPage({ itemId }: SpendItemPageProps) {
  const { user, login, getAccessToken } = usePrivy();
  const walletAddress = user?.wallet?.address;

  const { data: item, isLoading: itemLoading } = useSpendItem(itemId);
  const { data: player } = useCurrentPlayer();
  const { data: redemptions = [] } = useUserSpendRedemptions(walletAddress);
  const createMutation = useSpendPoints();
  const verifyMutation = useVerifySpendRedemption();

  const currentPoints = player?.total_points ?? 0;
  const forThisItem = (r: SpendRedemption) => r.spend_item_id === itemId;
  const pending = redemptions
    .filter(forThisItem)
    .filter((r) => !r.is_fulfilled);
  const verified = redemptions
    .filter(forThisItem)
    .filter((r) => r.is_fulfilled);

  const handleGetTicket = async () => {
    if (!walletAddress) return;
    const token = await getAccessToken();
    if (!token) {
      toast.error('Please log in to continue');
      return;
    }
    createMutation.mutate(
      { spendItemId: itemId, walletAddress, accessToken: token },
      {
        onSuccess: () =>
          toast.success('Drink ticket created. Verify at the bar to use it.'),
        onError: (error) => {
          const msg =
            error instanceof Error ? error.message : 'Failed to create ticket';
          toast.error(msg);
        },
      }
    );
  };

  const handleVerify = async (redemptionId: string) => {
    if (!walletAddress) return;
    const token = await getAccessToken();
    if (!token) {
      toast.error('Please log in to continue');
      return;
    }
    verifyMutation.mutate(
      { redemptionId, walletAddress, accessToken: token },
      {
        onSuccess: () => toast.success('Verified. Points deducted.'),
        onError: (error) => {
          const msg =
            error instanceof Error ? error.message : 'Failed to verify';
          toast.error(msg);
        },
      }
    );
  };

  if (itemLoading) {
    return (
      <SpendPageShell>
        <div className="flex min-h-[40vh] items-center justify-center rounded-2xl bg-white p-8">
          <Loader2 className="size-8 animate-spin text-gray-400" />
        </div>
      </SpendPageShell>
    );
  }

  if (!item) {
    return (
      <SpendPageShell>
        <div className="rounded-2xl bg-white p-8 text-center">
          <p className="font-inktrap text-sm text-gray-600">Item not found</p>
        </div>
      </SpendPageShell>
    );
  }

  return (
    <SpendPageShell>
      {item.image_url && (
        <div className="overflow-hidden rounded-2xl bg-white p-2">
          <div className="relative aspect-[3/2] w-full overflow-hidden rounded-xl bg-gray-100">
            <Image
              src={item.image_url}
              alt={item.name}
              fill
              className="object-cover"
              sizes="(max-width: 512px) 100vw, 512px"
            />
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-white p-4">
        <h1 className="mb-2 text-xl font-bold text-black font-inktrap">
          {item.name}
        </h1>
        {item.description && (
          <p className="mb-4 text-sm leading-relaxed text-gray-600 font-inktrap">
            {item.description}
          </p>
        )}

        <div className="space-y-3 rounded-2xl border-2 border-gray-100 bg-gray-50/90 p-4">
          <div className="flex justify-between gap-2 text-sm font-inktrap">
            <span className="text-gray-600">Cost</span>
            <span className="font-semibold text-black">
              {item.points_cost.toLocaleString()} points
            </span>
          </div>
          {walletAddress && (
            <div className="flex justify-between gap-2 text-sm font-inktrap">
              <span className="text-gray-600">Your balance</span>
              <span className="font-semibold text-black">
                {currentPoints.toLocaleString()} points
              </span>
            </div>
          )}
        </div>
      </div>

      {!user ? (
        <div className="rounded-2xl bg-white p-4">
          <button
            type="button"
            onClick={login}
            className={cn(spendPrimaryCtaClass, 'bg-black text-white hover:bg-gray-800')}
          >
            Login to get drink ticket
          </button>
        </div>
      ) : (
        <>
          <div className="rounded-2xl bg-white p-4">
            <button
              type="button"
              className={cn(
                spendPrimaryCtaClass,
                createMutation.isPending
                  ? 'bg-gray-100 text-gray-500'
                  : 'bg-black text-white hover:bg-gray-800'
              )}
              onClick={() => void handleGetTicket()}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Creating…
                </span>
              ) : (
                'Get drink ticket'
              )}
            </button>
          </div>

          {pending.length > 0 && (
            <div className="rounded-2xl bg-white p-4">
              <p className="mb-3 text-xs font-inktrap font-bold uppercase tracking-wide text-black">
                Pending – verify at the bar
              </p>
              <ul className="space-y-3">
                {pending.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-col gap-3 rounded-2xl border-2 border-orange-200 bg-orange-50/90 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="text-sm text-gray-800 font-inktrap">
                      {r.points_spent} points – not yet verified
                    </span>
                    <button
                      type="button"
                      className={cn(
                        spendPrimaryCtaClass,
                        'shrink-0 px-6 py-2 sm:w-auto',
                        verifyMutation.isPending ||
                          currentPoints < r.points_spent
                          ? 'bg-gray-100 text-gray-500'
                          : 'bg-black text-white hover:bg-gray-800'
                      )}
                      onClick={() => void handleVerify(r.id!)}
                      disabled={
                        verifyMutation.isPending ||
                        currentPoints < r.points_spent
                      }
                    >
                      {verifyMutation.isPending ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="size-4 animate-spin" />
                          Verifying…
                        </span>
                      ) : (
                        'Verify at bar'
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {verified.length > 0 && (
            <div className="rounded-2xl bg-white p-4">
              <p className="mb-3 text-xs font-inktrap font-bold uppercase tracking-wide text-black">
                Verified
              </p>
              <ul className="space-y-3">
                {verified.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-2 rounded-2xl border-2 border-green-200 bg-green-50/90 p-4 text-sm font-inktrap text-gray-800"
                  >
                    <span>
                      {r.points_spent} points
                      {r.fulfilled_at
                        ? ` · ${new Date(r.fulfilled_at).toLocaleDateString()}`
                        : ''}
                    </span>
                    <span className="font-semibold text-green-800">Verified</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </SpendPageShell>
  );
}
