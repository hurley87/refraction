import type { Horizon } from '@stellar/stellar-sdk';
import { createStellarSpendHorizonServer } from '@/lib/spend/stellar-wallet-readiness-config';

const HORIZON_TX_POLL_ATTEMPTS = 8;
const HORIZON_TX_POLL_INTERVAL_MS = 1500;

export type HorizonTxPollResult = 'success' | 'failed' | 'pending';

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
      const status = (e as { response?: { status?: number } })?.response
        ?.status;
      if (status === 404) {
        await new Promise((r) => setTimeout(r, HORIZON_TX_POLL_INTERVAL_MS));
        continue;
      }
      return 'pending';
    }
  }
  return 'pending';
}
