'use client';

import React, { useState } from 'react';
import { useWallet } from '@/lib/stellar/hooks/use-wallet';
import { useNotification } from '@/lib/stellar/hooks/use-notification';
import {
  invokePaymentContract,
  isValidAddress,
  isValidContractAddress,
} from '@/lib/stellar/utils/soroban';
import { connectWallet } from '@/lib/stellar/utils/wallet';
import FundAccountButton from './fund-account-button';
import { toast } from 'sonner';

interface ClaimPointsProps {
  onPending?: () => void;
  onSuccess?: (txHash: string) => void;
  onError?: (error: string) => void;
}

const ClaimPoints: React.FC<ClaimPointsProps> = ({
  onPending,
  onSuccess,
  onError,
}) => {
  const { address, networkPassphrase, accountExists, balances, isPending } =
    useWallet();
  const { addNotification } = useNotification();
  // Fixed contract address (same as TestSendContract)
  const contractAddress =
    'CBPPHUSZS6B76X7NPJY76FQ3ZHGYFXVC4YJSOR2HAYNVEXVQZIJJCFAG';
  // Fixed amount: 1 XLM
  const amount = 1;
  // Recipient is the connected user's address
  const recipientAddress = address || '';
  const [isLoading, setIsLoading] = useState(false);

  // Check if account exists and has balance
  const xlmBalance = balances?.xlm?.balance;
  const hasBalance = xlmBalance && Number(xlmBalance) > 0;
  // Account needs funding if it doesn't exist OR if it exists but has no balance
  const needsFunding =
    (!accountExists && !hasBalance) || (accountExists && !hasBalance);

  const handleClaim = async () => {
    // Validate inputs
    if (!isValidContractAddress(contractAddress)) {
      const errorMsg =
        "Invalid contract address format. Contract addresses must start with 'C' and be 56 characters long, or be a valid Stellar address starting with 'G'.";
      toast.error(errorMsg);
      onError?.(errorMsg);
      return;
    }

    if (!recipientAddress) {
      const errorMsg =
        'Recipient address is required. Please connect your wallet.';
      toast.error(errorMsg);
      onError?.(errorMsg);
      return;
    }

    if (!isValidAddress(recipientAddress)) {
      const errorMsg = 'Invalid recipient address format';
      toast.error(errorMsg);
      onError?.(errorMsg);
      return;
    }

    setIsLoading(true);
    onPending?.();

    try {
      // Use payment contract helper that tries multiple function names
      const txHash = await invokePaymentContract(
        contractAddress,
        recipientAddress,
        amount,
        address!,
        networkPassphrase
      );

      toast.success(`Points claimed successfully! Transaction hash: ${txHash}`);
      addNotification(`Points claimed successfully: ${txHash}`, 'success');
      onSuccess?.(txHash);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      // Provide helpful message for account not found errors
      if (
        errorMessage.includes('Account not found') ||
        errorMessage.includes('not found')
      ) {
        toast.error(
          "Account not found or not funded. Please fund your account first using the 'Fund Account' button.",
          { duration: 5000 }
        );
        addNotification(
          'Account not found or not funded. Please fund your account before claiming points.',
          'error'
        );
      } else {
        toast.error(`Transaction failed: ${errorMessage}`);
        addNotification(`Transaction failed: ${errorMessage}`, 'error');
      }
      console.error('Claim points error:', error);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!address) {
    return (
      <div className="space-y-4">
        <p className="body-medium text-[#7D7D7D] font-grotesk">
          Connect your wallet to claim reward points.
        </p>
        <button
          className="w-full h-[40px] bg-[#FFE600] text-[#131313] rounded-full font-pleasure hover:bg-[#FFD700] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          onClick={() => void connectWallet()}
          disabled={isPending}
        >
          {isPending ? 'Loading...' : 'Connect Wallet'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="body-medium text-[#7D7D7D] font-grotesk">
        Claim your reward points for completing this transaction.
      </p>

      {needsFunding && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex flex-col gap-3">
            <div className="flex-1">
              <p className="text-sm text-yellow-800 mb-1">
                <strong>Account needs funding:</strong> Your account must be
                funded with XLM before it can invoke contracts.
              </p>
              <p className="text-xs text-yellow-700">
                Click the button below to fund your account using Friendbot
                (testnet only).
              </p>
            </div>
            <div className="flex justify-start">
              <FundAccountButton />
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handleClaim}
        disabled={
          isLoading || !contractAddress || !recipientAddress || needsFunding
        }
        className="w-full h-[40px] bg-[#FFE600] text-[#131313] rounded-full font-pleasure hover:bg-[#FFD700] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {isLoading ? 'Processing...' : 'Claim Points'}
      </button>
    </div>
  );
};

export default ClaimPoints;
