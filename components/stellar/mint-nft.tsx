"use client";

import React, { useState } from "react";
import { useWallet } from "@/lib/stellar/hooks/use-wallet";
import { mintNFT, isValidContractAddress } from "@/lib/stellar/utils/soroban";
import { getNFTContractAddress } from "@/lib/stellar/utils/network";
import { toast } from "sonner";
import FundAccountButton from "./fund-account-button";

interface MintNFTProps {
  ctaLabel?: string;
  onPending?: () => void;
  onSuccess?: (txHash: string) => void;
  onError?: (error: string) => void;
}

const MintNFT: React.FC<MintNFTProps> = ({
  ctaLabel = "Mint NFT (1 XLM)",
  onPending,
  onSuccess,
  onError,
}) => {
  const { address, networkPassphrase, accountExists, balances } = useWallet();
  const contractAddress = getNFTContractAddress();
  const [isLoading, setIsLoading] = useState(false);

  // Check if account exists and has balance
  const xlmBalance = balances?.xlm?.balance;
  const hasBalance = xlmBalance && Number(xlmBalance) > 0;
  const needsFunding = (!accountExists && !hasBalance) || (accountExists && !hasBalance);

  const handleMint = async () => {
    if (!isValidContractAddress(contractAddress)) {
      const errorMsg = "Invalid contract address format. Contract addresses must start with 'C' and be 56 characters long, or be a valid Stellar address starting with 'G'.";
      toast.error(errorMsg);
      onError?.(errorMsg);
      return;
    }

    if (!address) {
      const errorMsg = "Please connect your wallet first.";
      toast.error(errorMsg);
      onError?.(errorMsg);
      return;
    }

    if (!contractAddress) {
      const errorMsg = "NFT contract address not configured. Please set NEXT_PUBLIC_NFT_CONTRACT_ADDRESS environment variable.";
      toast.error(errorMsg);
      onError?.(errorMsg);
      return;
    }

    setIsLoading(true);
    onPending?.();
    
    try {
      // Mint NFT to the connected wallet address
      // The contract requires the recipient to authorize the transaction (sign it)
      // because the contract transfers 1 XLM from the recipient to the contract as payment.
      // The recipient is always the connected wallet (they're paying for their own mint).
      const txHash = await mintNFT(
        contractAddress,
        address, // Recipient is always the connected wallet
        address, // Signer is always the connected wallet
        networkPassphrase,
      );

      toast.success(`NFT minted successfully! Transaction hash: ${txHash}`);
      onSuccess?.(txHash);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      
      if (errorMessage.includes("Account not found")) {
        toast.error(
          "Account not found or not funded. Please fund your account first.",
          { duration: 5000 }
        );
      } else {
        toast.error(`Minting failed: ${errorMessage}`);
      }
      console.error("NFT minting error:", error);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!address) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-sm text-gray-600">
          Please connect your wallet to buy a ticket.
        </p>
      </div>
    );
  }

  if (!contractAddress) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          NFT contract address not configured. Please set NEXT_PUBLIC_NFT_CONTRACT_ADDRESS environment variable.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="body-medium text-[#7D7D7D] font-grotesk">
        Purchase your event ticket as an NFT. Cost: 1 XLM per ticket.
      </p>

      {needsFunding && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex flex-col gap-3">
            <div className="flex-1">
              <p className="text-sm text-yellow-800 mb-1">
                <strong>Account needs funding:</strong> Your account must be funded with XLM before it can invoke contracts.
              </p>
              <p className="text-xs text-yellow-700">
                Click the button below to fund your account using Friendbot (testnet only).
              </p>
            </div>
            <div className="flex justify-start">
              <FundAccountButton />
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handleMint}
        disabled={isLoading || !contractAddress || !address || needsFunding}
        className="w-full h-[40px] bg-[#FFE600] text-[#131313] rounded-full font-pleasure hover:bg-[#FFD700] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {isLoading ? "Processing..." : ctaLabel}
      </button>
    </div>
  );
};

export default MintNFT;
