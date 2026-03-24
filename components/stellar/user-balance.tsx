'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useStellarWallet } from '@/hooks/useStellarWallet';
import { useWallet } from '@/lib/stellar/hooks/use-wallet';
import { disconnectWallet, fetchBalances } from '@/lib/stellar/utils/wallet';
import { stellarNetwork } from '@/lib/stellar/utils/network';
import FundAccountButton from './fund-account-button';

type WalletSource = 'freighter' | 'privy';

export const UserBalance = () => {
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const {
    address: freighterAddress,
    isPending: freighterPending,
    balances: freighterBalances,
    network,
    accountExists: freighterAccountExists,
  } = useWallet();
  const { address: privyAddress, isLoading: privyWalletLoading } =
    useStellarWallet();

  // Privy embedded address is the IRL profile / DB `stellar_wallet_address`; prefer it when both exist.
  const walletSource: WalletSource | null = privyAddress
    ? 'privy'
    : freighterAddress
      ? 'freighter'
      : null;

  const networkName = network?.toUpperCase() || stellarNetwork;

  const { data: privyHorizon, isPending: privyBalancePending } = useQuery({
    queryKey: ['stellarHorizonBalance', privyAddress, networkName],
    queryFn: () => fetchBalances(privyAddress!, networkName),
    enabled: walletSource === 'privy' && !!privyAddress,
    staleTime: 30_000,
    refetchInterval: 10_000,
  });

  if (!walletSource) return null;

  const address =
    walletSource === 'freighter' ? freighterAddress! : privyAddress!;
  const balances =
    walletSource === 'freighter'
      ? freighterBalances
      : (privyHorizon?.balances ?? {});
  const accountExists =
    walletSource === 'freighter'
      ? freighterAccountExists
      : (privyHorizon?.accountExists ?? true);
  const isPending =
    walletSource === 'freighter'
      ? freighterPending
      : privyWalletLoading || privyBalancePending;

  const formatBalance = (balance: string | undefined): string => {
    if (!balance) return '-';
    const cleanedBalance = balance.replace(/,/g, '');
    const numBalance = parseFloat(cleanedBalance);
    if (isNaN(numBalance)) return '-';
    return numBalance.toFixed(2);
  };

  const nativeBalanceEntry =
    balances?.xlm ??
    Object.values(balances ?? {}).find(
      (entry) => entry?.asset_type === 'native'
    );

  const displayBalance = formatBalance(
    nativeBalanceEntry?.formattedBalance ?? nativeBalanceEntry?.balance
  );

  const numBalance =
    displayBalance !== '-' ? parseFloat(displayBalance.replace(/,/g, '')) : 0;

  const currentNetwork = network?.toUpperCase() || stellarNetwork;
  const nativeBalanceRaw = nativeBalanceEntry?.balance;

  return (
    <div
      className="flex flex-col gap-3 w-full"
      style={{ opacity: isPending ? 0.6 : 1 }}
    >
      {walletSource === 'privy' && (
        <p className="body-small font-grotesk text-[#B5B5B5]">
          Embedded Stellar wallet (IRL / Privy)
        </p>
      )}

      <div className="flex flex-row items-end justify-between w-full gap-3">
        <div className="flex items-end gap-2 min-w-0 flex-1">
          <Image
            src="/ep-coin-white.svg"
            alt=""
            width={12}
            height={12}
            className="w-4 h-4 shrink-0 mb-2"
            aria-hidden
          />
          <div className="flex items-baseline gap-2 min-w-0">
            <p
              className="m-0 text-white text-center md:text-left truncate"
              style={{
                fontFamily: '"ABC Monument Grotesk Unlicensed Trial"',
                fontSize: '64px',
                fontStyle: 'normal',
                fontWeight: 400,
                lineHeight: '64px',
                letterSpacing: '-1.92px',
              }}
            >
              {displayBalance !== '-' ? numBalance.toLocaleString() : '-'}
            </p>
            <p
              className="m-0 shrink-0 text-[#B5B5B5] leading-none"
              style={{
                fontFamily: '"ABC Monument Grotesk Semi-Mono Unlicensed Trial"',
                fontSize: '13px',
                fontStyle: 'normal',
                fontWeight: 400,
                letterSpacing: '0.26px',
              }}
            >
              XLM
            </p>
          </div>
        </div>

        <div
          className="h-10 min-w-10 px-3 rounded-full bg-[#FFE600] flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity shrink-0"
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
            className="bg-[#313131] rounded-[26px] border border-white/15 p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-4 min-w-0">
              <h3
                className="title5 text-white font-grotesk min-w-0 flex-1"
                style={{ textShadow: 'rgba(255,255,255,0.7) 0px 0px 16px' }}
              >
                Wallet Settings
              </h3>
              <button
                type="button"
                onClick={() => setShowDisconnectModal(false)}
                className="shrink-0 p-2 rounded-full text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X size={20} className="text-white" aria-hidden />
              </button>
            </div>

            <div className="bg-black/25 rounded-[26px] border border-white/10 p-4 mb-4">
              <div className="flex flex-col gap-2">
                <div className="body-small font-grotesk text-[#B5B5B5] uppercase tracking-wide">
                  {walletSource === 'freighter'
                    ? 'Connected Wallet'
                    : 'Embedded Stellar wallet'}
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs break-all text-white flex-1 min-w-0 font-mono">
                    {address}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(address);
                      toast.success('Address copied!');
                    }}
                    className="flex-shrink-0 p-1 hover:bg-white/10 rounded transition-colors cursor-pointer"
                    title="Copy address"
                  >
                    <svg
                      className="w-4 h-4 text-white"
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
                {walletSource === 'privy' && (
                  <p className="text-xs text-[#B5B5B5] font-grotesk leading-snug pt-1">
                    {freighterAddress ? (
                      <>
                        This is your IRL embedded address (same as your
                        profile). Freighter is also connected for optional
                        browser-wallet flows.
                      </>
                    ) : (
                      <>
                        This address is tied to your IRL login (Privy). To use a
                        different Stellar account, connect Freighter in the
                        section below.
                      </>
                    )}
                  </p>
                )}
              </div>
            </div>

            {walletSource === 'freighter' ? (
              <button
                type="button"
                className="w-full min-w-0 h-12 bg-white hover:bg-gray-100 text-[#313131] px-4 sm:px-6 rounded-full title3 font-grotesk transition-colors duration-200 flex items-center gap-3 cursor-pointer"
                onClick={() => {
                  void disconnectWallet().then(() =>
                    setShowDisconnectModal(false)
                  );
                }}
              >
                <span className="min-w-0 flex-1 text-left leading-tight">
                  Disconnect Wallet
                </span>
                <Image
                  src="/log-out.svg"
                  alt=""
                  width={24}
                  height={24}
                  className="h-6 w-6 shrink-0"
                  aria-hidden
                />
              </button>
            ) : (
              <button
                type="button"
                className="w-full min-w-0 h-12 bg-white hover:bg-gray-100 text-[#313131] px-4 sm:px-6 rounded-full title3 font-grotesk transition-colors duration-200 cursor-pointer"
                onClick={() => setShowDisconnectModal(false)}
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}

      {currentNetwork !== 'PUBLIC' &&
        (walletSource === 'freighter' ? (
          <div className="w-full">
            <FundAccountButton />
          </div>
        ) : (
          <div className="w-full">
            <FundAccountButton
              fundAddress={address}
              fundAccountExists={accountExists}
              fundXlmBalance={nativeBalanceRaw}
            />
          </div>
        ))}
    </div>
  );
};
