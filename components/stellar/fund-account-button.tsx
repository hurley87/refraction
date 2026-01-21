'use client';

import React, { useTransition } from 'react';
import Image from 'next/image';
import { useNotification } from '@/lib/stellar/hooks/use-notification';
import { useWallet } from '@/lib/stellar/hooks/use-wallet';
import { getFriendbotUrl } from '@/lib/stellar/utils/friendbot';

interface FundAccountButtonProps {
  compact?: boolean;
}

const FundAccountButton: React.FC<FundAccountButtonProps> = ({
  compact = false,
}) => {
  const { addNotification } = useNotification();
  const [isPending, startTransition] = useTransition();
  const { address, balances, accountExists } = useWallet();

  if (!address) return null;

  // Only show if account doesn't exist or balance is 0
  const xlmBalance = balances?.xlm?.balance;
  const hasBalance = xlmBalance && Number(xlmBalance) > 0;

  // Don't show if account exists and has balance
  if (accountExists && hasBalance) return null;

  const handleFundAccount = () => {
    startTransition(async () => {
      try {
        const friendbotUrl = getFriendbotUrl(address);
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
    ? 'h-[32px] bg-[#313131] hover:bg-gray-800 text-white px-3 rounded-full font-pleasure text-sm transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
    : 'w-full h-[40px] bg-[#313131] hover:bg-gray-800 text-white px-4 rounded-full font-pleasure transition-colors duration-200 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <button
      className={buttonClass}
      disabled={isPending}
      onClick={handleFundAccount}
    >
      <span>{isPending ? 'Funding...' : 'Fund Account'}</span>
      <Image
        src="/home/arrow-right.svg"
        alt="arrow"
        width={21}
        height={21}
        className={compact ? 'w-4 h-4' : 'w-[21px] h-[21px]'}
      />
    </button>
  );
};

export default FundAccountButton;
