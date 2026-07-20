'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ChevronDown } from 'lucide-react';

import { WalletProvider } from '@/lib/stellar/providers/wallet-provider';
import { NotificationProvider } from '@/lib/stellar/providers/notification-provider';
import MapNav, { MAP_NAV_MOBILE_FLUSH_X } from '@/components/map/mapnav';
import ConnectAccount from './connect-account';
import { UserBalance } from './user-balance';
import ClaimPoints from './claim-points';
import { NearIntentsBridgeWidget } from './near-intents-bridge-widget';
import { TransactionStatus } from './transaction-status';
import { useWallet } from '@/lib/stellar/hooks/use-wallet';
import { useStellarWallet } from '@/hooks/useStellarWallet';
import { stellarNetwork } from '@/lib/stellar/utils/network';
import NetworkPill from './network-pill';

function StellarWalletPageContent() {
  const {
    network,
    networkPassphrase,
    address: stellarWalletAddress,
  } = useWallet();
  const { address: privyStellarAddress } = useStellarWallet();
  const hasStellarForBalance = Boolean(privyStellarAddress);
  const [rewardTxHash, setRewardTxHash] = useState<string | null>(null);
  const [rewardStatus, setRewardStatus] = useState<
    'idle' | 'pending' | 'success' | 'error'
  >('idle');
  const [rewardError, setRewardError] = useState<string | null>(null);
  const [bridgeExpanded, setBridgeExpanded] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const envConfigured = process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? 'TESTNET';
    const isMainnetFromPassphrase =
      !!networkPassphrase &&
      (networkPassphrase.includes('Public') ||
        networkPassphrase.includes('Public Global Stellar Network'));
    const isTestnetFromPassphrase =
      !!networkPassphrase && networkPassphrase.includes('Test');

    let effectiveLabel: string;
    if (networkPassphrase) {
      if (isMainnetFromPassphrase) {
        effectiveLabel = 'MAINNET (wallet passphrase)';
      } else if (isTestnetFromPassphrase) {
        effectiveLabel = 'TESTNET (wallet passphrase)';
      } else {
        effectiveLabel = 'CUSTOM / OTHER (wallet passphrase set)';
      }
    } else {
      const u = envConfigured.toUpperCase();
      if (u === 'PUBLIC' || u === 'MAINNET') {
        effectiveLabel = `MAINNET (NEXT_PUBLIC_STELLAR_NETWORK=${envConfigured})`;
      } else {
        effectiveLabel = `TESTNET-LIKE (NEXT_PUBLIC_STELLAR_NETWORK=${envConfigured})`;
      }
    }

    console.debug('[Stellar /stellar] Network debug', {
      effectiveLabel,
      walletKitNetwork: network ?? null,
      walletKitPassphrasePrefix: networkPassphrase
        ? `${networkPassphrase.slice(0, 48)}…`
        : null,
      nextPublicStellarNetwork: envConfigured,
      buildTimeStellarNetwork: stellarNetwork,
      freighterAddress: stellarWalletAddress ?? null,
      privyStellarAddress: privyStellarAddress ?? null,
    });
  }, [network, networkPassphrase, stellarWalletAddress, privyStellarAddress]);

  return (
    <div className="min-h-screen bg-white px-4 pb-0 pt-4 font-grotesk">
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <MapNav className={MAP_NAV_MOBILE_FLUSH_X} />
          </div>
        </div>

        <div className="space-y-1 px-0 pt-2">
          {/* Hero — full-bleed image like rewards */}
          <div className="mb-1">
            <div className="relative mb-4 h-[340px] w-screen max-w-[100vw] overflow-hidden max-md:left-1/2 max-md:-translate-x-1/2 sm:h-[380px] md:left-auto md:aspect-[86/79] md:h-auto md:w-full md:translate-x-0">
              <Image
                src="/stellar-banner.jpg"
                alt="IRL × Stellar"
                fill
                className="object-cover"
                sizes="(max-width: 767px) 100vw, 448px"
                priority
              />
            </div>

            <div className="flex flex-col items-start gap-2 self-stretch pb-6">
         
              <h2 className="w-full self-stretch text-left font-medium text-[#171717]">
                IRL × Stellar
              </h2>
              <p className="body-small mb-2 w-full text-left text-[#757575]">
                Cultural onchain experiences for real-world events. Sign in with
                IRL to use your embedded Stellar wallet and earn points toward
                future rewards.
              </p>

              <div className="mb-2 flex h-5 min-w-0 items-center gap-2 self-stretch">
                <div className="flex h-5 shrink-0 items-center justify-center border border-[#171717] px-1 text-[#171717] label-small uppercase whitespace-nowrap">
                  Wallet
                </div>
                <span className="label-small uppercase text-[#171717]">
                  {hasStellarForBalance ? 'Connected' : 'Sign in required'}
                </span>
              </div>

              {!hasStellarForBalance && <ConnectAccount />}
            </div>
          </div>

          {hasStellarForBalance && (
            <section className="flex flex-col gap-4 border-t border-[var(--Text-Secondary-Text,#757575)] bg-white py-6">
              <p className="body-large text-black">WALLET BALANCE</p>
              <UserBalance />
            </section>
          )}

          <section className="border-t border-[var(--Text-Secondary-Text,#757575)] bg-white">
            <button
              type="button"
              onClick={() => setBridgeExpanded((v) => !v)}
              className="flex w-full cursor-pointer items-center justify-between gap-2 py-6 text-left transition-colors hover:bg-black/[0.02]"
              aria-expanded={bridgeExpanded}
            >
              <div className="flex min-w-0 flex-col gap-1">
                <p className="body-large text-black">BRIDGE TO STELLAR</p>
                <p className="body-small text-[#757575]">
                  Move assets onto Stellar
                </p>
              </div>
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-[#171717] transition-transform ${bridgeExpanded ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>
            {bridgeExpanded && (
              <div className="pb-6">
                <NearIntentsBridgeWidget
                  stellarAddressOverride={privyStellarAddress ?? undefined}
                  stellarNetworkOverride={network ?? undefined}
                />
              </div>
            )}
          </section>

          <section className="flex flex-col gap-4 border-t border-[var(--Text-Secondary-Text,#757575)] bg-white py-6">
            <div className="flex flex-col gap-1">
              <div className="body-large text-black">CLAIM POINTS</div>
              <p className="body-small text-[#757575]">
                Claim points for rewards. No XLM required — fees are covered.
              </p>
            </div>

            <ClaimPoints
              onPending={() => {
                setRewardStatus('pending');
                setRewardTxHash(null);
                setRewardError(null);
              }}
              onSuccess={(txHash) => {
                setRewardStatus('success');
                setRewardTxHash(txHash);
              }}
              onError={(errorMsg) => {
                setRewardStatus('error');
                setRewardTxHash(null);
                setRewardError(errorMsg);
              }}
            />

            <TransactionStatus
              status={rewardStatus}
              txHash={rewardTxHash}
              error={rewardError}
              successMessage="Points claimed successfully!"
              network={network}
              networkPassphrase={networkPassphrase}
            />
          </section>

          <div className="flex justify-end pt-4 pb-24">
            <NetworkPill />
          </div>
        </div>
      </div>
    </div>
  );
}

export function StellarWalletPage() {
  return (
    <NotificationProvider>
      <WalletProvider>
        <StellarWalletPageContent />
      </WalletProvider>
    </NotificationProvider>
  );
}
