import type { SpendRail } from '@/lib/types';

/** v1 prepared action: server submits the final Stellar USDC payment after POST confirm (IRL-24). */
export type SpendStellarUsdcBackendSubmitPreparedActionV1 = {
  v: 1;
  spend_rail: 'stellar_usdc';
  payment_channel: 'backend_submit';
  /** POST-only second step; same route as Base but without client `paymentTxHash`. */
  confirm: {
    method: 'POST';
    /** Relative API path including `/api` prefix; `sessionId` is duplicated for simple clients. */
    path: string;
    session_id: string;
  };
  display: {
    pay_label: string;
    submitting_label: string;
  };
};

/**
 * Immutable verification binding for Stellar USDC backend submit payment (IRL-24).
 * Confirm rebuilds + verifies against this snapshot and live rail config.
 */
export type SpendStellarUsdcPaymentVerificationSnapshotV1 = {
  v: 1;
  spend_rail: 'stellar_usdc';
  from_wallet: string;
  receiving_wallet: string;
  usdc_amount: number;
  usdc_asset_code: string;
  usdc_issuer: string;
};

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

export function isSpendStellarUsdcBackendSubmitPreparedActionV1(
  value: unknown
): value is SpendStellarUsdcBackendSubmitPreparedActionV1 {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  if (o.v !== 1 || o.spend_rail !== 'stellar_usdc') return false;
  if (o.payment_channel !== 'backend_submit') return false;
  const c = o.confirm;
  if (!c || typeof c !== 'object') return false;
  const cr = c as Record<string, unknown>;
  if (cr.method !== 'POST') return false;
  if (typeof cr.path !== 'string' || typeof cr.session_id !== 'string') {
    return false;
  }
  const d = o.display;
  if (!d || typeof d !== 'object') return false;
  const dr = d as Record<string, unknown>;
  return (
    typeof dr.pay_label === 'string' && typeof dr.submitting_label === 'string'
  );
}

export function isSpendStellarUsdcVerificationSnapshotV1(
  value: unknown
): value is SpendStellarUsdcPaymentVerificationSnapshotV1 {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  return (
    o.v === 1 &&
    o.spend_rail === 'stellar_usdc' &&
    typeof o.from_wallet === 'string' &&
    typeof o.receiving_wallet === 'string' &&
    typeof o.usdc_amount === 'number' &&
    typeof o.usdc_asset_code === 'string' &&
    typeof o.usdc_issuer === 'string'
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

export function spendStellarUsdcSnapshotMatchesLiveRail(params: {
  snapshot: SpendStellarUsdcPaymentVerificationSnapshotV1;
  liveSpendRail: SpendRail;
  liveReceiving: string;
  liveUsdcIssuer: string;
  liveUsdcCode: string;
}): boolean {
  const s = params.snapshot;
  if (s.spend_rail !== params.liveSpendRail) return false;
  return (
    s.receiving_wallet === params.liveReceiving &&
    s.usdc_issuer === params.liveUsdcIssuer &&
    s.usdc_asset_code === params.liveUsdcCode
  );
}
