'use client';

import React, { useState } from 'react';
import { useWallet } from '@/lib/stellar/hooks/use-wallet';
import {
  invokePaymentContract,
  isValidAddress,
  isValidContractAddress,
} from '@/lib/stellar/utils/soroban';
import FundAccountButton from './fund-account-button';
import { toast } from 'sonner';
import { getSimplePaymentContractAddress } from '@/lib/stellar/utils/network';

const TestSendContract: React.FC = () => {
  const { address, networkPassphrase, accountExists, balances } = useWallet();
  // Get contract address based on wallet's network (not app config)
  const contractAddress = getSimplePaymentContractAddress(networkPassphrase);
  // Recipient is the connected user's address
  const recipientAddress = address || '';
  const [isLoading, setIsLoading] = useState(false);

  if (!address) {
    return (
      <div className="text-sm text-gray-400">
        Please connect your wallet to test contract sends.
      </div>
    );
  }

  // Check if account exists and has balance
  const xlmBalance = balances?.xlm?.balance;
  const hasBalance = xlmBalance && Number(xlmBalance) > 0;
  // Account needs funding if it doesn't exist OR if it exists but has no balance
  // Note: accountExists might be false even if the account is funded (timing issue)
  const needsFunding =
    (!accountExists && !hasBalance) || (accountExists && !hasBalance);

  const handleSend = async () => {
    // Validate contract address exists
    if (!contractAddress) {
      toast.error(
        'Contract address not configured. Please set NEXT_PUBLIC_SIMPLE_PAYMENT_CONTRACT_ADDRESS environment variable.'
      );
      return;
    }

    // Validate inputs
    if (!isValidContractAddress(contractAddress)) {
      toast.error(
        `Invalid contract address format: "${contractAddress}". ` +
          "Contract addresses must start with 'C' and be 56 characters long, " +
          "or be a valid Stellar address starting with 'G'. " +
          'Please check your NEXT_PUBLIC_SIMPLE_PAYMENT_CONTRACT_ADDRESS environment variable.'
      );
      return;
    }

    if (!recipientAddress) {
      toast.error('Recipient address is required. Please connect your wallet.');
      return;
    }

    if (!isValidAddress(recipientAddress)) {
      toast.error('Invalid recipient address format');
      return;
    }

    setIsLoading(true);
    try {
      // Use payment contract helper (no amount parameter - contract sends fixed 0.1 XLM)
      const txHash = await invokePaymentContract(
        contractAddress,
        recipientAddress,
        undefined, // No amount - contract sends fixed 0.1 XLM
        address,
        networkPassphrase
      );

      toast.success(`Transaction sent! Hash: ${txHash}`);
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
      } else if (
        errorMessage.includes('no XLM balance') ||
        errorMessage.includes('Contract has no') ||
        errorMessage.includes('insufficient XLM balance') ||
        errorMessage.includes('UnreachableCodeReached') ||
        errorMessage.includes('needs at least 0.1 XLM')
      ) {
        toast.error(
          `The payment contract has insufficient XLM balance. The contract must be funded with at least 0.1 XLM before it can send rewards. Please fund the contract address: ${contractAddress}`,
          { duration: 10000 }
        );
      } else if (errorMessage.includes('Insufficient balance')) {
        toast.error(
          `Insufficient contract balance: ${errorMessage}. The contract needs more XLM to send this amount.`,
          { duration: 8000 }
        );
      } else {
        toast.error(`Transaction failed: ${errorMessage}`);
      }
      console.error('Contract invocation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white">Test Contract Send</h2>

      {needsFunding && (
        <div className="p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm text-yellow-200 mb-1">
                <strong>Account needs funding:</strong> Your account must be
                funded with XLM before it can invoke contracts.
              </p>
              <p className="text-xs text-yellow-300/80 mb-2">
                Click the button below to fund your account using Friendbot
                (testnet only).
                {accountExists && !hasBalance && (
                  <span className="block mt-1">
                    Note: Account exists but has no balance. You may need to
                    refresh the page after funding.
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <FundAccountButton />
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-1.5 text-xs bg-gray-700 text-gray-200 rounded hover:bg-gray-600 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <button
          onClick={handleSend}
          disabled={isLoading || !contractAddress || !recipientAddress}
          className="w-full px-4 py-2 bg-[#FFE600] text-[#131313] rounded-lg font-medium hover:bg-[#FFD700] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Sending...' : 'Send reward'}
        </button>
      </div>
    </div>
  );
};

export default TestSendContract;
