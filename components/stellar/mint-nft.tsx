"use client";

import React, { useState } from "react";
import { useWallet } from "@/lib/stellar/hooks/use-wallet";
import { useNotification } from "@/lib/stellar/hooks/use-notification";
import { mintNFT, isValidAddress, isValidContractAddress } from "@/lib/stellar/utils/soroban";
import { getNFTContractAddress } from "@/lib/stellar/utils/network";
import { toast } from "sonner";

const MintNFT: React.FC = () => {
  const { address, networkPassphrase, accountExists, balances } = useWallet();
  const { addNotification } = useNotification();
  const contractAddress = getNFTContractAddress();
  const [isLoading, setIsLoading] = useState(false);

  if (!address) {
    return (
      <div className="text-sm text-gray-400">
        Please connect your wallet to mint NFTs.
      </div>
    );
  }

  if (!contractAddress) {
    return (
      <div className="text-sm text-yellow-400">
        NFT contract address not configured. Please set NEXT_PUBLIC_NFT_CONTRACT_ADDRESS environment variable.
      </div>
    );
  }

  // Check if account exists and has balance
  const xlmBalance = balances?.xlm?.balance;
  const hasBalance = xlmBalance && Number(xlmBalance) > 0;
  const needsFunding = (!accountExists && !hasBalance) || (accountExists && !hasBalance);

  const handleMint = async () => {
    if (!isValidContractAddress(contractAddress)) {
      toast.error(
        "Invalid contract address format. " +
        "Contract addresses must start with 'C' and be 56 characters long, " +
        "or be a valid Stellar address starting with 'G'."
      );
      return;
    }

    if (!address) {
      toast.error("Please connect your wallet first.");
      return;
    }

    setIsLoading(true);
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
      addNotification(`NFT minted successfully: ${txHash}`, "success");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      
      if (errorMessage.includes("Account not found")) {
        toast.error(
          "Account not found or not funded. Please fund your account first.",
          { duration: 5000 }
        );
        addNotification(
          "Account not found or not funded. Please fund your account before minting NFTs.",
          "error"
        );
      } else {
        toast.error(`Minting failed: ${errorMessage}`);
        addNotification(`Minting failed: ${errorMessage}`, "error");
      }
      console.error("NFT minting error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white">Mint NFT</h2>
      <p className="text-sm text-gray-400">
        Mint a new NFT from the collection. Any user can mint NFTs. Cost: 1 XLM per NFT.
      </p>

      {needsFunding && (
        <div className="p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm text-yellow-200 mb-1">
                <strong>Account needs funding:</strong> Your account must be funded with XLM before it can invoke contracts.
              </p>
              <p className="text-xs text-yellow-300/80">
                Click the button below to fund your account using Friendbot (testnet only).
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <button
          onClick={handleMint}
          disabled={isLoading || !contractAddress || !address}
          className="w-full px-4 py-2 bg-[#FFE600] text-[#131313] rounded-lg font-medium hover:bg-[#FFD700] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Minting..." : "Mint NFT (1 XLM)"}
        </button>
      </div>

      <div className="mt-4 p-4 bg-[#131313] border border-[#313131] rounded-lg">
        <p className="text-xs text-gray-400">
          <strong className="text-gray-300">Note:</strong> Any user can mint NFTs. 
          Each mint requires a payment of 1 XLM to the contract address. 
          Make sure you&apos;re using the correct network (testnet/futurenet) that matches your contract deployment.
        </p>
      </div>
    </div>
  );
};

export default MintNFT;
