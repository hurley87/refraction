'use client';

import Link from 'next/link';
import { toast } from 'sonner';

interface TransactionStatusProps {
  status: 'idle' | 'pending' | 'success' | 'error';
  txHash: string | null;
  error: string | null;
  successMessage: string;
  pendingMessage?: string;
  network?: string;
}

export function TransactionStatus({
  status,
  txHash,
  error,
  successMessage,
  pendingMessage = 'Confirm transaction in your wallet...',
  network,
}: TransactionStatusProps) {
  // Determine explorer URL based on network
  const getExplorerUrl = (hash: string): string => {
    const normalizedNetwork = network?.toUpperCase() || '';
    const isMainnet =
      normalizedNetwork === 'PUBLIC' || normalizedNetwork === 'MAINNET';
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
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0">
            <svg
              className="w-5 h-5 text-green-600"
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
            <p className="text-sm font-medium text-green-800 mb-1">
              {successMessage}
            </p>
            <div className="flex items-center gap-2">
              <Link
                href={getExplorerUrl(txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-green-700 break-all font-mono hover:underline"
                title="View transaction on Stellar Explorer"
              >
                {txHash}
              </Link>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(txHash);
                  toast.success('Transaction hash copied!');
                }}
                className="flex-shrink-0 p-1 hover:bg-green-100 rounded transition-colors"
                title="Copy transaction hash"
              >
                <svg
                  className="w-4 h-4 text-green-700"
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
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <p className="text-sm text-blue-800">{pendingMessage}</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm font-medium text-red-800 mb-1">
          Transaction failed
        </p>
        {error && <p className="text-xs text-red-700">{error}</p>}
      </div>
    );
  }

  return null;
}
