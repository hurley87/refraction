"use client";

import React, { useState, useEffect } from "react";
import { getNFTName, getNFTSymbol, getNFTTotalSupply, isValidContractAddress } from "@/lib/stellar/utils/soroban";
import { getNFTContractAddress } from "@/lib/stellar/utils/network";
import { toast } from "sonner";

const NFTCollectionInfo: React.FC = () => {
  const contractAddress = getNFTContractAddress();
  const [name, setName] = useState<string | null>(null);
  const [symbol, setSymbol] = useState<string | null>(null);
  const [totalSupply, setTotalSupply] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (contractAddress && isValidContractAddress(contractAddress)) {
      void loadCollectionInfo();
    }
  }, [contractAddress]);

  const loadCollectionInfo = async () => {
    if (!contractAddress || !isValidContractAddress(contractAddress)) {
      setError("Invalid contract address");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch collection metadata in parallel
      const errors: string[] = [];
      
      const [collectionName, collectionSymbol, supply] = await Promise.all([
        getNFTName(contractAddress).catch((err) => {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error("Error fetching name:", err);
          errors.push(`Name: ${errMsg}`);
          return null;
        }),
        getNFTSymbol(contractAddress).catch((err) => {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error("Error fetching symbol:", err);
          errors.push(`Symbol: ${errMsg}`);
          return null;
        }),
        getNFTTotalSupply(contractAddress).catch((err) => {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error("Error fetching total supply:", err);
          errors.push(`Total Supply: ${errMsg}`);
          return null;
        }),
      ]);

      console.log("Fetched collection info:", { collectionName, collectionSymbol, supply });

      setName(collectionName);
      setSymbol(collectionSymbol);
      setTotalSupply(supply);

      // Check if we got any valid data or if all failed
      if (collectionName === null && collectionSymbol === null && supply === null) {
        const errorDetails = errors.length > 0 ? errors.join("; ") : "Unknown error";
        setError(`Failed to load collection info: ${errorDetails}`);
        toast.error(`Failed to load collection info: ${errorDetails}`, { duration: 10000 });
      } else if (errors.length > 0) {
        // Some fields succeeded, but some failed
        const errorDetails = errors.join("; ");
        console.warn("Partial collection info loaded with errors:", errorDetails);
        toast.warning(`Some collection info failed to load: ${errorDetails}`, { duration: 8000 });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load collection info";
      setError(errorMessage);
      console.error("Error loading NFT collection info:", err);
      toast.error(`Failed to load collection info: ${errorMessage}`, { duration: 10000 });
    } finally {
      setIsLoading(false);
    }
  };

  if (!contractAddress) {
    return (
      <div className="text-sm text-yellow-400">
        NFT contract address not configured. Please set NEXT_PUBLIC_NFT_CONTRACT_ADDRESS environment variable.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">NFT Collection Info</h2>
        <button
          onClick={() => void loadCollectionInfo()}
          disabled={isLoading}
          className="px-3 py-1.5 text-xs bg-gray-700 text-gray-200 rounded hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-lg">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Contract Address
          </label>
          <div className="w-full px-4 py-2 bg-[#131313] border border-[#313131] rounded-lg text-gray-400 break-all">
            {contractAddress}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Collection Name
          </label>
          <div className="w-full px-4 py-2 bg-[#131313] border border-[#313131] rounded-lg text-gray-400">
            {isLoading ? (
              <span className="text-gray-500">Loading...</span>
            ) : name !== null ? (
              name
            ) : (
              <span className="text-gray-500">Not available</span>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Collection Symbol
          </label>
          <div className="w-full px-4 py-2 bg-[#131313] border border-[#313131] rounded-lg text-gray-400">
            {isLoading ? (
              <span className="text-gray-500">Loading...</span>
            ) : symbol !== null ? (
              symbol
            ) : (
              <span className="text-gray-500">Not available</span>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Total Supply
          </label>
          <div className="w-full px-4 py-2 bg-[#131313] border border-[#313131] rounded-lg text-gray-400">
            {isLoading ? (
              <span className="text-gray-500">Loading...</span>
            ) : totalSupply !== null ? (
              totalSupply.toString()
            ) : (
              <span className="text-gray-500">Not available</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Total number of NFTs minted in this collection
          </p>
        </div>
      </div>
    </div>
  );
};

export default NFTCollectionInfo;
