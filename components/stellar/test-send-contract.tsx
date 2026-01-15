"use client";

import React, { useState } from "react";
import { useWallet } from "@/lib/stellar/hooks/use-wallet";
import { useNotification } from "@/lib/stellar/hooks/use-notification";
import { invokePaymentContract, invokeContract, isValidAddress, isValidContractAddress } from "@/lib/stellar/utils/soroban";
import FundAccountButton from "./fund-account-button";
import { toast } from "sonner";

const TestSendContract: React.FC = () => {
  const { address, networkPassphrase, accountExists, balances } = useWallet();
  const { addNotification } = useNotification();
  // Fixed contract address
  const contractAddress = "CBPPHUSZS6B76X7NPJY76FQ3ZHGYFXVC4YJSOR2HAYNVEXVQZIJJCFAG";
  // Fixed amount: 1 XLM
  const amount = 1;
  // Recipient is the connected user's address
  const recipientAddress = address || "";
  const [functionName, setFunctionName] = useState("send");
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
  const needsFunding = (!accountExists && !hasBalance) || (accountExists && !hasBalance);

  const handleSend = async () => {
    // Validate inputs
    if (!isValidContractAddress(contractAddress)) {
      toast.error(
        "Invalid contract address format. " +
        "Contract addresses must start with 'C' and be 56 characters long, " +
        "or be a valid Stellar address starting with 'G'."
      );
      return;
    }

    if (!recipientAddress) {
      toast.error("Recipient address is required. Please connect your wallet.");
      return;
    }

    if (!isValidAddress(recipientAddress)) {
      toast.error("Invalid recipient address format");
      return;
    }

    setIsLoading(true);
    try {
      // Convert XLM to stroops (1 XLM = 10,000,000 stroops)
      const stroops = BigInt(Math.floor(amount * 10_000_000));
      
      // Try direct invoke first if function name is specified, otherwise use payment contract helper
      let txHash: string;
      if (functionName.trim()) {
        // Direct invoke with specified function name
        txHash = await invokeContract(
          contractAddress,
          functionName.trim(),
          [recipientAddress, stroops],
          address,
          networkPassphrase,
        );
      } else {
        // Use payment contract helper that tries multiple function names
        txHash = await invokePaymentContract(
          contractAddress,
          recipientAddress,
          amount,
          address,
          networkPassphrase,
        );
      }

      toast.success(`Transaction sent! Hash: ${txHash}`);
      addNotification(`Transaction sent successfully: ${txHash}`, "success");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      
      // Provide helpful message for account not found errors
      if (errorMessage.includes("Account not found") || errorMessage.includes("not found")) {
        toast.error(
          "Account not found or not funded. Please fund your account first using the 'Fund Account' button.",
          { duration: 5000 }
        );
        addNotification(
          "Account not found or not funded. Please fund your account before invoking contracts.",
          "error"
        );
      } else {
        toast.error(`Transaction failed: ${errorMessage}`);
        addNotification(`Transaction failed: ${errorMessage}`, "error");
      }
      console.error("Contract invocation error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white">Test Contract Send</h2>
      <p className="text-sm text-gray-400">
        Send XLM through a Soroban smart contract. Make sure the contract is deployed and funded.
      </p>

      {needsFunding && (
        <div className="p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm text-yellow-200 mb-1">
                <strong>Account needs funding:</strong> Your account must be funded with XLM before it can invoke contracts.
              </p>
              <p className="text-xs text-yellow-300/80 mb-2">
                Click the button below to fund your account using Friendbot (testnet only).
                {accountExists && !hasBalance && (
                  <span className="block mt-1">Note: Account exists but has no balance. You may need to refresh the page after funding.</span>
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
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Contract Address
          </label>
          <div className="w-full px-4 py-2 bg-[#131313] border border-[#313131] rounded-lg text-gray-400">
            {contractAddress}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Fixed contract address for payment operations
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Recipient Address
          </label>
          <div className="w-full px-4 py-2 bg-[#131313] border border-[#313131] rounded-lg text-gray-400">
            {recipientAddress || "Not connected"}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Your connected wallet address (will receive the XLM)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Function Name (optional)
          </label>
          <input
            type="text"
            value={functionName}
            onChange={(e) => setFunctionName(e.target.value)}
            placeholder="send"
            className="w-full px-4 py-2 bg-[#131313] border border-[#313131] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FFE600] transition-colors"
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Function name to call (e.g., &quot;send&quot;, &quot;transfer&quot;, &quot;pay&quot;). Leave empty to auto-detect.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Amount (XLM)
          </label>
          <div className="w-full px-4 py-2 bg-[#131313] border border-[#313131] rounded-lg text-gray-400">
            {amount} XLM
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Fixed amount: 1 XLM (will be converted to stroops automatically)
          </p>
        </div>

        <button
          onClick={handleSend}
          disabled={isLoading || !contractAddress || !recipientAddress}
          className="w-full px-4 py-2 bg-[#FFE600] text-[#131313] rounded-lg font-medium hover:bg-[#FFD700] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Sending..." : "Send via Contract"}
        </button>
      </div>

      <div className="mt-4 p-4 bg-[#131313] border border-[#313131] rounded-lg">
        <p className="text-xs text-gray-400">
          <strong className="text-gray-300">Note:</strong> The contract must be deployed and funded with XLM before it can send to recipients. 
          Make sure you&apos;re using the correct network (testnet/futurenet) that matches your contract deployment.
        </p>
      </div>
    </div>
  );
};

export default TestSendContract;
