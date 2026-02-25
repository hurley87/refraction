'use client';

import { useParams } from 'next/navigation';
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

export default function SpendItemPage() {
  const { id } = useParams<{ id: string }>();
  const { user, login } = usePrivy();
  const walletAddress = user?.wallet?.address;

  const { data: item, isLoading: itemLoading } = useSpendItem(id);
  const { data: player } = useCurrentPlayer();
  const { data: redemptions = [] } = useUserSpendRedemptions(walletAddress);
  const createMutation = useSpendPoints();
  const verifyMutation = useVerifySpendRedemption();

  const currentPoints = player?.total_points ?? 0;
  const forThisItem = (r: SpendRedemption) => r.spend_item_id === id;
  const pending = redemptions
    .filter(forThisItem)
    .filter((r) => !r.is_fulfilled);
  const verified = redemptions
    .filter(forThisItem)
    .filter((r) => r.is_fulfilled);

  const handleGetTicket = () => {
    if (!walletAddress || !id) return;
    createMutation.mutate(
      { spendItemId: id, walletAddress },
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

  const handleVerify = (redemptionId: string) => {
    if (!walletAddress) return;
    verifyMutation.mutate(
      { redemptionId, walletAddress },
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
      <div className="flex justify-center items-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Item not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-lg">
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

      <h1 className="text-2xl font-bold mb-2">{item.name}</h1>

      {item.description && (
        <p className="text-gray-600 mb-4">{item.description}</p>
      )}

      <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
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
            className="w-full mb-6"
            onClick={handleGetTicket}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Get Drink Ticket'}
          </Button>

          {pending.length > 0 && (
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-2">
                Pending – verify at the bar
              </h2>
              <ul className="space-y-2">
                {pending.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg"
                  >
                    <span className="text-sm">
                      {r.points_spent} points – not yet verified
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleVerify(r.id!)}
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
              <h2 className="text-sm font-semibold text-gray-700 mb-2">
                Verified
              </h2>
              <ul className="space-y-2">
                {verified.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-gray-600"
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
