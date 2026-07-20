'use client';

import Link from 'next/link';
import { toast } from 'sonner';

function explorerIsMainnet(
  network?: string | null,
  networkPassphrase?: string | null
): boolean {
  const n = network?.trim().toUpperCase() ?? '';
  if (n === 'PUBLIC' || n === 'MAINNET') return true;
  if (
    n === 'TESTNET' ||
    n === 'FUTURENET' ||
    n === 'LOCAL' ||
    n === 'STANDALONE'
  ) {
    return false;
  }

  const p = networkPassphrase ?? '';
  if (p.includes('Public Global Stellar Network')) return true;
  if (p.includes('Test SDF Network')) return false;
  if (p.includes('Public') && !p.includes('Test')) return true;

  const env =
    typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_STELLAR_NETWORK?.toUpperCase()
      : undefined;
  return env === 'PUBLIC' || env === 'MAINNET';
}

interface TransactionStatusProps {
  status: 'idle' | 'pending' | 'success' | 'error';
  txHash: string | null;
  error: string | null;
  successMessage: string;
  pendingMessage?: string;
  network?: string;
  networkPassphrase?: string;
  tokenId?: number | null;
  contractId?: string | null;
}

export function TransactionStatus({
  status,
  txHash,
  error,
  successMessage,
  pendingMessage = 'Confirm transaction in your wallet...',
  network,
  networkPassphrase,
  tokenId,
  contractId,
}: TransactionStatusProps) {
  const getExplorerUrl = (hash: string): string => {
    const isMainnet = explorerIsMainnet(network, networkPassphrase);
    const baseUrl = isMainnet
      ? 'https://stellar.expert/explorer/public'
      : 'https://stellar.expert/explorer/testnet';
    return `${baseUrl}/tx/${hash}`;
  };

  if (status === 'idle') {
    return null;
  }

  if (status === 'success' && txHash) {
    return (
      <div className="rounded-lg border border-[#EDEDED] bg-[#EDEDED]/40 p-4">
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-[#16a34a]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="mb-2 text-sm font-medium text-[#171717]">
              {successMessage}
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="min-w-[80px] text-xs font-medium text-[#757575]">
                  Transaction:
                </span>
                <Link
                  href={getExplorerUrl(txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 break-all font-mono text-xs text-[#171717] hover:underline"
                  title="View transaction on Stellar Explorer"
                >
                  {txHash}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(txHash);
                    toast.success('Transaction hash copied!');
                  }}
                  className="flex-shrink-0 cursor-pointer rounded p-1 transition-colors hover:bg-black/5"
                  title="Copy transaction hash"
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
              {contractId && (
                <div className="flex items-center gap-2">
                  <span className="min-w-[80px] text-xs font-medium text-[#757575]">
                    Contract ID:
                  </span>
                  <span className="flex-1 break-all font-mono text-xs text-[#171717]">
                    {contractId}
                  </span>
                </div>
              )}
              {tokenId !== null && tokenId !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="min-w-[80px] text-xs font-medium text-[#757575]">
                    Token ID:
                  </span>
                  <span className="flex-1 font-mono text-xs text-[#171717]">
                    {tokenId}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="rounded-lg border border-[#EDEDED] bg-[#EDEDED]/40 p-4">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-[#171717]" />
          <p className="text-sm text-[#757575]">{pendingMessage}</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="mb-1 text-sm font-medium text-red-700">
          Transaction failed
        </p>
        {error && <p className="text-xs text-[#757575]">{error}</p>}
      </div>
    );
  }

  return null;
}
