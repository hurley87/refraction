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
      className="flex w-full flex-col gap-3"
      style={{ opacity: isPending ? 0.6 : 1 }}
    >
      {walletSource === 'privy' && (
        <p className="body-small text-[#757575]">
          Embedded Stellar wallet (IRL / Privy)
        </p>
      )}

      <div className="flex w-full flex-row items-end justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-end gap-2">
          <Image
            src="/ep-coin-white.svg"
            alt=""
            width={12}
            height={12}
            className="mb-2 h-4 w-4 shrink-0 brightness-0"
            aria-hidden
          />
          <div className="flex min-w-0 items-baseline gap-2">
            <p
              className="m-0 truncate text-left text-[#171717]"
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
              className="m-0 shrink-0 leading-none text-[#757575]"
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

        <button
          type="button"
          className="flex h-10 min-w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#EDEDED] px-3 transition-opacity hover:opacity-90"
          onClick={() => setShowDisconnectModal(true)}
          title={address}
        >
          <span className="text-sm font-semibold text-[#171717]">
            {address.slice(-2).toUpperCase()}
          </span>
        </button>
      </div>

      {showDisconnectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowDisconnectModal(false)}
        >
          <div
            className="w-full max-w-md rounded-[26px] border border-[#131313]/10 bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex min-w-0 items-center justify-between gap-3">
              <h3 className="min-w-0 flex-1 font-medium text-[#171717]">
                Wallet Settings
              </h3>
              <button
                type="button"
                onClick={() => setShowDisconnectModal(false)}
                className="shrink-0 cursor-pointer rounded-full p-2 text-[#171717] transition-colors hover:bg-black/5"
                aria-label="Close modal"
              >
                <X size={20} aria-hidden />
              </button>
            </div>

            <div className="mb-4 rounded-[26px] border border-[#131313]/10 bg-[#EDEDED]/40 p-4">
              <div className="flex flex-col gap-2">
                <div className="body-small uppercase tracking-wide text-[#757575]">
                  {walletSource === 'freighter'
                    ? 'Connected Wallet'
                    : 'Embedded Stellar wallet'}
                </div>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 break-all font-mono text-xs text-[#171717]">
                    {address}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(address);
                      toast.success('Address copied!');
                    }}
                    className="flex-shrink-0 cursor-pointer rounded p-1 transition-colors hover:bg-black/5"
                    title="Copy address"
                  >
                    <svg
                      className="h-4 w-4 text-[#171717]"
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
                  <p className="pt-1 text-xs leading-snug text-[#757575]">
                    This address is tied to your IRL login (Privy).
                  </p>
                )}
              </div>
            </div>

            {walletSource === 'freighter' ? (
              <button
                type="button"
                className="label-large uppercase flex h-[44px] w-full cursor-pointer items-center justify-between bg-black py-2 pr-2 pl-4 text-white transition-colors hover:bg-neutral-900"
                onClick={() => {
                  void disconnectWallet().then(() =>
                    setShowDisconnectModal(false)
                  );
                }}
              >
                <span>Disconnect Wallet</span>
                <Image
                  src="/log-out.svg"
                  alt=""
                  width={24}
                  height={24}
                  className="h-6 w-6 shrink-0 invert"
                  aria-hidden
                />
              </button>
            ) : (
              <button
                type="button"
                className="label-large uppercase flex h-[44px] w-full cursor-pointer items-center justify-between bg-black py-2 pr-2 pl-4 text-white transition-colors hover:bg-neutral-900"
                onClick={() => setShowDisconnectModal(false)}
              >
                <span>Close</span>
                <Image
                  src="/guidance_up-right-2-short-arrow.svg"
                  alt=""
                  width={24}
                  height={24}
                  className="h-6 w-6 shrink-0"
                  aria-hidden
                />
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
