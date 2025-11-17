"use client";

import { useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createPublicClient, createWalletClient, custom, parseAbi } from "viem";
import { base } from "viem/chains";

const ERC20_ABI = parseAbi([
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
]);

interface TransferTokensProps {
  tokenBalance: string;
  onTransferComplete?: () => void;
  buttonClassName?: string;
  buttonFontFamily?: string;
  buttonText?: string;
}

export default function TransferTokens({
  tokenBalance,
  onTransferComplete,
  buttonClassName,
  buttonFontFamily,
  buttonText = "Transfer Tokens",
}: TransferTokensProps) {
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const queryClient = useQueryClient();
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [showFundingInfo, setShowFundingInfo] = useState(false);

  const userAddress = user?.wallet?.address;

  // Helper function to check if wallet is on Base network (without switching)
  const isOnBaseNetwork = async (): Promise<boolean> => {
    if (!userAddress) return false;

    try {
      const provider = await (window as any).ethereum;
      if (!provider) return false;

      const currentChainId = await provider.request({ method: "eth_chainId" });
      const currentChainIdNumber = parseInt(currentChainId, 16);

      return currentChainIdNumber === base.id;
    } catch (error) {
      console.error("Error checking network:", error);
      return false;
    }
  };

  // Helper function to ensure wallet is on Base network (with switching)
  const ensureBaseNetwork = async (): Promise<boolean> => {
    if (!userAddress) return false;

    const wallet = wallets.find((w) => w.address === userAddress) || wallets[0];
    if (!wallet) return false;

    try {
      // Check if already on Base
      const onBase = await isOnBaseNetwork();
      if (onBase) {
        return true;
      }

      // Switch to Base network
      try {
        await wallet.switchChain(base.id);
        toast.info("Switched to Base network");
        // Wait a bit for the chain switch to complete
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return true;
      } catch (switchError: any) {
        console.error("Failed to switch to Base network:", switchError);
        toast.error("Please switch to Base network in your wallet");
        return false;
      }
    } catch (error) {
      console.error("Error ensuring Base network:", error);
      return false;
    }
  };

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

  // Check ETH balance for gas
  const { data: ethBalance } = useQuery({
    queryKey: ["eth-balance", userAddress],
    queryFn: async () => {
      if (!userAddress) return null;

      // Verify wallet is on Base network before querying balance
      // Don't auto-switch here to avoid annoying users during balance checks
      const onBase = await isOnBaseNetwork();
      if (!onBase) {
        // Return null if not on Base - this will show as insufficient funds
        // User will need to switch network when they try to transfer
        return null;
      }

      const provider = await (window as any).ethereum;
      if (!provider) return null;

      const publicClient = createPublicClient({
        chain: base,
        transport: custom(provider),
      });

      const balance = await publicClient.getBalance({
        address: userAddress as `0x${string}`,
      });

      return balance;
    },
    enabled: !!userAddress,
    refetchInterval: 5000, // Refetch every 5 seconds to detect when user funds wallet
  });

  // Transfer mutation
  const transferMutation = useMutation({
    mutationFn: async ({ to, amount }: { to: string; amount: string }) => {
      if (!userAddress) throw new Error("No wallet connected");
      if (!tokenInfo?.tokenAddress)
        throw new Error("No token address available");

      // Ensure wallet is on Base network before performing transfer
      const isOnBase = await ensureBaseNetwork();
      if (!isOnBase) {
        throw new Error("Please switch to Base network in your wallet");
      }

      // Get the wallet provider from Privy
      const provider = await (window as any).ethereum;
      if (!provider) throw new Error("No wallet provider found");

      // Create wallet client with user's wallet
      const walletClient = createWalletClient({
        account: userAddress as `0x${string}`,
        chain: base,
        transport: custom(provider),
      });

      // Convert amount to wei (assuming 18 decimals)
      const decimals = tokenInfo.decimals || 18;
      const amountInWei = BigInt(
        Math.floor(parseFloat(amount) * 10 ** decimals),
      );

      // Execute transfer
      const hash = await walletClient.writeContract({
        address: tokenInfo.tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [to as `0x${string}`, amountInWei],
      });

      // Create public client to wait for transaction
      const publicClient = createPublicClient({
        chain: base,
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
      setShowFundingInfo(false);
      queryClient.invalidateQueries({
        queryKey: ["claim-status", userAddress],
      });
      queryClient.invalidateQueries({ queryKey: ["token-info", userAddress] });
      onTransferComplete?.();
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Failed to transfer tokens";
      toast.error(errorMessage);

      // If error is about insufficient funds, show funding info
      if (
        errorMessage.toLowerCase().includes("insufficient funds") ||
        errorMessage.toLowerCase().includes("insufficient balance") ||
        errorMessage.toLowerCase().includes("gas")
      ) {
        setShowFundingInfo(true);
      }
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

    const balanceInTokens =
      Number(tokenBalance) / 10 ** (tokenInfo?.decimals || 18);
    if (transferAmount > balanceInTokens) {
      toast.error("Insufficient balance");
      return;
    }

    transferMutation.mutate({ to: recipientAddress, amount });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Address copied to clipboard!");
    } catch {
      toast.error("Failed to copy address");
    }
  };

  const decimals = tokenInfo?.decimals || 18;
  const balanceInTokens = (Number(tokenBalance) / 10 ** decimals).toFixed(2);

  // Minimum ETH balance needed for gas (rough estimate: 0.0001 ETH)
  const minEthForGas = BigInt(100000000000000); // 0.0001 ETH in wei
  const hasEnoughEth = ethBalance ? ethBalance >= minEthForGas : false;

  if (Number(tokenBalance) === 0) {
    return null;
  }

  return (
    <div className="w-full">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={buttonClassName || "flex w-full items-center justify-center gap-2 rounded-full border border-[#313131] bg-white px-4 py-2 text-sm font-grotesk text-[#313131] transition hover:bg-[#F9F9F9]"}
        >
          <span
            style={
              buttonFontFamily
                ? { fontFamily: buttonFontFamily }
                : undefined
            }
          >
            {buttonText}
          </span>
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
              onClick={() => {
                setIsOpen(false);
                setShowFundingInfo(false);
              }}
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

          {showFundingInfo ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-[#FFE5B4] bg-[#FFF9E6] p-3">
                <div className="flex items-start gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#D97706"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-0.5 flex-shrink-0"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-grotesk font-semibold text-[#D97706]">
                      Insufficient ETH for Gas
                    </p>
                    <p className="mt-1 text-xs font-grotesk text-[#92400E]">
                      You need ETH on Base to pay for transaction fees. Send ETH
                      to your wallet address below.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-grotesk text-[#7D7D7D]">
                  Your Wallet Address
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-lg border border-[#EDEDED] bg-[#F9F9F9] px-3 py-2">
                    <p className="font-mono text-xs text-[#313131] break-all">
                      {userAddress}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(userAddress || "")}
                    className="flex-shrink-0 rounded-lg border border-[#313131] bg-white p-2 text-[#313131] transition hover:bg-[#F9F9F9]"
                    title="Copy address"
                  >
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
                      <rect
                        x="9"
                        y="9"
                        width="13"
                        height="13"
                        rx="2"
                        ry="2"
                      ></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-[#EDEDED] bg-[#F9F9F9] p-3">
                <p className="text-xs font-grotesk text-[#7D7D7D]">
                  <strong className="text-[#313131]">Note:</strong> Make sure to
                  send ETH on the{" "}
                  <strong className="text-[#313131]">Base network</strong>.
                  Sending on other networks will result in loss of funds.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowFundingInfo(false)}
                className="flex h-10 w-full items-center justify-center rounded-full border border-[#313131] bg-white px-4 py-2 font-grotesk text-sm text-[#313131] transition hover:bg-[#F9F9F9]"
              >
                Back to Transfer
              </button>
            </div>
          ) : (
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

              {!hasEnoughEth ? (
                <button
                  type="button"
                  onClick={() => setShowFundingInfo(true)}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[#D97706] px-4 py-2 font-grotesk text-sm text-white transition hover:bg-[#B45309] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97706]"
                >
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
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  Fund Wallet
                </button>
              ) : (
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
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
