"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createPublicClient, createWalletClient, custom, parseAbi } from "viem";
import { sepolia } from "viem/chains";

const ERC20_ABI = parseAbi([
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
]);

interface TransferTokensProps {
  tokenBalance: string;
  onTransferComplete?: () => void;
}

export default function TransferTokens({
  tokenBalance,
  onTransferComplete,
}: TransferTokensProps) {
  const { user } = usePrivy();
  const queryClient = useQueryClient();
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const userAddress = user?.wallet?.address;

  // Get token info
  const { data: tokenInfo } = useQuery({
    queryKey: ["token-info", userAddress],
    queryFn: async () => {
      if (!userAddress) return null;
      const response = await fetch(
        `/api/transfer-tokens?userAddress=${userAddress}`,
      );
      if (!response.ok) throw new Error("Failed to fetch token info");
      return response.json();
    },
    enabled: !!userAddress,
  });

  // Transfer mutation
  const transferMutation = useMutation({
    mutationFn: async ({
      to,
      amount,
    }: {
      to: string;
      amount: string;
    }) => {
      if (!userAddress) throw new Error("No wallet connected");
      if (!tokenInfo?.tokenAddress)
        throw new Error("No token address available");

      // Get the wallet provider from Privy
      const provider = await (window as any).ethereum;
      if (!provider) throw new Error("No wallet provider found");

      // Create wallet client with user's wallet
      const walletClient = createWalletClient({
        account: userAddress as `0x${string}`,
        chain: sepolia,
        transport: custom(provider),
      });

      // Convert amount to wei (assuming 18 decimals)
      const decimals = tokenInfo.decimals || 18;
      const amountInWei = BigInt(Math.floor(parseFloat(amount) * 10 ** decimals));

      // Execute transfer
      const hash = await walletClient.writeContract({
        address: tokenInfo.tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [to as `0x${string}`, amountInWei],
      });

      // Create public client to wait for transaction
      const publicClient = createPublicClient({
        chain: sepolia,
        transport: custom(provider),
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status !== "success") {
        throw new Error("Transaction failed");
      }

      return { hash, receipt };
    },
    onSuccess: () => {
      toast.success("Tokens transferred successfully!");
      setRecipientAddress("");
      setAmount("");
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["claim-status", userAddress] });
      queryClient.invalidateQueries({ queryKey: ["token-info", userAddress] });
      onTransferComplete?.();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to transfer tokens");
    },
  });

  const handleTransfer = async () => {
    if (!recipientAddress || !amount) {
      toast.error("Please fill in all fields");
      return;
    }

    // Basic address validation
    if (!/^0x[a-fA-F0-9]{40}$/.test(recipientAddress)) {
      toast.error("Invalid recipient address");
      return;
    }

    // Validate amount
    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      toast.error("Invalid amount");
      return;
    }

    const decimals = tokenInfo?.decimals || 18;
    const balanceInTokens = Number(tokenBalance) / 10 ** decimals;
    if (transferAmount > balanceInTokens) {
      toast.error("Insufficient balance");
      return;
    }

    transferMutation.mutate({ to: recipientAddress, amount });
  };

  const decimals = tokenInfo?.decimals || 18;
  const balanceInTokens = (Number(tokenBalance) / 10 ** decimals).toFixed(2);

  if (Number(tokenBalance) === 0) {
    return null;
  }

  return (
    <div className="w-full">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-[#313131] bg-white px-4 py-2 text-sm font-grotesk text-[#313131] transition hover:bg-[#F9F9F9]"
        >
          Transfer Tokens
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <polyline points="19 12 12 19 5 12"></polyline>
          </svg>
        </button>
      ) : (
        <div className="space-y-4 rounded-2xl border border-[#EDEDED] bg-white p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-grotesk font-semibold text-[#313131]">
              Transfer Tokens
            </h3>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[#7D7D7D] transition hover:text-[#313131]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-grotesk text-[#7D7D7D]">
                Recipient Address
              </label>
              <input
                type="text"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="0x..."
                className="w-full rounded-lg border border-[#EDEDED] bg-white px-3 py-2 font-mono text-sm text-[#313131] placeholder-[#CDCDCD] focus:border-[#313131] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-grotesk text-[#7D7D7D]">
                Amount (Balance: {balanceInTokens} RWDTKN)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  max={balanceInTokens}
                  className="flex-1 rounded-lg border border-[#EDEDED] bg-white px-3 py-2 font-grotesk text-sm text-[#313131] placeholder-[#CDCDCD] focus:border-[#313131] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setAmount(balanceInTokens)}
                  className="rounded-lg border border-[#313131] bg-white px-3 py-2 text-xs font-grotesk text-[#313131] transition hover:bg-[#F9F9F9]"
                >
                  Max
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTransfer}
              disabled={transferMutation.isPending}
              className="flex h-10 w-full items-center justify-center rounded-full bg-[#313131] px-4 py-2 font-grotesk text-sm text-white transition hover:bg-[#313131]/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50"
            >
              {transferMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Transferring...
                </span>
              ) : (
                "Transfer"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
