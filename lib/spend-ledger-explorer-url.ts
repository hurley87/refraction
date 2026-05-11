import type { SpendRail } from '@/lib/types';

const EVM_TX_HASH_RE = /^0x[a-fA-F0-9]{64}$/;

/** `0x` + 64 hex digits (trimmed). Used for BaseScan links and payment hash gates. */
export function isLedgerCanonicalEvmTxHash(value: string): boolean {
  return EVM_TX_HASH_RE.test(value.trim());
}

export function spendLedgerNetworkLabel(spendRail: SpendRail): string {
  return spendRail === 'stellar_usdc' ? 'Stellar' : 'Base';
}

/**
 * Explorer URL for a ledger tx hash, or null for `pending:` / unknown shapes.
 * EVM-shaped hashes use BaseScan (treasury paths are Base today even when the experience rail is Stellar).
 */
export function explorerTxUrlForSpendLedger(
  spendRail: SpendRail,
  txHash: string | null | undefined
): string | null {
  const raw = txHash?.trim();
  if (!raw || raw.toLowerCase().startsWith('pending:')) {
    return null;
  }

  if (isLedgerCanonicalEvmTxHash(raw)) {
    return `https://basescan.org/tx/${raw.toLowerCase()}`;
  }

  if (spendRail === 'stellar_usdc') {
    const env = process.env.NEXT_PUBLIC_STELLAR_NETWORK?.toUpperCase();
    const base =
      env === 'TESTNET' || env === 'FUTURENET'
        ? 'https://stellar.expert/explorer/testnet'
        : 'https://stellar.expert/explorer/public';
    return `${base}/tx/${encodeURIComponent(raw)}`;
  }

  return null;
}
