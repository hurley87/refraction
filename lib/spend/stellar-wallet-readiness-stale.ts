const STALE_SUBMITTED_MS = 15 * 60 * 1000;

export const STELLAR_WALLET_READINESS_STALE_SUBMITTED_MS = STALE_SUBMITTED_MS;

function parseIsoMs(iso: unknown): number | null {
  if (typeof iso !== 'string') return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

/**
 * Whether submitted activation/trustline setup is older than the product stale window.
 * Used to move ambiguous on-ledger setup into `needs_review` (IRL-18).
 */
export function isStellarReadinessSubmittedMetadataStale(
  meta: Record<string, unknown>,
  nowMs: number = Date.now()
): boolean {
  const candidates: number[] = [];
  const a = parseIsoMs(meta.activation_tx_submitted_at);
  const b = parseIsoMs(meta.trustline_tx_submitted_at);
  if (a) candidates.push(a);
  if (b) candidates.push(b);
  if (candidates.length === 0) return false;
  const oldest = Math.min(...candidates);
  return nowMs - oldest > STALE_SUBMITTED_MS;
}
