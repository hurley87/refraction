import type { SpendRail } from '@/lib/types';

/** JSON-serializable Privy / viem-compatible USDC transfer on Base (bigint `gas` as string). */
export type SpendPreparedBaseUsdcEvmTransactionRequestJson = {
  chainId: number;
  to: string;
  data: string;
  gas: string;
};

/**
 * Immutable verification binding for Base USDC user-signed payment (IRL-19).
 * Confirm uses this snapshot (plus live rail alignment checks) — not client-supplied recipient.
 */
export type SpendBaseUsdcPaymentVerificationSnapshotV1 = {
  v: 1;
  spend_rail: 'base_usdc';
  chain_id: number;
  usdc_contract: string;
  receiving_wallet: string;
  from_wallet: string;
  usdc_amount: number;
  transfer_calldata: string;
};

export type SpendPaymentPrepareStoredActionV1 = {
  v: 1;
  spend_rail: 'base_usdc';
  evmTransactionRequest: SpendPreparedBaseUsdcEvmTransactionRequestJson;
};

export function isSpendBaseUsdcVerificationSnapshotV1(
  value: unknown
): value is SpendBaseUsdcPaymentVerificationSnapshotV1 {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  return (
    o.v === 1 &&
    o.spend_rail === 'base_usdc' &&
    typeof o.chain_id === 'number' &&
    typeof o.usdc_contract === 'string' &&
    typeof o.receiving_wallet === 'string' &&
    typeof o.from_wallet === 'string' &&
    typeof o.usdc_amount === 'number' &&
    typeof o.transfer_calldata === 'string'
  );
}

export function isSpendPaymentPrepareStoredActionV1(
  value: unknown
): value is SpendPaymentPrepareStoredActionV1 {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  if (o.v !== 1 || o.spend_rail !== 'base_usdc') return false;
  const evm = o.evmTransactionRequest;
  if (!evm || typeof evm !== 'object') return false;
  const e = evm as Record<string, unknown>;
  return (
    typeof e.chainId === 'number' &&
    typeof e.to === 'string' &&
    typeof e.data === 'string' &&
    typeof e.gas === 'string'
  );
}

/** True when live rail config still matches the prepared snapshot (receiver, USDC contract, chain). */
export function spendBaseUsdcSnapshotMatchesLiveRail(params: {
  snapshot: SpendBaseUsdcPaymentVerificationSnapshotV1;
  liveSpendRail: SpendRail;
  liveReceivingLower: string;
  liveUsdcContractLower: string;
  liveChainId: number;
}): boolean {
  const s = params.snapshot;
  if (s.spend_rail !== params.liveSpendRail) return false;
  return (
    s.receiving_wallet === params.liveReceivingLower &&
    s.usdc_contract === params.liveUsdcContractLower &&
    s.chain_id === params.liveChainId
  );
}
