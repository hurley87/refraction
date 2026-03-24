'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import { WalletProvider } from '@/lib/stellar/providers/wallet-provider';
import { NotificationProvider } from '@/lib/stellar/providers/notification-provider';
import MapNav from '@/components/map/mapnav';
import ConnectAccount from './connect-account';
import { UserBalance } from './user-balance';
import MintNFT from './mint-nft';
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
  const hasStellarForBalance = Boolean(
    stellarWalletAddress || privyStellarAddress
  );
  const [ticketTxHash, setTicketTxHash] = useState<string | null>(null);
  const [ticketTokenId, setTicketTokenId] = useState<number | null>(null);
  const [ticketContractId, setTicketContractId] = useState<string | null>(null);
  const [rewardTxHash, setRewardTxHash] = useState<string | null>(null);
  const [ticketStatus, setTicketStatus] = useState<
    'idle' | 'pending' | 'success' | 'error'
  >('idle');
  const [rewardStatus, setRewardStatus] = useState<
    'idle' | 'pending' | 'success' | 'error'
  >('idle');
  const [ticketError, setTicketError] = useState<string | null>(null);
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
        effectiveLabel = 'MAINNET (Freighter / wallet kit passphrase)';
      } else if (isTestnetFromPassphrase) {
        effectiveLabel = 'TESTNET (Freighter / wallet kit passphrase)';
      } else {
        effectiveLabel = 'CUSTOM / OTHER (wallet passphrase set)';
      }
    } else {
      const u = envConfigured.toUpperCase();
      if (u === 'PUBLIC' || u === 'MAINNET') {
        effectiveLabel = `MAINNET (NEXT_PUBLIC_STELLAR_NETWORK=${envConfigured}, no wallet passphrase yet)`;
      } else {
        effectiveLabel = `TESTNET-LIKE (NEXT_PUBLIC_STELLAR_NETWORK=${envConfigured}, no wallet passphrase yet)`;
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
    <div
      style={{
        background: '#131313',
      }}
      className="min-h-screen px-2 pt-2 pb-4 font-grotesk cursor-auto"
    >
      <div className="max-w-md mx-auto">
        {/* Navigation */}
        <div className="pb-2 pt-2 flex items-center justify-between">
          <MapNav />
        </div>

        {/* Main Content */}
        <div className="px-0 pt-2 space-y-2">
          {/* IRL × Stellar Card */}
          <div className="bg-[#313131] rounded-[26px] overflow-hidden">
            <div className="relative w-full h-[340px] sm:h-[380px]">
              <div className="relative w-full h-full overflow-hidden rounded-b-[17px]">
                <Image
                  src="/stellar-banner.png"
                  alt="IRL × Stellar"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>
            <div className="flex flex-col items-center md:items-start gap-3 px-4 py-6 border-t border-white/25">
              <div className="flex w-full justify-center">
                <div className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-2 [filter:drop-shadow(0_0_10px_rgba(255,255,255,0.55))_drop-shadow(0_0_22px_rgba(255,255,255,0.28))]">
                  <Image
                    src="/IRL-SVG/$IRL_SECONDARY LOGO ICON_BLACK.svg"
                    alt="IRL"
                    width={130}
                    height={78}
                    className="h-[41.6px] w-auto object-contain brightness-0 invert"
                  />
                  <span
                    className="leading-none select-none text-white [font-size:1.95rem] [text-shadow:0_0_12px_rgba(255,255,255,0.55),0_0_24px_rgba(255,255,255,0.3)]"
                    aria-hidden
                  >
                    ×
                  </span>
                  <Image
                    src="/stellar-logo.png"
                    alt="Stellar"
                    width={156}
                    height={52}
                    className="h-[41.6px] w-auto object-contain"
                  />
                </div>
              </div>
              <p
                className="text-center md:text-left overflow-hidden text-ellipsis"
                style={{
                  color: 'var(--Dark-Tint-40, #B5B5B5)',
                  fontFamily:
                    '"ABC Monument Grotesk Semi-Mono Unlicensed Trial"',
                  fontSize: '13px',
                  fontStyle: 'normal',
                  fontWeight: 400,
                  lineHeight: '20px',
                  letterSpacing: '-0.26px',
                }}
              >
                IRL works with Stellar to bring cultural onchain experiences to
                real-world events — use your embedded IRL wallet (Privy) or
                connect Freighter to earn points towards future rewards.
              </p>
            </div>
          </div>

          {hasStellarForBalance && (
            <div className="bg-[#313131] rounded-[26px] p-4 border border-white/15">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Image
                    src="/homepage/ellipse.svg"
                    alt=""
                    width={24}
                    height={24}
                    className="shrink-0"
                  />
                  <h2
                    className="title5 text-white font-grotesk"
                    style={{
                      textShadow: 'rgba(255,255,255,0.7) 0px 0px 16px',
                    }}
                  >
                    Wallet Balance
                  </h2>
                </div>
                <UserBalance />
              </div>
            </div>
          )}

          {/* Step 1: Connect */}
          <div className="bg-[#313131] rounded-[26px] p-4 border border-white/15">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Image
                  src="/homepage/ellipse.svg"
                  alt=""
                  width={24}
                  height={24}
                  className="shrink-0"
                />
                <h2
                  className="title5 text-white font-grotesk"
                  style={{ textShadow: 'rgba(255,255,255,0.7) 0px 0px 16px' }}
                >
                  {hasStellarForBalance ? 'Connected' : 'Connect'}
                </h2>
              </div>
              {!hasStellarForBalance && (
                <p
                  className="text-[#B5B5B5]"
                  style={{
                    fontFamily:
                      '"ABC Monument Grotesk Semi-Mono Unlicensed Trial"',
                    fontSize: '13px',
                    fontStyle: 'normal',
                    fontWeight: 400,
                    lineHeight: '20px',
                    letterSpacing: '-0.26px',
                  }}
                >
                  {privyStellarAddress
                    ? 'Optionally connect Freighter if you prefer an external browser wallet.'
                    : 'Connect with Freighter, or sign in with IRL to use your embedded Stellar wallet.'}
                </p>
              )}
              <ConnectAccount />
            </div>
          </div>

          {/* Step 2: Bridge to Stellar (NEAR Intents) - collapsible */}
          <div className="bg-[#313131] rounded-[26px] overflow-hidden border border-white/15">
            <button
              type="button"
              onClick={() => setBridgeExpanded((v) => !v)}
              className="w-full flex items-center justify-between gap-2 py-4 px-4 text-white font-grotesk hover:bg-white/5 transition-colors cursor-pointer"
              aria-expanded={bridgeExpanded}
            >
              <div className="flex items-center gap-2">
                <Image
                  src="/homepage/ellipse.svg"
                  alt=""
                  width={24}
                  height={24}
                  className="shrink-0"
                />
                <h2
                  className="title5 text-white font-grotesk"
                  style={{ textShadow: 'rgba(255,255,255,0.7) 0px 0px 16px' }}
                >
                  Bridge to Stellar
                </h2>
              </div>
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-white transition-transform ${bridgeExpanded ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>
            {bridgeExpanded && (
              <div className="border-t border-white/15 px-4 pb-4 pt-2">
                <p className="body-medium text-[#B5B5B5] font-grotesk mb-4">
                  Move assets onto Stellar
                </p>
                <NearIntentsBridgeWidget
                  stellarAddressOverride={
                    privyStellarAddress ?? stellarWalletAddress ?? undefined
                  }
                  stellarNetworkOverride={network ?? undefined}
                />
              </div>
            )}
          </div>

          {/* Step 3: Get Ticket */}
          <div className="bg-[#313131] rounded-[26px] p-4 border border-white/15">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Image
                  src="/homepage/ellipse.svg"
                  alt=""
                  width={24}
                  height={24}
                  className="shrink-0"
                />
                <h2
                  className="title5 text-white font-grotesk"
                  style={{ textShadow: 'rgba(255,255,255,0.7) 0px 0px 16px' }}
                >
                  Get Ticket
                </h2>
              </div>

              <MintNFT
                ctaLabel="Get Ticket"
                onPending={() => {
                  setTicketStatus('pending');
                  setTicketTxHash(null);
                  setTicketTokenId(null);
                  setTicketContractId(null);
                  setTicketError(null);
                }}
                onSuccess={(result) => {
                  setTicketStatus('success');
                  setTicketTxHash(result.txHash);
                  setTicketTokenId(result.tokenId);
                  setTicketContractId(result.contractId);
                }}
                onError={(errorMsg) => {
                  setTicketStatus('error');
                  setTicketTxHash(null);
                  setTicketTokenId(null);
                  setTicketContractId(null);
                  setTicketError(errorMsg);
                }}
              />

              <TransactionStatus
                status={ticketStatus}
                txHash={ticketTxHash}
                error={ticketError}
                successMessage="Ticket received successfully!"
                network={network}
                networkPassphrase={networkPassphrase}
                tokenId={ticketTokenId}
                contractId={ticketContractId}
              />
            </div>
          </div>

          {/* Step 4: Claim Points */}
          <div className="bg-[#313131] rounded-[26px] p-4 border border-white/15">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Image
                  src="/homepage/ellipse.svg"
                  alt=""
                  width={24}
                  height={24}
                  className="shrink-0"
                />
                <h2
                  className="title5 text-white font-grotesk"
                  style={{ textShadow: 'rgba(255,255,255,0.7) 0px 0px 16px' }}
                >
                  Claim Points
                </h2>
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
            </div>
          </div>

          {/* Footer - Network Pill */}
          <div className="flex justify-end pt-2">
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
