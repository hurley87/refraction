'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useWallet } from '@/lib/stellar/hooks/use-wallet';
import { stellarNetwork } from '@/lib/stellar/utils/network';
import { switchNetwork } from '@/lib/stellar/utils/wallet';
import storage from '@/lib/stellar/utils/storage';
import { toast } from 'sonner';

// Format network name with first letter capitalized
const formatNetworkName = (name: string) => {
  if (!name) return '';
  // TODO: This is a workaround until @creit-tech/stellar-wallets-kit uses the new name for a local network.
  if (name === 'STANDALONE') return 'Local';
  // Handle "PUBLIC" -> "Mainnet" for better UX
  if (name.toUpperCase() === 'PUBLIC' || name.toUpperCase() === 'MAINNET')
    return 'Mainnet';
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
};

const NetworkPill: React.FC = () => {
  const { network, address } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Debug: Log network value to see what we're getting
  if (address && network) {
    console.log('[NetworkPill] Wallet network:', network);
  }

  // Show the wallet's network if connected, otherwise show app's default network
  const displayNetwork =
    address && network
      ? formatNetworkName(network)
      : formatNetworkName(stellarNetwork);

  const currentNetwork =
    address && network ? network.toUpperCase() : stellarNetwork.toUpperCase();

  let title = '';
  let color = '#2ED06E';

  if (!address) {
    title = `App is configured for ${formatNetworkName(stellarNetwork)}. Connect your wallet.`;
    color = '#C1C7D0';
  } else if (network) {
    // Show green when connected, regardless of network
    title = `Connected to ${displayNetwork}. Click to switch network.`;
    color = '#2ED06E';
  } else {
    title = 'Network information unavailable';
    color = '#C1C7D0';
  }

  const handleNetworkSwitch = async (targetNetwork: 'PUBLIC' | 'TESTNET') => {
    if (isSwitching) return;

    setIsSwitching(true);
    setIsOpen(false);

    try {
      if (address) {
        // Wallet is connected - try to switch network
        const walletId = storage.getItem('walletId');

        if (walletId === 'wallet_connect') {
          // For WalletConnect, we can't directly switch the wallet's network
          // Instead, update storage and trigger a re-detection
          const networkPassphrase =
            targetNetwork === 'PUBLIC'
              ? 'Public Global Stellar Network ; September 2015'
              : 'Test SDF Network ; September 2015';

          storage.setItem('walletNetwork', targetNetwork);
          storage.setItem('networkPassphrase', networkPassphrase);

          // Dispatch event to trigger wallet provider refresh
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('walletNetworkChanged', {
                detail: { network: targetNetwork, networkPassphrase },
              })
            );

            // Also trigger a wallet state update to refresh balances
            setTimeout(() => {
              window.dispatchEvent(
                new CustomEvent('walletConnected', {
                  detail: { walletId, address },
                })
              );
            }, 100);
          }

          toast.info(
            `Network preference updated to ${formatNetworkName(targetNetwork)}. ` +
              `Please switch your wallet app to ${formatNetworkName(targetNetwork)} to match.`
          );
        } else {
          // For Freighter and Hot-wallet, use the switchNetwork function
          // This will check the wallet's current network and prompt user if needed
          await switchNetwork(targetNetwork);
          toast.success(`Switched to ${formatNetworkName(targetNetwork)}`);
        }
      } else {
        // No wallet connected - just update preference
        const networkPassphrase =
          targetNetwork === 'PUBLIC'
            ? 'Public Global Stellar Network ; September 2015'
            : 'Test SDF Network ; September 2015';

        storage.setItem('walletNetwork', targetNetwork);
        storage.setItem('networkPassphrase', networkPassphrase);

        toast.success(
          `Network preference set to ${formatNetworkName(targetNetwork)}`
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to switch network';
      console.error('[NetworkPill] Network switch error:', error);
      toast.error(errorMessage);
    } finally {
      setIsSwitching(false);
    }
  };

  const networks: Array<{ value: 'PUBLIC' | 'TESTNET'; label: string }> = [
    { value: 'PUBLIC', label: 'Mainnet' },
    { value: 'TESTNET', label: 'Testnet' },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className={`bg-[#F0F2F5] text-[#4A5362] px-3 py-1 rounded-2xl text-xs font-bold flex items-center gap-1 cursor-pointer hover:bg-[#E0E2E5] transition-colors ${
          isSwitching ? 'opacity-50' : ''
        }`}
        onClick={() => {
          if (!isSwitching) {
            setIsOpen(!isOpen);
          }
        }}
        title={title}
      >
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: color }}
        />
        {displayNetwork}
        {!isSwitching && (
          <svg
            className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        )}
        {isSwitching && (
          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-[#E0E2E5] rounded-lg shadow-lg z-50 min-w-[120px] overflow-hidden">
          {networks.map((net) => {
            const isActive =
              currentNetwork === net.value ||
              (net.value === 'PUBLIC' &&
                (currentNetwork === 'MAINNET' || currentNetwork === 'PUBLIC'));

            return (
              <button
                key={net.value}
                onClick={() => handleNetworkSwitch(net.value)}
                disabled={isSwitching || isActive}
                className={`w-full px-4 py-2 text-left text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[#F0F2F5] text-[#4A5362] cursor-default'
                    : 'hover:bg-[#F8F9FA] text-[#4A5362] cursor-pointer'
                } ${isSwitching ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span>{net.label}</span>
                  {isActive && (
                    <svg
                      className="w-4 h-4 text-[#2ED06E]"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NetworkPill;
