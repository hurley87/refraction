"use client";

import React, { useTransition } from "react";
import { useNotification } from "@/lib/stellar/hooks/use-notification";
import { useWallet } from "@/lib/stellar/hooks/use-wallet";
import { getFriendbotUrl } from "@/lib/stellar/utils/friendbot";

const FundAccountButton: React.FC = () => {
  const { addNotification } = useNotification();
  const [isPending, startTransition] = useTransition();
  const { address, balances, accountExists } = useWallet();

  if (!address) return null;

  // Only show if account doesn't exist or balance is 0
  const xlmBalance = balances?.xlm?.balance;
  const hasBalance = xlmBalance && Number(xlmBalance) > 0;
  
  // Don't show if account exists and has balance
  if (accountExists && hasBalance) return null;

  const handleFundAccount = () => {
    startTransition(async () => {
      try {
        const response = await fetch(getFriendbotUrl(address));

        if (response.ok) {
          addNotification("Account funded successfully!", "success");
        } else {
          const body: unknown = await response.json();
          if (
            body !== null &&
            typeof body === "object" &&
            "detail" in body &&
            typeof body.detail === "string"
          ) {
            addNotification(`Error funding account: ${body.detail}`, "error");
          } else {
            addNotification("Error funding account: Unknown error", "error");
          }
        }
      } catch {
        addNotification("Error funding account. Please try again.", "error");
      }
    });
  };

  return (
    <button
      className="px-4 py-2 bg-[#FFE600] text-[#131313] rounded-lg font-medium hover:bg-[#FFD700] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      disabled={isPending}
      onClick={handleFundAccount}
    >
      Fund Account
    </button>
  );
};

export default FundAccountButton;
