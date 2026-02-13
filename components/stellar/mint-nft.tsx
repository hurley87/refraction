'use client';

import React, { useState } from 'react';
import { useWallet } from '@/lib/stellar/hooks/use-wallet';
import { mintNFT, isValidContractAddress } from '@/lib/stellar/utils/soroban';
import { getNFTContractAddress } from '@/lib/stellar/utils/network';
import { connectWallet } from '@/lib/stellar/utils/wallet';
import { toast } from 'sonner';
import FundAccountButton from './fund-account-button';

interface MintNFTProps {
  ctaLabel?: string;
  onPending?: () => void;
  onSuccess?: (result: {
    txHash: string;
    tokenId: number;
    contractId: string;
  }) => void;
  onError?: (error: string) => void;
}

const MintNFT: React.FC<MintNFTProps> = ({
  ctaLabel = 'Mint NFT (0.01 XLM)',
  onPending,
  onSuccess,
  onError,
}) => {
  const {
    address,
    network,
    networkPassphrase,
    accountExists,
    balances,
    isPending,
  } = useWallet();
  // Get contract address based on wallet's network (not app config)
  const contractAddress = getNFTContractAddress(networkPassphrase);
  const [isLoading, setIsLoading] = useState(false);

  // Check if account exists and has balance
  const xlmBalance = balances?.xlm?.balance;
  const balanceNum = xlmBalance ? Number(xlmBalance) : 0;
  const hasBalance = balanceNum > 0;
  const needsFunding =
    (!accountExists && !hasBalance) || (accountExists && !hasBalance);

  // Calculate minimum balance needed for minting
  // 0.01 XLM payment + fee + minimum balance that must remain after transfer
  // The native token contract enforces a minimum balance (typically 1 XLM for mainnet)
  const isOnMainnet = networkPassphrase?.includes('Public');
  const mintCost = 0.01;
  const estimatedFee = isOnMainnet ? 0.01 : 0.00001;
  const minBalanceAfterTransfer = isOnMainnet ? 1.0 : 0.5; // Minimum balance that must remain (enforced by native token contract)
  const minBalanceRequired = mintCost + estimatedFee + minBalanceAfterTransfer;
  const hasEnoughBalance = balanceNum >= minBalanceRequired;

  // Check if user is on testnet (Friendbot only works on testnet)
  const isOnTestnet =
    networkPassphrase?.includes('Test') &&
    !networkPassphrase?.includes('Future');

  const handleMint = async () => {
    if (!isValidContractAddress(contractAddress)) {
      const errorMsg =
        "Invalid contract address format. Contract addresses must start with 'C' and be 56 characters long, or be a valid Stellar address starting with 'G'.";
      toast.error(errorMsg);
      onError?.(errorMsg);
      return;
    }

    if (!address) {
      const errorMsg = 'Please connect your wallet first.';
      toast.error(errorMsg);
      onError?.(errorMsg);
      return;
    }

    if (!contractAddress) {
      const errorMsg =
        'NFT contract address not configured. Please update lib/stellar/contract-addresses.ts with the deployed NFT contract ID.';
      toast.error(errorMsg);
      onError?.(errorMsg);
      return;
    }

    if (!networkPassphrase) {
      const errorMsg =
        'Network information not available. Please reconnect your wallet.';
      toast.error(errorMsg);
      onError?.(errorMsg);
      console.error('[MintNFT] networkPassphrase is undefined:', {
        address,
        network,
        networkPassphrase: networkPassphrase,
      });
      return;
    }

    // Check if user has enough balance before attempting mint
    if (!hasEnoughBalance) {
      const errorMsg =
        `Insufficient balance. You need at least ${minBalanceRequired.toFixed(2)} XLM to mint (you have ${balanceNum.toFixed(2)} XLM). ` +
        `This covers the 0.01 XLM payment, transaction fees, and the minimum balance (${minBalanceAfterTransfer.toFixed(1)} XLM) that must remain as required by the native token contract.`;
      toast.error(errorMsg, { duration: 6000 });
      onError?.(errorMsg);
      return;
    }

    setIsLoading(true);
    onPending?.();

    try {
      // Mint NFT to the connected wallet address
      // The contract requires the recipient to authorize the transaction (sign it)
      // because the contract transfers 0.01 XLM from the recipient to the contract as payment.
      // The recipient is always the connected wallet (they're paying for their own mint).
      const result = await mintNFT(
        contractAddress,
        address, // Recipient is always the connected wallet
        address, // Signer is always the connected wallet
        networkPassphrase
      );

      const successMessage = `NFT minted successfully!\n\nTransaction Hash: ${result.txHash}\nContract ID: ${result.contractId}\nToken ID: ${result.tokenId}\n\nUse these details to add the NFT to Freighter collectibles.`;
      toast.success(successMessage, { duration: 10000 });
      onSuccess?.(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      if (errorMessage.includes('Account not found')) {
        toast.error(
          'Account not found or not funded. Please fund your account first.',
          { duration: 5000 }
        );
      } else {
        toast.error(`Minting failed: ${errorMessage}`);
      }
      console.error('NFT minting error:', error);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!address) {
    return (
      <div className="space-y-4">
        <p className="body-medium text-[#7D7D7D] font-grotesk">
          Connect your wallet to purchase your event ticket as an NFT.
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

  if (!contractAddress) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          NFT contract address not configured. Please update
          lib/stellar/contract-addresses.ts with the deployed NFT contract ID.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="body-medium text-[#7D7D7D] font-grotesk">
        Purchase your event ticket. 
      </p>

      {needsFunding && isOnTestnet && (
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

      {needsFunding && !isOnTestnet && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Account needs funding:</strong> Your account must be funded
            with XLM before it can invoke contracts. Please fund your account
            using a Stellar wallet or exchange.
          </p>
        </div>
      )}

      {hasBalance && !hasEnoughBalance && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800 mb-1">
            <strong>Insufficient Balance:</strong> You have{' '}
            {balanceNum.toFixed(2)} XLM, but need at least{' '}
            {minBalanceRequired.toFixed(2)} XLM to mint an NFT.
          </p>
          <p className="text-xs text-yellow-700">
            This covers the 0.01 XLM payment, transaction fees (~
            {estimatedFee.toFixed(5)} XLM), and the minimum balance that must
            remain ({minBalanceAfterTransfer.toFixed(1)} XLM) as required by the
            native token contract.
          </p>
        </div>
      )}

      <button
        onClick={handleMint}
        disabled={
          isLoading ||
          !contractAddress ||
          !address ||
          needsFunding ||
          !hasEnoughBalance
        }
        className="w-full h-[40px] bg-[#FFE600] text-[#131313] rounded-full font-pleasure hover:bg-[#FFD700] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {isLoading ? 'Processing...' : ctaLabel}
      </button>
    </div>
  );
};

export default MintNFT;
