"use client";

import { useMemo } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

interface ExportWalletButtonProps {
  className?: string;
  buttonText?: string;
}

export default function ExportWalletButton({
  className,
  buttonText = "Export Wallet",
}: ExportWalletButtonProps) {
  const { ready, authenticated, user, exportWallet } = usePrivy();

  const userAddress = user?.wallet?.address;
  const hasEmbeddedWallet = useMemo(
    () =>
      Boolean(
        user?.linkedAccounts?.some(
          (account) =>
            account.type === "wallet" &&
            account.walletClientType === "privy" &&
            account.chainType === "ethereum",
        ),
      ),
    [user?.linkedAccounts],
  );

  const isWalletReady = ready || Boolean(userAddress);

  const disabledReason = useMemo(() => {
    if (!isWalletReady && !authenticated) {
      return "Connecting to Privy...";
    }
    if (!authenticated) return "Log in to export your wallet.";
    if (!hasEmbeddedWallet || !userAddress)
      return "No embedded Privy wallet found to export.";
    return null;
  }, [isWalletReady, authenticated, hasEmbeddedWallet, userAddress]);

  const handleExportWallet = async () => {
    if (!isWalletReady) {
      toast.error("Still connecting to your wallet. Please try again in a moment.");
      return;
    }

    if (disabledReason) {
      toast.error(disabledReason);
      return;
    }

    try {
      await exportWallet({ address: userAddress as `0x${string}` });
      toast.success("Privy export modal opened. Copy your key securely.");
    } catch (error: any) {
      console.error("Failed to export wallet:", error);
      toast.error(error?.message || "Failed to export wallet. Please retry.");
    }
  };

  return (
    <button
      type="button"
      onClick={handleExportWallet}
      disabled={Boolean(disabledReason)}
      title={disabledReason ?? undefined}
      className={cn(
        "flex h-10 w-full items-center justify-center rounded-full border border-[#313131] bg-white px-4 py-2 font-grotesk text-sm text-[#313131] transition hover:bg-[#F9F9F9] disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      {buttonText}
    </button>
  );
}

