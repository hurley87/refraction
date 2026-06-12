'use client';

import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { SpendPageShell } from '@/components/spend/spend-page-shell';
import { SpendPrimaryButton } from '@/components/spend/spend-primary-button';
import {
  useSpendItem,
  useSpendPoints,
  useVerifySpendRedemption,
  useUserSpendRedemptions,
} from '@/hooks/useSpend';
import { useCurrentPlayer } from '@/hooks/usePlayer';
import { usePrivy } from '@privy-io/react-auth';
import { useEvmWalletAddress } from '@/hooks/use-evm-wallet-address';
import type { SpendRedemption } from '@/lib/types';

type SpendItemPageProps = {
  itemId: string;
};

/**
 * Legacy checkpoint spend item flow (drink ticket).
 */
export function SpendItemPage({ itemId }: SpendItemPageProps) {
  const { user, login, getAccessToken } = usePrivy();
  const walletAddress = useEvmWalletAddress();

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
      <SpendPageShell showCard={false}>
        <div className="flex min-h-[40vh] items-center justify-center px-4">
          <Loader2 className="size-8 animate-spin text-white/70" aria-hidden />
        </div>
      </SpendPageShell>
    );
  }

  if (!item) {
    return (
      <SpendPageShell>
        <p className="body-medium font-grotesk text-center text-[#171717]">
          Item not found
        </p>
      </SpendPageShell>
    );
  }

  return (
    <SpendPageShell>
      <div className="flex flex-col gap-6">
        {item.image_url && (
          <div className="relative aspect-[3/2] w-full overflow-hidden rounded-sm border border-[rgba(0,0,0,0.08)] bg-[#f5f5f5]">
            <Image
              src={item.image_url}
              alt={item.name}
              fill
              sizes="(max-width: 768px) 100vw, 480px"
              className="object-cover"
            />
          </div>
        )}

        <div>
          <h1 className="title2 text-[#171717]">{item.name}</h1>
          {item.description && (
            <p className="mt-3 body-medium font-grotesk text-[#757575]">
              {item.description}
            </p>
          )}
        </div>

        <div className="space-y-3 rounded-sm border border-[#ededed] bg-[#fafafa] p-4">
          <div className="flex justify-between gap-4">
            <span className="body-small font-grotesk text-[#757575]">Cost</span>
            <span className="body-medium font-grotesk font-semibold text-[#171717]">
              {item.points_cost.toLocaleString()} points
            </span>
          </div>
          {walletAddress && (
            <div className="flex justify-between gap-4 border-t border-[#ededed] pt-3">
              <span className="body-small font-grotesk text-[#757575]">
                Your balance
              </span>
              <span className="body-medium font-grotesk font-semibold text-[#171717]">
                {currentPoints.toLocaleString()} points
              </span>
            </div>
          )}
        </div>

        {!user ? (
          <SpendPrimaryButton onClick={login}>
            Login to get drink ticket
          </SpendPrimaryButton>
        ) : (
          <>
            <SpendPrimaryButton
              pending={createMutation.isPending}
              onClick={() => void handleGetTicket()}
            >
              {createMutation.isPending ? 'Creating…' : 'Get drink ticket'}
            </SpendPrimaryButton>

            {pending.length > 0 && (
              <div>
                <p className="label-small mb-3 text-[#171717]">
                  Pending — verify at the bar
                </p>
                <ul className="space-y-2">
                  {pending.map((r) => (
                    <li
                      key={r.id}
                      className="flex flex-col gap-3 rounded-sm border border-amber-200/90 bg-amber-50/90 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="body-small font-grotesk text-[#171717]">
                        {r.points_spent} points — not yet verified
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 shrink-0 rounded-sm border-[#171717] bg-white text-[#171717] hover:bg-black/[0.04]"
                        onClick={() => void handleVerify(r.id!)}
                        disabled={
                          verifyMutation.isPending ||
                          currentPoints < r.points_spent
                        }
                      >
                        {verifyMutation.isPending
                          ? 'Verifying…'
                          : 'Verify at bar'}
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {verified.length > 0 && (
              <div>
                <p className="label-small mb-3 text-[#171717]">Verified</p>
                <ul className="space-y-2">
                  {verified.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-2 rounded-sm border border-emerald-200/90 bg-emerald-50/80 p-3"
                    >
                      <span className="body-small font-grotesk text-[#171717]">
                        {r.points_spent} points
                        {r.fulfilled_at
                          ? ` · ${new Date(r.fulfilled_at).toLocaleDateString()}`
                          : ''}
                      </span>
                      <span className="label-small text-emerald-800">
                        Verified
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </SpendPageShell>
  );
}
