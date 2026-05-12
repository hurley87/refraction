import type { SpendRail } from '@/lib/types';

const EVM_TX_HASH_RE = /^0x[a-fA-F0-9]{64}$/;
const STELLAR_TX_HASH_RE = /^[a-fA-F0-9]{64}$/;

/** `0x` + 64 hex digits (trimmed). Used for explorer links and payment hash gates. */
export function isLedgerCanonicalEvmTxHash(value: string): boolean {
  return EVM_TX_HASH_RE.test(value.trim());
}

/** Stellar network transaction hash (32-byte hex, no `0x` prefix). */
export function isStellarTransactionHash(
  value: string | null | undefined
): boolean {
  const t = value?.trim();
  return !!t && STELLAR_TX_HASH_RE.test(t);
}

/** Ledger-confirmed funding tx reference for the given spend rail (IRL-16). */
export function isValidSpendConversionFundingTxReference(
  spendRail: SpendRail,
  ref: string
): boolean {
  const t = ref.trim();
  if (!t) return false;
  if (spendRail === 'base_usdc') return isLedgerCanonicalEvmTxHash(t);
  if (spendRail === 'stellar_usdc') return isStellarTransactionHash(t);
  return false;
}

export {
  spendLedgerNetworkLabel,
  formatExplorerTxUrlForSpendLedger as explorerTxUrlForSpendLedger,
} from '@/lib/spend-rail-config';
