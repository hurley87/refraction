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
  /** From Freighter / wallet kit; often unset when only Privy is used */
  network?: string;
  /** When `network` is missing (e.g. Privy-only), used with env to pick mainnet vs testnet explorer */
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
      <div className="p-4 bg-[#313131] border border-white/15 rounded-[18px]">
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0">
            <svg
              className="w-5 h-5 text-[#22c55e]"
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
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white mb-2">
              {successMessage}
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[#B5B5B5] min-w-[80px]">
                  Transaction:
                </span>
                <Link
                  href={getExplorerUrl(txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-white break-all font-mono hover:underline flex-1"
                  title="View transaction on Stellar Explorer"
                >
                  {txHash}
                </Link>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(txHash);
                    toast.success('Transaction hash copied!');
                  }}
                  className="flex-shrink-0 p-1 hover:bg-white/10 rounded transition-colors cursor-pointer"
                  title="Copy transaction hash"
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
              {contractId && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[#B5B5B5] min-w-[80px]">
                    Contract ID:
                  </span>
                  <span className="text-xs text-white break-all font-mono flex-1">
                    {contractId}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(contractId);
                      toast.success('Contract ID copied!');
                    }}
                    className="flex-shrink-0 p-1 hover:bg-white/10 rounded transition-colors cursor-pointer"
                    title="Copy contract ID"
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
              )}
              {tokenId !== null && tokenId !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[#B5B5B5] min-w-[80px]">
                    Token ID:
                  </span>
                  <span className="text-xs text-white font-mono flex-1">
                    {tokenId}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(String(tokenId));
                      toast.success('Token ID copied!');
                    }}
                    className="flex-shrink-0 p-1 hover:bg-white/10 rounded transition-colors cursor-pointer"
                    title="Copy token ID"
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
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="p-4 bg-[#313131] border border-white/15 rounded-[18px]">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#60a5fa]"></div>
          <p className="text-sm text-[#B5B5B5]">{pendingMessage}</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="p-4 bg-[#313131] border border-white/15 rounded-[18px]">
        <p className="text-sm font-medium text-[#f87171] mb-1">
          Transaction failed
        </p>
        {error && <p className="text-xs text-[#B5B5B5]">{error}</p>}
      </div>
    );
  }

  return null;
}
