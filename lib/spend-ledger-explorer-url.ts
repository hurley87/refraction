import type { SpendRail } from '@/lib/types';

const EVM_TX_HASH_RE = /^0x[a-fA-F0-9]{64}$/;

function isCanonicalBaseTxHash(value: string): boolean {
  return EVM_TX_HASH_RE.test(value.trim());
}

/** Human-readable network label stored on ledger snapshot rows. */
export function spendLedgerNetworkLabel(spendRail: SpendRail): string {
  return spendRail === 'stellar_usdc' ? 'Stellar' : 'Base';
}

/**
 * Canonical explorer URL for a ledger tx hash on a spend rail, or null when unknown / non-canonical
 * (e.g. `pending:` placeholders, unrecognized hash shapes).
 *
 * EVM-shaped hashes (0x + 64 hex) use BaseScan — current treasury / payment confirmation paths are Base-on-chain
 * even when the spend experience rail is Stellar for other operations.
 */
export function explorerTxUrlForSpendLedger(
  spendRail: SpendRail,
  txHash: string | null | undefined
): string | null {
  const raw = txHash?.trim();
  if (!raw || raw.toLowerCase().startsWith('pending:')) {
    return null;
  }

  if (isCanonicalBaseTxHash(raw)) {
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
