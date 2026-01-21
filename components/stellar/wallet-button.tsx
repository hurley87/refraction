'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { useWallet } from '@/lib/stellar/hooks/use-wallet';
import { connectWallet, disconnectWallet } from '@/lib/stellar/utils/wallet';
import { stellarNetwork } from '@/lib/stellar/utils/network';
import FundAccountButton from './fund-account-button';

export const WalletButton = () => {
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const { address, isPending, balances, network } = useWallet();
  const buttonLabel = isPending ? 'Loading...' : 'Connect';

  // Debug: Log balance and network to see what we're getting
  if (address) {
    console.log('[WalletButton] Balance:', balances?.xlm, 'Network:', network);
  }

  if (!address) {
    return (
      <button
        className="w-full px-4 py-2 bg-[#FFE600] text-[#131313] rounded-full font-medium hover:bg-[#FFD700] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={() => void connectWallet()}
        disabled={isPending}
      >
        {buttonLabel}
      </button>
    );
  }

  // Format balance to 2 decimal places (cents)
  const formatBalance = (balance: string | undefined): string => {
    if (!balance) return '-';
    // Remove commas before parsing
    const cleanedBalance = balance.replace(/,/g, '');
    const numBalance = parseFloat(cleanedBalance);
    if (isNaN(numBalance)) return '-';
    return numBalance.toFixed(2);
  };

  const displayBalance = formatBalance(
    balances?.xlm?.formattedBalance ?? balances?.xlm?.balance
  );

  const numBalance =
    displayBalance !== '-' ? parseFloat(displayBalance.replace(/,/g, '')) : 0;

  const currentNetwork = network?.toUpperCase() || stellarNetwork;

  return (
    <div
      className="flex flex-col gap-2 w-full"
      style={{ opacity: isPending ? 0.6 : 1 }}
    >
      <div className="flex flex-row items-center justify-between w-full">
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center gap-2">
            <Image
              src="/ep-coin-white.svg"
              alt="XLM"
              width={12}
              height={12}
              className="w-4 h-4"
            />
            <div className="body-small font-grotesk text-[#EDEDED] uppercase tracking-wide">
              Wallet Balance
            </div>
          </div>
          <div className="flex justify-start">
            <div className="flex items-end gap-2">
              <div className="display1 text-white font-inktrap">
                {displayBalance !== '-' ? numBalance.toLocaleString() : '0'}
              </div>
              <div className="body-small text-white font-grotesk uppercase mb-1">
                XLM
              </div>
            </div>
          </div>
        </div>

        <div
          className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFE600] to-[#FFD700] flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setShowDisconnectModal(true)}
          title={address}
        >
          <span className="text-[#131313] font-semibold text-sm">
            {address.slice(-2).toUpperCase()}
          </span>
        </div>
      </div>

      {showDisconnectModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowDisconnectModal(false)}
        >
          <div
            className="bg-white rounded-[26px] border border-gray-200 p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Close Button */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#313131] font-inktrap">
                Wallet Settings
              </h3>
              <button
                onClick={() => setShowDisconnectModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close modal"
              >
                <X size={20} className="text-[#313131]" />
              </button>
            </div>

            {/* Wallet Info Card */}
            <div className="bg-white rounded-[26px] border border-gray-200 p-4 mb-4">
              <div className="flex flex-col gap-2">
                <div className="body-small font-grotesk text-[#7d7d7d] uppercase tracking-wide">
                  Connected Wallet
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs break-all text-[#313131] flex-1 min-w-0 font-mono">
                    {address}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(address);
                      toast.success('Address copied!');
                    }}
                    className="flex-shrink-0 p-1 hover:bg-gray-100 rounded transition-colors"
                    title="Copy address"
                  >
                    <svg
                      className="w-4 h-4 text-[#313131]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Disconnect Button */}
            <button
              className="w-full h-[40px] bg-[#EDEDED] hover:bg-gray-100 text-[#313131] px-4 rounded-full font-pleasure transition-colors duration-200 flex items-center justify-between"
              onClick={() => {
                void disconnectWallet().then(() =>
                  setShowDisconnectModal(false)
                );
              }}
            >
              <span>Disconnect Wallet</span>
              <Image
                src="/log-out.svg"
                alt="disconnect"
                width={24}
                height={24}
                className="w-6 h-6"
              />
            </button>
          </div>
        </div>
      )}

      {/* Fund Account Button */}
      {currentNetwork !== 'PUBLIC' && (
        <div className="w-full">
          <FundAccountButton />
        </div>
      )}
    </div>
  );
};
