import type { Horizon } from '@stellar/stellar-sdk';
import { createStellarSpendHorizonServer } from '@/lib/spend/stellar-wallet-readiness-config';

const HORIZON_TX_POLL_ATTEMPTS = 8;
const HORIZON_TX_POLL_INTERVAL_MS = 1500;

export type SpendStellarPaymentTxVerifyResult =
  | { ok: true }
  | { ok: false; reason: string };

async function waitForHorizonTxSuccess(
  server: Horizon.Server,
  txHash: string
): Promise<'success' | 'failed' | 'pending'> {
  const h = txHash.trim().toLowerCase();
  for (let i = 0; i < HORIZON_TX_POLL_ATTEMPTS; i += 1) {
    try {
      const tx = await server.transactions().transaction(h).call();
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

function amountsRoughlyEqual(a: string, b: string): boolean {
  return Math.abs(Number(a) - Number(b)) < 1e-7;
}

/**
 * Confirms a Stellar USDC payment transaction on Horizon (IRL-24), separate from EVM receipt checks.
 */
export async function verifySpendStellarUsdcPaymentTx(params: {
  txHash: string;
  expectedFrom: string;
  expectedTo: string;
  expectedUsdcAmount: number;
  usdcIssuer: string;
  usdcCode: string;
  server?: Horizon.Server;
}): Promise<SpendStellarPaymentTxVerifyResult> {
  const server = params.server ?? createStellarSpendHorizonServer();
  const h = params.txHash.trim().toLowerCase();

  const inclusion = await waitForHorizonTxSuccess(server, h);
  if (inclusion === 'pending') {
    return { ok: false, reason: 'horizon_tx_pending_timeout' };
  }
  if (inclusion === 'failed') {
    return { ok: false, reason: 'transaction_failed_on_network' };
  }

  const wantAmount = params.expectedUsdcAmount.toFixed(7);
  const fromW = params.expectedFrom.trim();
  const toW = params.expectedTo.trim();

  try {
    const page = await server.payments().forTransaction(h).call();
    for (const p of page.records) {
      if (p.type !== 'payment' || !('from' in p)) continue;
      const rec = p as Horizon.ServerApi.PaymentOperationRecord;
      if (rec.from !== fromW || rec.to !== toW) continue;
      if (
        rec.asset_type !== 'credit_alphanum4' &&
        rec.asset_type !== 'credit_alphanum12'
      ) {
        continue;
      }
      if (
        rec.asset_code !== params.usdcCode ||
        rec.asset_issuer !== params.usdcIssuer
      ) {
        continue;
      }
      if (!amountsRoughlyEqual(rec.amount, wantAmount)) continue;
      if (!rec.transaction_successful) continue;
      return { ok: true };
    }
    return { ok: false, reason: 'no_matching_usdc_payment' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: `horizon_payments_fetch_failed: ${msg}` };
  }
}
