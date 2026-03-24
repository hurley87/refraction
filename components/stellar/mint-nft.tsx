'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWallet } from '@/lib/stellar/hooks/use-wallet';
import { useStellarWallet } from '@/hooks/useStellarWallet';
import { mintNFT, isValidContractAddress } from '@/lib/stellar/utils/soroban';
import {
  getNFTContractAddress,
  stellarNetwork,
} from '@/lib/stellar/utils/network';
import { fetchBalances } from '@/lib/stellar/utils/wallet';
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
  const {
    address: privyStellarAddress,
    connect: connectPrivyStellarWallet,
    isLoading: isPrivyWalletLoading,
    isConnecting: isPrivyWalletConnecting,
  } = useStellarWallet();
  const effectiveAddress = privyStellarAddress ?? address ?? undefined;
  /** When Privy has a Stellar address, it is the IRL profile key — use server mint and Privy balance even if Freighter is connected. */
  const primaryIsPrivy = Boolean(privyStellarAddress);
  const fallbackNetworkPassphrase =
    process.env.NEXT_PUBLIC_STELLAR_NETWORK?.toUpperCase() === 'PUBLIC' ||
    process.env.NEXT_PUBLIC_STELLAR_NETWORK?.toUpperCase() === 'MAINNET'
      ? 'Public Global Stellar Network ; September 2015'
      : 'Test SDF Network ; September 2015';
  const effectiveNetworkPassphrase =
    networkPassphrase ?? fallbackNetworkPassphrase;
  // Get contract address based on wallet's network (not app config)
  const contractAddress = getNFTContractAddress(effectiveNetworkPassphrase);
  const [isLoading, setIsLoading] = useState(false);

  const networkNameForBalance = network?.toUpperCase() || stellarNetwork;
  const { data: privyHorizon, isPending: isPrivyBalancePending } = useQuery({
    queryKey: [
      'mintNftPrivyBalance',
      privyStellarAddress,
      networkNameForBalance,
    ],
    queryFn: () => fetchBalances(privyStellarAddress!, networkNameForBalance),
    enabled: primaryIsPrivy && !!privyStellarAddress,
    staleTime: 30_000,
  });

  // Freighter: wallet context. Privy-only: Horizon via fetchBalances.
  const xlmBalance = balances?.xlm?.balance;
  const privyNative = privyHorizon?.balances?.xlm?.balance;
  const balanceNum = primaryIsPrivy
    ? Number(privyNative ?? 0)
    : Number(xlmBalance ?? 0);
  const hasBalance = balanceNum > 0;
  const needsFunding = primaryIsPrivy
    ? isPrivyBalancePending
      ? false
      : !(privyHorizon?.accountExists ?? false) || balanceNum <= 0
    : (!accountExists && !hasBalance) || (accountExists && !hasBalance);

  // 0.01 XLM to contract + fee (signer pays on Freighter path) + ≥1 XLM that
  // must remain after transfer (native SAC — same on testnet/mainnet).
  const isOnMainnet = effectiveNetworkPassphrase?.includes('Public');
  const mintCost = 0.01;
  const estimatedFee = isOnMainnet ? 0.01 : 0.00001;
  const minBalanceAfterTransfer = 1.0;
  const minBalanceRequired = mintCost + estimatedFee + minBalanceAfterTransfer;
  const hasEnoughBalance = balanceNum >= minBalanceRequired;
  const hasEnoughBalanceForMint = hasEnoughBalance;
  const needsFundingForMint = needsFunding;

  // Check if user is on testnet (Friendbot only works on testnet)
  const isOnTestnet =
    effectiveNetworkPassphrase?.includes('Test') &&
    !effectiveNetworkPassphrase?.includes('Future');

  const handleConnectForMint = async () => {
    // If Privy wallet exists/loads, avoid opening wallet selector.
    try {
      await connectPrivyStellarWallet();
    } catch {
      await connectWallet();
    }
  };

  const handleMint = async () => {
    if (!isValidContractAddress(contractAddress)) {
      const errorMsg =
        "Invalid contract address format. Contract addresses must start with 'C' and be 56 characters long, or be a valid Stellar address starting with 'G'.";
      toast.error(errorMsg);
      onError?.(errorMsg);
      return;
    }

    if (!effectiveAddress) {
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

    if (!effectiveNetworkPassphrase) {
      const errorMsg =
        'Network information not available. Please reconnect your wallet.';
      toast.error(errorMsg);
      onError?.(errorMsg);
      console.error('[MintNFT] networkPassphrase is undefined:', {
        address: effectiveAddress,
        network,
        networkPassphrase: effectiveNetworkPassphrase,
      });
      return;
    }

    // Check if user has enough balance before attempting mint
    if (!hasEnoughBalanceForMint) {
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
      if (primaryIsPrivy) {
        const response = await fetch('/api/mint-nft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress: effectiveAddress,
            networkPassphrase: effectiveNetworkPassphrase,
          }),
        });
        const data = await response.json();
        if (!response.ok || !data?.success) {
          throw new Error(data?.error || 'Minting failed');
        }
        const txHash = data?.data?.txHash as string | undefined;
        const tokenId = data?.data?.tokenId as number | undefined;
        const contractId = data?.data?.contractId as string | undefined;
        if (!txHash || tokenId === undefined || !contractId) {
          throw new Error('Minting succeeded but response was incomplete');
        }
        const successMessage = `NFT minted successfully!\n\nTransaction Hash: ${txHash}\nContract ID: ${contractId}\nToken ID: ${tokenId}`;
        toast.success(successMessage, { duration: 10000 });
        onSuccess?.({ txHash, tokenId, contractId });
        return;
      }

      // Mint NFT to the connected wallet address
      // The contract requires the recipient to authorize the transaction (sign it)
      // because the contract transfers 0.01 XLM from the recipient to the contract as payment.
      // The recipient is always the connected wallet (they're paying for their own mint).
      const result = await mintNFT(
        contractAddress,
        effectiveAddress, // Recipient is always the connected wallet
        effectiveAddress, // Signer is always the connected wallet
        effectiveNetworkPassphrase
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

  if (!effectiveAddress) {
    return (
      <div className="space-y-4">
        <p className="body-medium text-[#7D7D7D] font-grotesk">
          Check in and receive your ticket as a digital collectible.
        </p>
        <button
          className="w-full h-12 bg-white hover:bg-gray-100 text-[#313131] px-6 rounded-full title3 font-grotesk transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          onClick={() => void handleConnectForMint()}
          disabled={
            isPending || isPrivyWalletLoading || isPrivyWalletConnecting
          }
        >
          {isPending || isPrivyWalletLoading || isPrivyWalletConnecting
            ? 'Loading...'
            : 'Get Ticket'}
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
        Check in and receive your ticket as a digital collectible.
      </p>

      {needsFundingForMint && isOnTestnet && (
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
              <FundAccountButton
                {...(primaryIsPrivy && privyStellarAddress
                  ? {
                      fundAddress: privyStellarAddress,
                      fundAccountExists: privyHorizon?.accountExists,
                      fundXlmBalance: privyHorizon?.balances?.xlm?.balance,
                    }
                  : {})}
              />
            </div>
          </div>
        </div>
      )}

      {needsFundingForMint && !isOnTestnet && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Account needs funding:</strong> Your account must be funded
            with XLM before it can invoke contracts. Please fund your account
            using a Stellar wallet or exchange.
          </p>
        </div>
      )}

      {hasBalance &&
        !hasEnoughBalanceForMint &&
        !(primaryIsPrivy && isPrivyBalancePending) && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 mb-1">
              <strong>Insufficient Balance:</strong> You have{' '}
              {balanceNum.toFixed(2)} XLM, but need at least{' '}
              {minBalanceRequired.toFixed(2)} XLM to mint an NFT.
            </p>
            <p className="text-xs text-yellow-700">
              This covers the 0.01 XLM mint payment, transaction fees (~
              {estimatedFee.toFixed(5)} XLM on this network when you sign with
              Freighter), and at least {minBalanceAfterTransfer.toFixed(1)} XLM
              that must remain afterward (native token contract).
            </p>
          </div>
        )}

      <button
        onClick={handleMint}
        disabled={
          isLoading ||
          !contractAddress ||
          !effectiveAddress ||
          needsFundingForMint ||
          !hasEnoughBalanceForMint ||
          (primaryIsPrivy && isPrivyBalancePending)
        }
        className="w-full h-12 bg-white hover:bg-gray-100 text-[#313131] px-6 rounded-full title3 font-grotesk transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {isLoading ? 'Processing...' : ctaLabel}
      </button>
    </div>
  );
};

export default MintNFT;
