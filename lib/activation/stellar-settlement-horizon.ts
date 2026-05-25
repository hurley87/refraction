import type { Horizon } from '@stellar/stellar-sdk';
import { createStellarSpendHorizonServer } from '@/lib/spend/stellar-wallet-readiness-config';

const HORIZON_TX_POLL_ATTEMPTS = 8;
const HORIZON_TX_POLL_INTERVAL_MS = 1500;

export type HorizonTxPollResult = 'success' | 'failed' | 'pending';

function isRetryableHorizonTxLookupError(e: unknown): boolean {
  const status = (e as { response?: { status?: number } })?.response?.status;
  if (status === 404) return true;
  if (status === 429) return true;
  if (typeof status === 'number' && status >= 500 && status < 600) {
    return true;
  }
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  return (
    msg.includes('fetch') ||
    msg.includes('econn') ||
    msg.includes('timeout') ||
    msg.includes('socket') ||
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('504')
  );
}

export async function pollStellarSettlementTxOutcome(
  txHash: string,
  server?: Horizon.Server
): Promise<HorizonTxPollResult> {
  const h = txHash.trim().toLowerCase();
  const horizon = server ?? createStellarSpendHorizonServer();

  for (let i = 0; i < HORIZON_TX_POLL_ATTEMPTS; i += 1) {
    try {
      const tx = await horizon.transactions().transaction(h).call();
      if (tx.successful) return 'success';
      return 'failed';
    } catch (e: unknown) {
      if (isRetryableHorizonTxLookupError(e)) {
        await new Promise((r) => setTimeout(r, HORIZON_TX_POLL_INTERVAL_MS));
        continue;
      }
      return 'pending';
    }
  }
  return 'pending';
}
