'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
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
      <div className="flex min-h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Item not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-lg p-6">
      {item.image_url && (
        <div className="mb-6">
          <Image
            src={item.image_url}
            alt={item.name}
            width={600}
            height={400}
            className="w-full rounded-lg object-cover"
          />
        </div>
      )}

      <h1 className="mb-2 text-2xl font-bold">{item.name}</h1>

      {item.description && (
        <p className="mb-4 text-gray-600">{item.description}</p>
      )}

      <div className="mb-6 space-y-2 rounded-lg bg-gray-50 p-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Cost</span>
          <span className="font-semibold">
            {item.points_cost.toLocaleString()} points
          </span>
        </div>
        {walletAddress && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Your Balance</span>
            <span className="font-semibold">
              {currentPoints.toLocaleString()} points
            </span>
          </div>
        )}
      </div>

      {!user ? (
        <Button className="w-full" onClick={login}>
          Login to Get Drink Ticket
        </Button>
      ) : (
        <>
          <Button
            className="mb-6 w-full"
            onClick={() => void handleGetTicket()}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Get Drink Ticket'}
          </Button>

          {pending.length > 0 && (
            <div className="mb-4">
              <h2 className="mb-2 text-sm font-semibold text-gray-700">
                Pending – verify at the bar
              </h2>
              <ul className="space-y-2">
                {pending.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3"
                  >
                    <span className="text-sm">
                      {r.points_spent} points – not yet verified
                    </span>
                    <Button
                      size="sm"
                      onClick={() => void handleVerify(r.id!)}
                      disabled={
                        verifyMutation.isPending ||
                        currentPoints < r.points_spent
                      }
                    >
                      {verifyMutation.isPending
                        ? 'Verifying...'
                        : 'Verify at bar'}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {verified.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-gray-700">
                Verified
              </h2>
              <ul className="space-y-2">
                {verified.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-gray-600"
                  >
                    <span>
                      {r.points_spent} points
                      {r.fulfilled_at
                        ? ` · ${new Date(r.fulfilled_at).toLocaleDateString()}`
                        : ''}
                    </span>
                    <span className="font-medium text-green-700">Verified</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
