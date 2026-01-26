'use client';

import { useState } from 'react';
import { WalletProvider } from '@/lib/stellar/providers/wallet-provider';
import { NotificationProvider } from '@/lib/stellar/providers/notification-provider';
import MapNav from '@/components/map/mapnav';
import ConnectAccount from './connect-account';
import MintNFT from './mint-nft';
import ClaimPoints from './claim-points';
import { TransactionStatus } from './transaction-status';
import { useWallet } from '@/lib/stellar/hooks/use-wallet';
import NetworkPill from './network-pill';
import { stellarNetwork } from '@/lib/stellar/utils/network';

function StellarWalletPageContent() {
  const { network } = useWallet();
  const [ticketTxHash, setTicketTxHash] = useState<string | null>(null);
  const [rewardTxHash, setRewardTxHash] = useState<string | null>(null);
  const [ticketStatus, setTicketStatus] = useState<
    'idle' | 'pending' | 'success' | 'error'
  >('idle');
  const [rewardStatus, setRewardStatus] = useState<
    'idle' | 'pending' | 'success' | 'error'
  >('idle');
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [rewardError, setRewardError] = useState<string | null>(null);

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
          {/* Wallet Connection */}
          <div className="bg-white/20 backdrop-blur-md rounded-[26px] p-4 border border-white/30">
            <ConnectAccount />
          </div>

          {/* Feature Cards - Transactions & Tickets */}
          <div className="space-y-2">
            {/* Transactions Card */}
            <div className="bg-white rounded-[26px] p-4">
              <div className="flex flex-col gap-2">
                <h2 className="title2 text-[#313131] font-grotesk">
                  Transactions
                </h2>
                <p className="body-medium text-[#7D7D7D] font-grotesk">
                  Fast, low-cost transactions settle in seconds on Stellar,
                  powering payments and rewards across IRL events.
                </p>
              </div>
            </div>

            {/* Tickets & NFTs Card */}
            <div className="bg-white rounded-[26px] p-4">
              <div className="flex flex-col gap-2">
                <h2 className="title2 text-[#313131] font-grotesk">
                  Tickets & NFTs
                </h2>
                <p className="body-medium text-[#7D7D7D] font-grotesk">
                  Tickets and passes are issued on Stellar as digital assets —
                  collect your ticket, check in, and carry it with you to the
                  next event.
                </p>
              </div>
            </div>
          </div>

          {/* Step 1: Buy Ticket */}
          <div className="bg-white rounded-[26px] p-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#FFE600] flex items-center justify-center">
                  <span className="text-[#131313] font-bold text-sm">1</span>
                </div>
                <h2 className="title2 text-[#313131] font-grotesk">
                  Buy Ticket
                </h2>
              </div>

              <MintNFT
                ctaLabel="Buy Ticket"
                onPending={() => {
                  setTicketStatus('pending');
                  setTicketTxHash(null);
                  setTicketError(null);
                }}
                onSuccess={(txHash) => {
                  setTicketStatus('success');
                  setTicketTxHash(txHash);
                }}
                onError={(errorMsg) => {
                  setTicketStatus('error');
                  setTicketTxHash(null);
                  setTicketError(errorMsg);
                }}
              />

              <TransactionStatus
                status={ticketStatus}
                txHash={ticketTxHash}
                error={ticketError}
                successMessage="Ticket purchased successfully!"
                network={network}
              />
            </div>
          </div>

          {/* Step 2: Claim Points */}
          <div className="bg-white rounded-[26px] p-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#FFE600] flex items-center justify-center">
                  <span className="text-[#131313] font-bold text-sm">2</span>
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
