import type { SpendTransaction } from '@/lib/types';

/**
 * Builds a payment transaction explorer URL using a server-provided template.
 * Safe for client bundles (no env reads). Mirrors server substitution rules for spend payments.
 */
export function formatSpendPaymentExplorerUrl(
  explorerTxUrlTemplate: string | null | undefined,
  txHash: string | null | undefined
): string | null {
  const raw = txHash?.trim();
  if (!raw || raw.toLowerCase().startsWith('pending:')) {
    return null;
  }
  const tpl = explorerTxUrlTemplate?.trim();
  if (!tpl || !tpl.includes('{txHash}')) {
    return null;
  }
  const evmHash = /^0x[a-fA-F0-9]{64}$/.test(raw);
  if (evmHash) {
    return tpl.replace('{txHash}', raw.toLowerCase());
  }
  return tpl.replace('{txHash}', encodeURIComponent(raw));
}

/** True when the URL is a safe https target for an outbound receipt link. */
export function isSafeSpendExplorerHttpsUrl(
  raw: string | null | undefined
): boolean {
  const s = raw?.trim();
  if (!s) return false;
  try {
    const u = new URL(s);
    return u.protocol === 'https:';
  } catch {
    return false;
  }
}

export type ResolveSpendReceiptPaymentExplorerUrlInput = {
  /**
   * Prefer immutable execution snapshot explorer URL (IRL-6) when present and safe.
   * Checked before `persistedExplorerTxUrl`.
   */
  executionSnapshotExplorerTxUrl?: string | null;
  /** Canonical `spend_transactions.explorer_tx_url` when set-once in DB. */
  persistedExplorerTxUrl?: string | null;
  explorerTxUrlTemplate?: string | null;
  paymentTxHash?: string | null;
};

/**
 * Receipt / “View transaction” URL: prefer persisted or snapshot https URLs, else template + hash.
 */
export function resolveSpendReceiptPaymentExplorerUrl(
  input: ResolveSpendReceiptPaymentExplorerUrlInput
): string | null {
  const snapshot = input.executionSnapshotExplorerTxUrl?.trim();
  if (snapshot && isSafeSpendExplorerHttpsUrl(snapshot)) {
    return snapshot;
  }
  const persisted = input.persistedExplorerTxUrl?.trim();
  if (persisted && isSafeSpendExplorerHttpsUrl(persisted)) {
    return persisted;
  }
  return formatSpendPaymentExplorerUrl(
    input.explorerTxUrlTemplate,
    input.paymentTxHash
  );
}

/** Spend receipt primary line for payment row status (user-facing). */
export function spendReceiptPaymentStatusLabel(
  status: SpendTransaction['status'] | null | undefined
): string {
  switch (status) {
    case 'confirmed':
      return 'Complete';
    case 'pending':
    case 'submitted':
      return 'Confirming';
    case 'failed':
      return 'Could not verify';
    default:
      return 'Complete';
  }
}

/** Link text for spend receipt explorer anchors (product copy). */
export const SPEND_RECEIPT_EXPLORER_LINK_LABEL = 'View transaction';
