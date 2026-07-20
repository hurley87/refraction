'use client';

import React, { useTransition } from 'react';
import Image from 'next/image';
import { useNotification } from '@/lib/stellar/hooks/use-notification';
import { useWallet } from '@/lib/stellar/hooks/use-wallet';
import { getFriendbotUrl } from '@/lib/stellar/utils/friendbot';

interface FundAccountButtonProps {
  compact?: boolean;
  /**
   * When set, funds this address (e.g. Privy embedded Stellar) instead of the
   * Freighter-connected wallet from context.
   */
  fundAddress?: string;
  /** Horizon account exists (used with fundAddress) */
  fundAccountExists?: boolean;
  /** Native XLM balance string from Horizon (used with fundAddress) */
  fundXlmBalance?: string;
}

const FundAccountButton: React.FC<FundAccountButtonProps> = ({
  compact = false,
  fundAddress,
  fundAccountExists,
  fundXlmBalance,
}) => {
  const { addNotification } = useNotification();
  const [isPending, startTransition] = useTransition();
  const { address, balances, accountExists } = useWallet();

  const targetAddress = fundAddress ?? address;
  if (!targetAddress) return null;

  const xlmBalance = fundAddress ? fundXlmBalance : balances?.xlm?.balance;
  const effectiveAccountExists = fundAddress
    ? (fundAccountExists ?? true)
    : accountExists;

  // Only show if account doesn't exist or balance is 0
  const hasBalance = xlmBalance && Number(xlmBalance) > 0;

  // Don't show if account exists and has balance
  if (effectiveAccountExists && hasBalance) return null;

  const handleFundAccount = () => {
    startTransition(async () => {
      try {
        const friendbotUrl = getFriendbotUrl(targetAddress);
        console.log('[Fund Account] Requesting funding from:', friendbotUrl);

        const response = await fetch(friendbotUrl);

        if (response.ok) {
          const result = await response.json();
          console.log('[Fund Account] Funding successful:', result);
          addNotification(
            'Account funded successfully! Please wait a moment for the balance to update.',
            'success'
          );

          // Refresh the page after a short delay to update balances
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          const body: unknown = await response.json();
          console.error('[Fund Account] Funding failed:', body);
          if (
            body !== null &&
            typeof body === 'object' &&
            'detail' in body &&
            typeof body.detail === 'string'
          ) {
            addNotification(`Error funding account: ${body.detail}`, 'error');
          } else {
            addNotification('Error funding account: Unknown error', 'error');
          }
        }
      } catch (error) {
        console.error('[Fund Account] Exception:', error);
        addNotification('Error funding account. Please try again.', 'error');
      }
    });
  };

  const buttonClass = compact
    ? 'label-small uppercase flex h-[32px] cursor-pointer items-center gap-2 bg-black px-3 text-white transition-colors hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-50'
    : 'label-large uppercase flex h-[44px] w-full cursor-pointer items-center justify-between bg-black py-2 pr-2 pl-4 text-white transition-colors hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <button
      className={buttonClass}
      disabled={isPending}
      onClick={handleFundAccount}
    >
      <span>{isPending ? 'Funding...' : 'Fund Account'}</span>
      <Image
        src="/guidance_up-right-2-short-arrow.svg"
        alt=""
        width={compact ? 16 : 24}
        height={compact ? 16 : 24}
        className={compact ? 'h-4 w-4' : 'h-6 w-6 shrink-0'}
        aria-hidden
      />
    </button>
  );
};

export default FundAccountButton;
