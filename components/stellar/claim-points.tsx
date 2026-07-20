'use client';

import React, { useState } from 'react';
import { useWallet } from '@/lib/stellar/hooks/use-wallet';
import { useStellarWallet } from '@/hooks/useStellarWallet';
import { useNotification } from '@/lib/stellar/hooks/use-notification';
import {
  isValidAddress,
  isValidContractAddress,
} from '@/lib/stellar/utils/soroban';
import { getSimplePaymentContractAddress } from '@/lib/stellar/utils/network';
import { toast } from 'sonner';
import Image from 'next/image';

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
  const { network, networkPassphrase } = useWallet();
  const {
    address: privyStellarAddress,
    connect: connectPrivyStellarWallet,
    isLoading: isPrivyWalletLoading,
    isConnecting: isPrivyWalletConnecting,
  } = useStellarWallet();
  const { addNotification } = useNotification();
  const effectiveAddress = privyStellarAddress ?? '';
  const fallbackNetworkPassphrase =
    process.env.NEXT_PUBLIC_STELLAR_NETWORK?.toUpperCase() === 'PUBLIC' ||
    process.env.NEXT_PUBLIC_STELLAR_NETWORK?.toUpperCase() === 'MAINNET'
      ? 'Public Global Stellar Network ; September 2015'
      : 'Test SDF Network ; September 2015';
  const effectiveNetworkPassphrase =
    networkPassphrase ?? fallbackNetworkPassphrase;
  // Get contract address based on wallet's network (not app config)
  const contractAddress = getSimplePaymentContractAddress(
    effectiveNetworkPassphrase
  );
  // Recipient is the connected user's address
  const recipientAddress = effectiveAddress;
  const [isLoading, setIsLoading] = useState(false);

  const handleConnectForClaim = async () => {
    await connectPrivyStellarWallet();
  };

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
        'Recipient address is required. Please sign in with IRL.';
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

    if (!effectiveNetworkPassphrase) {
      const errorMsg =
        'Network information not available. Please reconnect your wallet.';
      toast.error(errorMsg);
      onError?.(errorMsg);
      console.error('[ClaimPoints] networkPassphrase is undefined:', {
        address: effectiveAddress,
        network,
        networkPassphrase: effectiveNetworkPassphrase,
      });
      return;
    }

    setIsLoading(true);
    onPending?.();

    console.log('[ClaimPoints] Starting claim request:', {
      recipientAddress,
      contractAddress,
      networkPassphrase: effectiveNetworkPassphrase?.substring(0, 30) + '...',
    });

    try {
      const res = await fetch('/api/claim-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: recipientAddress,
          networkPassphrase: effectiveNetworkPassphrase ?? undefined,
        }),
      });

      console.log(
        '[ClaimPoints] API response status:',
        res.status,
        res.statusText
      );

      const data = await res.json();
      console.log('[ClaimPoints] API response data:', {
        success: data.success,
        hasTxHash: !!data.data?.txHash,
        txHash: data.data?.txHash,
        error: data.error,
        message: data.message,
        debug: data.debug, // Log debug info from API
      });

      // Log debug info separately for visibility
      if (data.debug) {
        console.log('[ClaimPoints] API debug info:', data.debug);
      }

      if (!data.success) {
        console.error('[ClaimPoints] API returned error:', {
          error: data.error,
          debug: data.debug,
          fullResponse: data,
        });
        // Include debug info in error message if available
        const errorMsg = data.debug
          ? `${data.error ?? 'Claim failed'}\n\nDebug info: ${JSON.stringify(data.debug, null, 2)}`
          : (data.error ?? 'Claim failed');
        throw new Error(errorMsg);
      }

      const txHash = data.data?.txHash;
      if (!txHash) {
        console.error('[ClaimPoints] No transaction hash in response:', {
          data,
          debug: data.debug,
        });
        const errorMsg = data.debug
          ? `No transaction hash returned. Debug: ${JSON.stringify(data.debug, null, 2)}`
          : 'No transaction hash returned';
        throw new Error(errorMsg);
      }

      console.log('[ClaimPoints] Success! Transaction hash:', txHash);
      toast.success(`Points claimed successfully! Transaction hash: ${txHash}`);
      addNotification(`Points claimed successfully: ${txHash}`, 'success');
      onSuccess?.(txHash);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      console.error('[ClaimPoints] Error caught:', {
        error,
        errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });

      if (
        errorMessage.includes('Account not found') ||
        errorMessage.includes('not found')
      ) {
        toast.error(
          'Claim failed: recipient account may be missing on this network. If this persists, contact support.',
          { duration: 5000 }
        );
        addNotification(
          'Claim failed: verify your Stellar address / network.',
          'error'
        );
      } else if (
        errorMessage.includes('insufficient') ||
        errorMessage.includes('no balance') ||
        errorMessage.includes('Contract has no balance')
      ) {
        toast.error(
          `The payment contract has insufficient token balance. It must hold the fungible token before rewards can be sent. Contract: ${contractAddress}`,
          { duration: 10000 }
        );
        addNotification(
          `Contract needs funding with the fungible token: ${contractAddress}`,
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

  if (!recipientAddress) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          className="label-large uppercase flex h-[44px] w-full cursor-pointer items-center justify-between bg-black py-2 pr-2 pl-4 text-white transition-colors hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => void handleConnectForClaim()}
          disabled={isPrivyWalletLoading || isPrivyWalletConnecting}
        >
          <span>
            {isPrivyWalletLoading || isPrivyWalletConnecting
              ? 'Loading...'
              : 'Sign in to claim'}
          </span>
          <Image
            src="/guidance_up-right-2-short-arrow.svg"
            alt=""
            width={24}
            height={24}
            className="h-6 w-6 shrink-0"
            aria-hidden
          />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={handleClaim}
        disabled={isLoading || !contractAddress || !recipientAddress}
        className="label-large uppercase flex h-[44px] w-full cursor-pointer items-center justify-between bg-black py-2 pr-2 pl-4 text-white transition-colors hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span>{isLoading ? 'Processing...' : 'Claim Points'}</span>
        <Image
          src="/guidance_up-right-2-short-arrow.svg"
          alt=""
          width={24}
          height={24}
          className="h-6 w-6 shrink-0"
          aria-hidden
        />
      </button>
    </div>
  );
};

export default ClaimPoints;
