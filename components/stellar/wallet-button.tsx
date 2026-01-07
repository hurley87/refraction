"use client";

import { useState } from "react";
import { useWallet } from "@/lib/stellar/hooks/use-wallet";
import { connectWallet, disconnectWallet } from "@/lib/stellar/utils/wallet";

export const WalletButton = () => {
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const { address, isPending, balances } = useWallet();
  const buttonLabel = isPending ? "Loading..." : "Connect";

  if (!address) {
    return (
      <button
        className="px-4 py-2 bg-[#FFE600] text-[#131313] rounded-lg font-medium hover:bg-[#FFD700] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={() => void connectWallet()}
        disabled={isPending}
      >
        {buttonLabel}
      </button>
    );
  }

  return (
    <div
      className="flex flex-row items-center gap-2"
      style={{ opacity: isPending ? 0.6 : 1 }}
    >
      <span className="text-sm text-white">
        Wallet Balance: {balances?.xlm?.formattedBalance ?? balances?.xlm?.balance ?? "-"} XLM
      </span>

      {showDisconnectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] rounded-lg p-6 max-w-md w-full mx-4 border border-[#313131]">
            <h3 className="text-lg font-semibold text-white mb-4">
              Connected as{" "}
              <code className="text-xs break-all text-[#FFE600]">{address}</code>.
              Do you want to disconnect?
            </h3>
            <div className="flex gap-3 justify-end">
              <button
                className="px-4 py-2 bg-[#FFE600] text-[#131313] rounded-lg font-medium hover:bg-[#FFD700] transition-colors"
                onClick={() => {
                  void disconnectWallet().then(() =>
                    setShowDisconnectModal(false),
                  );
                }}
              >
                Disconnect
              </button>
              <button
                className="px-4 py-2 bg-[#313131] text-white rounded-lg font-medium hover:bg-[#404040] transition-colors"
                onClick={() => {
                  setShowDisconnectModal(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFE600] to-[#FFD700] flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => setShowDisconnectModal(true)}
        title={address}
      >
        <span className="text-[#131313] font-semibold text-sm">
          {address.slice(0, 2).toUpperCase()}
        </span>
      </div>
    </div>
  );
};
