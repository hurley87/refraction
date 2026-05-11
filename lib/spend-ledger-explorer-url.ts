const EVM_TX_HASH_RE = /^0x[a-fA-F0-9]{64}$/;

/** `0x` + 64 hex digits (trimmed). Used for explorer links and payment hash gates. */
export function isLedgerCanonicalEvmTxHash(value: string): boolean {
  return EVM_TX_HASH_RE.test(value.trim());
}

export {
  spendLedgerNetworkLabel,
  formatExplorerTxUrlForSpendLedger as explorerTxUrlForSpendLedger,
} from '@/lib/spend-rail-config';
