'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import { WalletProvider } from '@/lib/stellar/providers/wallet-provider';
import { NotificationProvider } from '@/lib/stellar/providers/notification-provider';
import MapNav from '@/components/map/mapnav';
import ConnectAccount from './connect-account';
import MintNFT from './mint-nft';
import ClaimPoints from './claim-points';
import { NearIntentsBridgeWidget } from './near-intents-bridge-widget';
import { TransactionStatus } from './transaction-status';
import { useWallet } from '@/lib/stellar/hooks/use-wallet';
import NetworkPill from './network-pill';

function StellarWalletPageContent() {
  const { network, address: stellarWalletAddress } = useWallet();
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

  return (
    <div
      style={{
        background:
          'linear-gradient(0deg, rgba(0, 0, 0, 0.10) 0%, rgba(0, 0, 0, 0.10) 100%), linear-gradient(0deg, #EE91B7 0%, #FFE600 37.5%, #1BA351 66.34%, #61BFD1 100%)',
      }}
      className="min-h-screen px-2 pt-2 pb-4 font-grotesk"
    >
      <div className="max-w-md mx-auto">
        {/* Navigation */}
        <div className="pb-2 pt-2 flex items-center justify-between">
          <MapNav />
        </div>

        {/* Main Content */}
        <div className="px-0 pt-2 space-y-2">
          {/* IRL × Stellar Card */}
          <div className="bg-white rounded-[26px] overflow-hidden">
            <div className="relative w-full h-48">
              <Image
                src="/stellar-banner.jpg"
                alt="IRL × Stellar"
                fill
                className="object-cover"
                priority
              />
            </div>
            <div className="flex flex-col gap-2 p-4">
              <h2 className="title2 text-[#313131] font-grotesk">
                IRL × Stellar
              </h2>
              <p className="body-medium text-[#7D7D7D] font-grotesk">
                IRL works with Stellar to bring cultural onchain experiences to
                real-world events — check in, create a Privy-powered account,
                and earn points towards future rewards.
              </p>
            </div>
          </div>

          {/* Step 1: Connect */}
          <div className="bg-white rounded-[26px] p-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#FFE600] flex items-center justify-center">
                  <span className="text-[#131313] font-bold text-sm">1</span>
                </div>
                <h2 className="title2 text-[#313131] font-grotesk">Connect</h2>
              </div>
              <p className="body-medium text-[#7D7D7D] font-grotesk">
                Connect with email or wallet (Privy)
              </p>
              <ConnectAccount />
            </div>
          </div>

          {/* Step 2: Bridge to Stellar (NEAR Intents) - collapsible */}
          <div className="bg-white rounded-[26px] overflow-hidden">
            <button
              type="button"
              onClick={() => setBridgeExpanded((v) => !v)}
              className="w-full flex items-center justify-between gap-2 py-4 px-4 text-[#313131] font-grotesk hover:bg-gray-50/80 transition-colors"
              aria-expanded={bridgeExpanded}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#FFE600] flex items-center justify-center">
                  <span className="text-[#131313] font-bold text-sm">2</span>
                </div>
                <h2 className="title2 text-[#313131] font-grotesk">
                  Bridge to Stellar
                </h2>
              </div>
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-[#313131] transition-transform ${bridgeExpanded ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>
            {bridgeExpanded && (
              <div className="border-t border-gray-100 px-4 pb-4 pt-2">
                <p className="body-medium text-[#7D7D7D] font-grotesk mb-4">
                  Move assets onto Stellar
                </p>
                <NearIntentsBridgeWidget
                  stellarAddressOverride={stellarWalletAddress ?? undefined}
                  stellarNetworkOverride={network ?? undefined}
                />
              </div>
            )}
          </div>

          {/* Step 3: Get Ticket */}
          <div className="bg-white rounded-[26px] p-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#FFE600] flex items-center justify-center">
                  <span className="text-[#131313] font-bold text-sm">3</span>
                </div>
                <h2 className="title2 text-[#313131] font-grotesk">
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
                tokenId={ticketTokenId}
                contractId={ticketContractId}
              />
            </div>
          </div>

          {/* Step 4: Claim Points */}
          <div className="bg-white rounded-[26px] p-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#FFE600] flex items-center justify-center">
                  <span className="text-[#131313] font-bold text-sm">4</span>
                </div>
                <h2 className="title2 text-[#313131] font-grotesk">
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
