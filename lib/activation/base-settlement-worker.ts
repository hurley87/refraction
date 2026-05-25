import { getAddress, isAddress } from 'viem';
import {
  getActivationRedemptionById,
  syncActivationRedemptionSettlementOutcome,
} from '@/lib/db/activation-redemptions';
import {
  confirmActivationSettlementAtomic,
  getActivationSettlementTransactionById,
  recordActivationSettlementFailureAtomic,
  updateActivationSettlementIfStatus,
  type ActivationSettlementTransactionRow,
} from '@/lib/db/activation-settlement-transactions';
import { getPlayerEvmWalletAddressById } from '@/lib/db/players';
import { getSponsoredActivationById } from '@/lib/db/sponsored-activations';
import {
  PrivyRestNotConfiguredError,
  PrivyRestTransactionFailedError,
  PrivyRestTransactionTimeoutError,
  waitForTransaction,
} from '@/lib/privy-server-rest';
import { baseUsdcAssetConfigSchema } from '@/lib/schemas/sponsored-activation';
import {
  findRecentTreasuryUsdcTransfer,
  getTreasuryTxReceiptStatus,
  submitTreasuryUsdcTransfer,
} from '@/lib/spend-treasury-usdc-transfer';
import { sameWalletAddress, tryNormalizeEvmAddress } from '@/lib/utils/wallets';

/** Stable `last_error_code` values for settlement rows (IRL-56). */
export const BASE_ACTIVATION_SETTLEMENT_ERROR_CODES = {
  campaign_wallet_not_configured: 'campaign_wallet_not_configured',
  venue_wallet_mismatch: 'venue_wallet_mismatch',
  recipient_is_user_wallet: 'recipient_is_user_wallet',
  invalid_usdc_contract: 'invalid_usdc_contract',
  settlement_wallet_invalid: 'settlement_wallet_invalid',
  campaign_wallet_mismatch: 'campaign_wallet_mismatch',
  insufficient_campaign_usdc: 'insufficient_campaign_usdc',
  privy_submit_failed: 'privy_submit_failed',
  privy_transaction_failed: 'privy_transaction_failed',
  onchain_reverted: 'onchain_reverted',
  settlement_not_found: 'settlement_not_found',
  redemption_not_found: 'redemption_not_found',
  redemption_status_invalid: 'redemption_status_invalid',
  privy_not_configured: 'privy_not_configured',
} as const;

export type BaseActivationSettlementErrorCode =
  (typeof BASE_ACTIVATION_SETTLEMENT_ERROR_CODES)[keyof typeof BASE_ACTIVATION_SETTLEMENT_ERROR_CODES];

export type ProcessBaseActivationSettlementResult =
  | {
      outcome: 'skipped';
      reason:
        | 'settlement_rail_not_base'
        | 'activation_rail_not_base'
        | 'settlement_in_retry_backoff';
    }
  | {
      outcome: 'idempotent_confirmed';
      settlement: ActivationSettlementTransactionRow;
      txHash: string;
    }
  | {
      outcome: 'retry_scheduled';
      settlement: ActivationSettlementTransactionRow;
      lastErrorCode: string;
    }
  | {
      outcome: 'terminal_failed';
      settlement: ActivationSettlementTransactionRow;
      lastErrorCode: string | null;
    }
  | {
      outcome: 'confirmed';
      settlement: ActivationSettlementTransactionRow;
      txHash: string;
    }
  | {
      outcome: 'submitted_pending';
      settlement: ActivationSettlementTransactionRow;
      privyTransactionId: string;
    };

export type BaseSettlementWorkerRunSummary = {
  processed: number;
  confirmed: number;
  failed: number;
  skipped: number;
  scheduledRetry: number;
};

const INSUFFICIENT_ERC20_RE =
  /exceeds\s+balance|insufficient\s+funds|transfer\s+amount|ERC20:\s+transfer\s+amount/i;

function classifyPrivySubmitError(
  message: string
): BaseActivationSettlementErrorCode {
  const m = message.trim();
  if (INSUFFICIENT_ERC20_RE.test(m)) {
    return BASE_ACTIVATION_SETTLEMENT_ERROR_CODES.insufficient_campaign_usdc;
  }
  return BASE_ACTIVATION_SETTLEMENT_ERROR_CODES.privy_submit_failed;
}

function nowIso(): string {
  return new Date().toISOString();
}

function requireEvm0x(value: string, ctx: string): `0x${string}` | null {
  const t = value.trim();
  if (!t || !isAddress(t)) {
    console.error(`${ctx}: invalid EVM address`, { value });
    return null;
  }
  return getAddress(t as `0x${string}`);
}

async function recordFailureAndShapeResult(
  row: ActivationSettlementTransactionRow,
  code: string
): Promise<
  Extract<
    ProcessBaseActivationSettlementResult,
    { outcome: 'retry_scheduled' | 'terminal_failed' }
  >
> {
  const rec = await recordActivationSettlementFailureAtomic({
    settlementId: row.id,
    lastErrorCode: code,
  });
  const settlement =
    (await getActivationSettlementTransactionById(row.id)) ?? row;
  if (rec === 'retry_scheduled') {
    return { outcome: 'retry_scheduled', settlement, lastErrorCode: code };
  }
  return { outcome: 'terminal_failed', settlement, lastErrorCode: code };
}

async function recordFailureAfterWorkerError(
  row: ActivationSettlementTransactionRow,
  lastErrorCode: BaseActivationSettlementErrorCode
): Promise<
  Extract<
    ProcessBaseActivationSettlementResult,
    { outcome: 'retry_scheduled' | 'terminal_failed' }
  >
> {
  return recordFailureAndShapeResult(row, lastErrorCode);
}

/**
 * Base (EVM) campaign-wallet → venue-wallet USDC settlement for one
 * `activation_settlement_transaction` row (`settlement_rail = base`).
 * Library-only entrypoint for cron (IRL-60); idempotent replays do not double-send.
 */
export async function processBaseActivationSettlement(input: {
  settlementId: string;
}): Promise<ProcessBaseActivationSettlementResult> {
  const settlementId = input.settlementId.trim();
  if (!settlementId) {
    throw new Error(
      'processBaseActivationSettlement: settlementId is required'
    );
  }

  const rowResult = await getActivationSettlementTransactionById(settlementId);
  if (!rowResult) {
    throw new Error(
      BASE_ACTIVATION_SETTLEMENT_ERROR_CODES.settlement_not_found
    );
  }
  const row = rowResult;

  if (row.settlement_rail !== 'base') {
    return { outcome: 'skipped', reason: 'settlement_rail_not_base' };
  }

  const activation = await getSponsoredActivationById(row.activation_id);
  if (!activation) {
    throw new Error('Sponsored activation not found for settlement');
  }

  if (activation.settlement_rail !== 'base') {
    return { outcome: 'skipped', reason: 'activation_rail_not_base' };
  }

  if (row.status === 'confirmed' && row.tx_hash) {
    const redemption = await getActivationRedemptionById(row.redemption_id);
    if (redemption?.status === 'settlement_pending') {
      await syncActivationRedemptionSettlementOutcome({
        redemptionId: row.redemption_id,
        nextStatus: 'settlement_confirmed',
      });
    }
    return {
      outcome: 'idempotent_confirmed',
      settlement: row,
      txHash: row.tx_hash,
    };
  }

  if (row.status === 'failed') {
    return {
      outcome: 'terminal_failed',
      settlement: row,
      lastErrorCode: row.last_error_code,
    };
  }

  if (row.status === 'retrying') {
    return { outcome: 'skipped', reason: 'settlement_in_retry_backoff' };
  }

  const redemption = await getActivationRedemptionById(row.redemption_id);
  if (!redemption) {
    throw new Error(
      BASE_ACTIVATION_SETTLEMENT_ERROR_CODES.redemption_not_found
    );
  }

  const venueExpected = requireEvm0x(
    activation.venue_settlement_wallet_address,
    'venue_settlement_wallet_address'
  );
  const campaignExpected = requireEvm0x(
    activation.campaign_wallet_address,
    'campaign_wallet_address'
  );
  const toParsed = requireEvm0x(row.to_wallet_address, 'to_wallet_address');
  const fromParsed = requireEvm0x(
    row.from_wallet_address,
    'from_wallet_address'
  );

  if (!venueExpected || !campaignExpected || !toParsed || !fromParsed) {
    return recordFailureAfterWorkerError(
      row,
      BASE_ACTIVATION_SETTLEMENT_ERROR_CODES.settlement_wallet_invalid
    );
  }

  if (
    !sameWalletAddress(
      row.to_wallet_address,
      activation.venue_settlement_wallet_address
    )
  ) {
    return recordFailureAfterWorkerError(
      row,
      BASE_ACTIVATION_SETTLEMENT_ERROR_CODES.venue_wallet_mismatch
    );
  }

  if (
    !sameWalletAddress(
      row.from_wallet_address,
      activation.campaign_wallet_address
    )
  ) {
    return recordFailureAfterWorkerError(
      row,
      BASE_ACTIVATION_SETTLEMENT_ERROR_CODES.campaign_wallet_mismatch
    );
  }

  const userWallet = await getPlayerEvmWalletAddressById(redemption.user_id);
  if (userWallet) {
    const userNorm = tryNormalizeEvmAddress(userWallet) ?? userWallet.trim();
    if (userNorm && sameWalletAddress(toParsed, userNorm)) {
      return recordFailureAfterWorkerError(
        row,
        BASE_ACTIVATION_SETTLEMENT_ERROR_CODES.recipient_is_user_wallet
      );
    }
  }

  const cfgParse = baseUsdcAssetConfigSchema.safeParse(
    activation.usdc_asset_config
  );
  if (!cfgParse.success) {
    return recordFailureAfterWorkerError(
      row,
      BASE_ACTIVATION_SETTLEMENT_ERROR_CODES.invalid_usdc_contract
    );
  }
  const usdcContract = cfgParse.data.contract_address;

  const privyWalletId = activation.privy_campaign_wallet_id?.trim();
  if (!privyWalletId) {
    return recordFailureAfterWorkerError(
      row,
      BASE_ACTIVATION_SETTLEMENT_ERROR_CODES.campaign_wallet_not_configured
    );
  }

  if (redemption.status !== 'settlement_pending') {
    if (row.status === 'submitted' || row.status === 'queued') {
      return recordFailureAfterWorkerError(
        row,
        BASE_ACTIVATION_SETTLEMENT_ERROR_CODES.redemption_status_invalid
      );
    }
    return {
      outcome: 'terminal_failed',
      settlement: row,
      lastErrorCode:
        BASE_ACTIVATION_SETTLEMENT_ERROR_CODES.redemption_status_invalid,
    };
  }

  const referenceId = `activation-settlement:${row.id}`;

  const settlementAmount = row.amount;

  async function finalizeFromTxHash(params: {
    settlementId: string;
    txHash: `0x${string}`;
    privyTransactionId: string | null;
    submittedAtPreserve?: string | null;
  }): Promise<Extract<
    ProcessBaseActivationSettlementResult,
    { outcome: 'retry_scheduled' | 'terminal_failed' }
  > | null> {
    const receipt = await getTreasuryTxReceiptStatus(params.txHash);
    if (receipt === 'reverted') {
      return recordFailureAndShapeResult(
        row,
        BASE_ACTIVATION_SETTLEMENT_ERROR_CODES.onchain_reverted
      );
    }
    if (receipt === 'success') {
      await confirmActivationSettlementAtomic({
        settlementId: params.settlementId,
        txHash: params.txHash,
        privyTransactionId: params.privyTransactionId,
        preserveSubmittedAt: params.submittedAtPreserve ?? null,
      });
    }
    return null;
  }

  async function tryResolveHashFromChain(): Promise<`0x${string}` | null> {
    return findRecentTreasuryUsdcTransfer({
      serverWalletAddress: campaignExpected as `0x${string}`,
      recipientAddress: venueExpected as `0x${string}`,
      usdcAmount: settlementAmount,
      erc20ContractAddress: usdcContract,
    });
  }

  /** Reconcile `submitted` (Privy id and/or hash) without broadcasting a second transfer. */
  if (row.status === 'submitted') {
    let txHash: `0x${string}` | null =
      row.tx_hash && isAddress(row.tx_hash.trim())
        ? getAddress(row.tx_hash.trim() as `0x${string}`)
        : null;

    if (!txHash && row.privy_transaction_id) {
      try {
        const waited = await waitForTransaction(row.privy_transaction_id, {
          timeoutMs: 10_000,
          initialPollMs: 400,
          maxPollMs: 2_000,
        });
        txHash = waited.transactionHash;
      } catch (e) {
        if (e instanceof PrivyRestTransactionFailedError) {
          return recordFailureAndShapeResult(
            row,
            BASE_ACTIVATION_SETTLEMENT_ERROR_CODES.privy_transaction_failed
          );
        }
        if (!(e instanceof PrivyRestTransactionTimeoutError)) {
          throw e;
        }
      }
    }

    if (!txHash) {
      txHash = await tryResolveHashFromChain();
    }

    if (txHash) {
      const early = await finalizeFromTxHash({
        settlementId: row.id,
        txHash,
        privyTransactionId: row.privy_transaction_id,
        submittedAtPreserve: row.submitted_at,
      });
      if (early) return early;
      const after = await getActivationSettlementTransactionById(row.id);
      if (after?.status === 'confirmed' && after.tx_hash) {
        return {
          outcome: 'confirmed',
          settlement: after,
          txHash: after.tx_hash,
        };
      }
      if (after?.status === 'retrying') {
        return {
          outcome: 'retry_scheduled',
          settlement: after,
          lastErrorCode: after.last_error_code ?? '',
        };
      }
      if (after?.status === 'failed') {
        return {
          outcome: 'terminal_failed',
          settlement: after,
          lastErrorCode: after.last_error_code,
        };
      }
    }

    const latest = await getActivationSettlementTransactionById(row.id);
    return {
      outcome: 'submitted_pending',
      settlement: latest ?? row,
      privyTransactionId: row.privy_transaction_id ?? '',
    };
  }

  if (row.status !== 'queued') {
    return {
      outcome: 'terminal_failed',
      settlement: row,
      lastErrorCode: row.last_error_code,
    };
  }

  let submit;
  try {
    submit = await submitTreasuryUsdcTransfer({
      serverWalletId: privyWalletId,
      serverWalletAddress: campaignExpected,
      recipientAddress: venueExpected,
      usdcAmount: row.amount,
      usdcContractAddress: usdcContract,
      referenceId,
    });
  } catch (e) {
    if (
      e instanceof PrivyRestNotConfiguredError ||
      (e instanceof Error &&
        /PRIVY_APP_SECRET|NEXT_PUBLIC_PRIVY_APP_ID|PRIVY_APP_ID/i.test(
          e.message
        ))
    ) {
      return recordFailureAfterWorkerError(
        row,
        BASE_ACTIVATION_SETTLEMENT_ERROR_CODES.privy_not_configured
      );
    }
    throw e;
  }

  if (!submit.ok) {
    const code = classifyPrivySubmitError(submit.error);
    return recordFailureAndShapeResult(row, code);
  }

  const privyTransactionId = submit.privyTransactionId;
  const submittedAt = nowIso();
  const nextAttempt = row.submission_attempt + 1;

  const updatedQueued = await updateActivationSettlementIfStatus({
    settlementId: row.id,
    ifStatusIn: ['queued'],
    patch: {
      status: 'submitted',
      privy_transaction_id: privyTransactionId,
      submitted_at: submittedAt,
      submission_attempt: nextAttempt,
    },
  });

  if (!updatedQueued) {
    const latest = await getActivationSettlementTransactionById(row.id);
    if (latest?.status === 'confirmed' && latest.tx_hash) {
      return {
        outcome: 'idempotent_confirmed',
        settlement: latest,
        txHash: latest.tx_hash,
      };
    }
    if (latest) {
      return processBaseActivationSettlement({ settlementId: latest.id });
    }
    throw new Error('Settlement row disappeared after Privy submit');
  }

  let txHash: `0x${string}` | null = null;
  if ('submittedPending' in submit && submit.submittedPending) {
    txHash = await tryResolveHashFromChain();
  } else {
    txHash = submit.txHash;
  }

  if (txHash) {
    const early = await finalizeFromTxHash({
      settlementId: row.id,
      txHash,
      privyTransactionId,
      submittedAtPreserve: submittedAt,
    });
    if (early) return early;
    const after = await getActivationSettlementTransactionById(row.id);
    if (after?.status === 'confirmed' && after.tx_hash) {
      return { outcome: 'confirmed', settlement: after, txHash: after.tx_hash };
    }
    if (after?.status === 'retrying') {
      return {
        outcome: 'retry_scheduled',
        settlement: after,
        lastErrorCode: after.last_error_code ?? '',
      };
    }
    if (after?.status === 'failed') {
      return {
        outcome: 'terminal_failed',
        settlement: after,
        lastErrorCode: after.last_error_code,
      };
    }
  }

  const latest = await getActivationSettlementTransactionById(row.id);
  return {
    outcome: 'submitted_pending',
    settlement: latest ?? updatedQueued,
    privyTransactionId,
  };
}

export async function runBaseSettlementWorkerBatch(
  settlements: ActivationSettlementTransactionRow[]
): Promise<BaseSettlementWorkerRunSummary> {
  const summary: BaseSettlementWorkerRunSummary = {
    processed: 0,
    confirmed: 0,
    failed: 0,
    skipped: 0,
    scheduledRetry: 0,
  };

  for (const row of settlements) {
    if (row.settlement_rail !== 'base') {
      summary.skipped += 1;
      continue;
    }

    summary.processed += 1;
    try {
      const result = await processBaseActivationSettlement({
        settlementId: row.id,
      });
      if (
        result.outcome === 'confirmed' ||
        result.outcome === 'idempotent_confirmed'
      ) {
        summary.confirmed += 1;
      } else if (result.outcome === 'terminal_failed') {
        summary.failed += 1;
      } else if (result.outcome === 'retry_scheduled') {
        summary.scheduledRetry += 1;
      } else {
        summary.skipped += 1;
      }
    } catch (e) {
      console.error('processBaseActivationSettlement:', row.id, e);
      try {
        const rec = await recordActivationSettlementFailureAtomic({
          settlementId: row.id,
          lastErrorCode: 'worker_exception',
        });
        if (rec === 'exhausted' || rec === 'already_failed') {
          summary.failed += 1;
        } else if (rec === 'retry_scheduled') {
          summary.scheduledRetry += 1;
        } else {
          summary.skipped += 1;
        }
      } catch (failErr) {
        console.error(
          'recordActivationSettlementFailureAtomic after worker_exception:',
          failErr
        );
        summary.skipped += 1;
      }
    }
  }

  return summary;
}
