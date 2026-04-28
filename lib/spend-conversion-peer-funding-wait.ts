import { getPointConversionBySessionId } from '@/lib/db/spend-sessions';
import type { PointConversion } from '@/lib/types';

const PEER_FUNDING_POLL_MS = 150;
const PEER_FUNDING_MAX_WAIT_MS = 60_000;

/**
 * After a concurrent confirm loses the DB race (`already_exists`), the winning request may still
 * be submitting the funding tx. Poll until `funding_tx_hash` appears or the row leaves
 * `points_deducted` without a hash.
 */
export async function waitForPeerFundingTxHash(
  sessionId: string
): Promise<PointConversion | null> {
  const deadline = Date.now() + PEER_FUNDING_MAX_WAIT_MS;
  while (Date.now() < deadline) {
    const row = await getPointConversionBySessionId(sessionId);
    if (!row) return null;
    if (row.status !== 'points_deducted' || row.funding_tx_hash != null) {
      return row;
    }
    await new Promise((r) => setTimeout(r, PEER_FUNDING_POLL_MS));
  }
  return getPointConversionBySessionId(sessionId);
}
