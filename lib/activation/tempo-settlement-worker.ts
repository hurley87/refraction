import { getAddress, isAddress } from 'viem';
import {
  resolveServerIdentity,
  trackSponsoredSettlementConfirmed,
  trackSponsoredSettlementFailed,
  trackSponsoredSettlementSubmitted,
} from '@/lib/analytics/server';
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
import { tempoCaddAssetConfigSchema } from '@/lib/schemas/sponsored-activation';
import {
  findTempoCaddTransfer,
  getTempoCaddTransferStatus,
  submitTempoCaddTransfer,
} from '@/lib/activation/tempo-cadd-transfer';
import { sameWalletAddress, tryNormalizeEvmAddress } from '@/lib/utils/wallets';

export const TEMPO_ACTIVATION_SETTLEMENT_ERROR_CODES = {
  campaign_wallet_not_configured: 'campaign_wallet_not_configured',
  venue_wallet_mismatch: 'venue_wallet_mismatch',
  recipient_is_user_wallet: 'recipient_is_user_wallet',
  invalid_cadd_contract: 'invalid_cadd_contract',
  settlement_wallet_invalid: 'settlement_wallet_invalid',
  campaign_wallet_mismatch: 'campaign_wallet_mismatch',
  insufficient_campaign_cadd: 'insufficient_campaign_cadd',
  privy_submit_failed: 'privy_submit_failed',
  privy_transaction_failed: 'privy_transaction_failed',
  onchain_reverted: 'onchain_reverted',
  onchain_transfer_mismatch: 'onchain_transfer_mismatch',
  settlement_not_found: 'settlement_not_found',
  redemption_not_found: 'redemption_not_found',
  redemption_status_invalid: 'redemption_status_invalid',
  privy_not_configured: 'privy_not_configured',
} as const;

type TempoErrorCode =
  (typeof TEMPO_ACTIVATION_SETTLEMENT_ERROR_CODES)[keyof typeof TEMPO_ACTIVATION_SETTLEMENT_ERROR_CODES];

export type ProcessTempoActivationSettlementResult =
  | {
      outcome: 'skipped';
      reason:
        | 'settlement_rail_not_tempo'
        | 'activation_rail_not_tempo'
        | 'settlement_in_retry_backoff';
    }
  | {
      outcome: 'idempotent_confirmed' | 'confirmed';
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
      outcome: 'submitted_pending';
      settlement: ActivationSettlementTransactionRow;
      privyTransactionId: string;
    };

export type TempoSettlementWorkerRunSummary = {
  processed: number;
  confirmed: number;
  failed: number;
  skipped: number;
  scheduledRetry: number;
};

const INSUFFICIENT_CADD_RE =
  /exceeds\s+balance|insufficient\s+funds|transfer\s+amount|balance too low/i;
const TX_HASH_RE = /^0x[a-fA-F0-9]{64}$/;

function classifySubmitError(message: string): TempoErrorCode {
  return INSUFFICIENT_CADD_RE.test(message)
    ? TEMPO_ACTIVATION_SETTLEMENT_ERROR_CODES.insufficient_campaign_cadd
    : TEMPO_ACTIVATION_SETTLEMENT_ERROR_CODES.privy_submit_failed;
}

function requireEvmAddress(value: string): `0x${string}` | null {
  const trimmed = value.trim();
  return isAddress(trimmed) ? getAddress(trimmed as `0x${string}`) : null;
}

function normalizeTxHash(value: string | null): `0x${string}` | null {
  const trimmed = value?.trim();
  return trimmed && TX_HASH_RE.test(trimmed)
    ? (trimmed as `0x${string}`)
    : null;
}

async function emitFailed(
  row: ActivationSettlementTransactionRow,
  settlement: ActivationSettlementTransactionRow
): Promise<void> {
  const redemption = await getActivationRedemptionById(row.redemption_id);
  if (!redemption) return;
  try {
    trackSponsoredSettlementFailed(
      resolveServerIdentity({ playerId: redemption.user_id }),
      {
        activation_id: row.activation_id,
        settlement_rail: row.settlement_rail,
        user_id: redemption.user_id,
        reward_item_id: redemption.reward_item_id,
        redemption_id: row.redemption_id,
        settlement_id: row.id,
        status: settlement.status,
        usdc_amount: settlement.amount,
      }
    );
  } catch {
    // Analytics must not affect settlement state.
  }
}

async function recordFailure(
  row: ActivationSettlementTransactionRow,
  code: string
): Promise<
  Extract<
    ProcessTempoActivationSettlementResult,
    { outcome: 'retry_scheduled' | 'terminal_failed' }
  >
> {
  const outcome = await recordActivationSettlementFailureAtomic({
    settlementId: row.id,
    lastErrorCode: code,
  });
  const settlement =
    (await getActivationSettlementTransactionById(row.id)) ?? row;
  if (outcome === 'exhausted') await emitFailed(row, settlement);
  return outcome === 'retry_scheduled'
    ? { outcome, settlement, lastErrorCode: code }
    : {
        outcome: 'terminal_failed',
        settlement,
        lastErrorCode: settlement.last_error_code ?? code,
      };
}

export async function processTempoActivationSettlement(input: {
  settlementId: string;
}): Promise<ProcessTempoActivationSettlementResult> {
  const settlementId = input.settlementId.trim();
  if (!settlementId) {
    throw new Error(
      'processTempoActivationSettlement: settlementId is required'
    );
  }
  const row = await getActivationSettlementTransactionById(settlementId);
  if (!row) {
    throw new Error(
      TEMPO_ACTIVATION_SETTLEMENT_ERROR_CODES.settlement_not_found
    );
  }
  if (row.settlement_rail !== 'tempo') {
    return { outcome: 'skipped', reason: 'settlement_rail_not_tempo' };
  }

  const activation = await getSponsoredActivationById(row.activation_id);
  if (!activation)
    throw new Error('Sponsored activation not found for settlement');
  if (activation.settlement_rail !== 'tempo') {
    return { outcome: 'skipped', reason: 'activation_rail_not_tempo' };
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
      TEMPO_ACTIVATION_SETTLEMENT_ERROR_CODES.redemption_not_found
    );
  }
  const venue = requireEvmAddress(activation.venue_settlement_wallet_address);
  const campaign = requireEvmAddress(activation.campaign_wallet_address);
  const rowTo = requireEvmAddress(row.to_wallet_address);
  const rowFrom = requireEvmAddress(row.from_wallet_address);
  if (!venue || !campaign || !rowTo || !rowFrom) {
    return recordFailure(
      row,
      TEMPO_ACTIVATION_SETTLEMENT_ERROR_CODES.settlement_wallet_invalid
    );
  }
  if (!sameWalletAddress(rowTo, venue)) {
    return recordFailure(
      row,
      TEMPO_ACTIVATION_SETTLEMENT_ERROR_CODES.venue_wallet_mismatch
    );
  }
  if (!sameWalletAddress(rowFrom, campaign)) {
    return recordFailure(
      row,
      TEMPO_ACTIVATION_SETTLEMENT_ERROR_CODES.campaign_wallet_mismatch
    );
  }
  const userWallet = await getPlayerEvmWalletAddressById(redemption.user_id);
  const normalizedUserWallet = userWallet
    ? (tryNormalizeEvmAddress(userWallet) ?? userWallet.trim())
    : null;
  if (normalizedUserWallet && sameWalletAddress(venue, normalizedUserWallet)) {
    return recordFailure(
      row,
      TEMPO_ACTIVATION_SETTLEMENT_ERROR_CODES.recipient_is_user_wallet
    );
  }

  const config = tempoCaddAssetConfigSchema.safeParse(
    activation.usdc_asset_config
  );
  if (!config.success) {
    return recordFailure(
      row,
      TEMPO_ACTIVATION_SETTLEMENT_ERROR_CODES.invalid_cadd_contract
    );
  }
  const privyWalletId = activation.privy_campaign_wallet_id?.trim();
  if (!privyWalletId) {
    return recordFailure(
      row,
      TEMPO_ACTIVATION_SETTLEMENT_ERROR_CODES.campaign_wallet_not_configured
    );
  }
  if (redemption.status !== 'settlement_pending') {
    return recordFailure(
      row,
      TEMPO_ACTIVATION_SETTLEMENT_ERROR_CODES.redemption_status_invalid
    );
  }

  const transferParams = {
    campaignAddress: campaign,
    recipientAddress: venue,
    caddAmount: row.amount,
    settlementId: row.id,
    caddContractAddress: config.data.contract_address,
  };

  const finalize = async (
    txHash: `0x${string}`,
    privyTransactionId: string | null,
    submittedAt: string | null
  ): Promise<Extract<
    ProcessTempoActivationSettlementResult,
    { outcome: 'retry_scheduled' | 'terminal_failed' }
  > | null> => {
    const status = await getTempoCaddTransferStatus({
      txHash,
      ...transferParams,
    });
    if (status === 'reverted') {
      return recordFailure(
        row,
        TEMPO_ACTIVATION_SETTLEMENT_ERROR_CODES.onchain_reverted
      );
    }
    if (status === 'mismatch') {
      return recordFailure(
        row,
        TEMPO_ACTIVATION_SETTLEMENT_ERROR_CODES.onchain_transfer_mismatch
      );
    }
    if (status !== 'success') return null;

    const confirmOutcome = await confirmActivationSettlementAtomic({
      settlementId: row.id,
      txHash,
      privyTransactionId,
      preserveSubmittedAt: submittedAt,
    });
    if (confirmOutcome === 'confirmed') {
      const after =
        (await getActivationSettlementTransactionById(row.id)) ?? row;
      try {
        trackSponsoredSettlementConfirmed(
          resolveServerIdentity({ playerId: redemption.user_id }),
          {
            activation_id: row.activation_id,
            settlement_rail: row.settlement_rail,
            user_id: redemption.user_id,
            reward_item_id: redemption.reward_item_id,
            redemption_id: row.redemption_id,
            settlement_id: row.id,
            status: after.status,
            usdc_amount: after.amount,
          }
        );
      } catch {
        // Analytics must not affect settlement state.
      }
    }
    return null;
  };

  const reconcileHash = () => findTempoCaddTransfer(transferParams);

  if (row.status === 'submitted') {
    let txHash = normalizeTxHash(row.tx_hash);
    if (!txHash && row.privy_transaction_id) {
      try {
        txHash = (
          await waitForTransaction(row.privy_transaction_id, {
            timeoutMs: 10_000,
            initialPollMs: 400,
            maxPollMs: 2_000,
          })
        ).transactionHash;
      } catch (error) {
        if (error instanceof PrivyRestTransactionFailedError) {
          return recordFailure(
            row,
            TEMPO_ACTIVATION_SETTLEMENT_ERROR_CODES.privy_transaction_failed
          );
        }
        if (!(error instanceof PrivyRestTransactionTimeoutError)) throw error;
      }
    }
    if (!txHash) txHash = await reconcileHash();
    if (txHash) {
      const failure = await finalize(
        txHash,
        row.privy_transaction_id,
        row.submitted_at
      );
      if (failure) return failure;
      const after = await getActivationSettlementTransactionById(row.id);
      if (after?.status === 'confirmed' && after.tx_hash) {
        return {
          outcome: 'confirmed',
          settlement: after,
          txHash: after.tx_hash,
        };
      }
    }
    return {
      outcome: 'submitted_pending',
      settlement: (await getActivationSettlementTransactionById(row.id)) ?? row,
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

  let submitted;
  try {
    submitted = await submitTempoCaddTransfer({
      serverWalletId: privyWalletId,
      serverWalletAddress: campaign,
      recipientAddress: venue,
      caddAmount: row.amount,
      settlementId: row.id,
      caddContractAddress: config.data.contract_address,
      referenceId: `activation-settlement:${row.id}`,
    });
  } catch (error) {
    if (
      error instanceof PrivyRestNotConfiguredError ||
      (error instanceof Error &&
        /PRIVY_APP_SECRET|NEXT_PUBLIC_PRIVY_APP_ID|PRIVY_APP_ID/i.test(
          error.message
        ))
    ) {
      return recordFailure(
        row,
        TEMPO_ACTIVATION_SETTLEMENT_ERROR_CODES.privy_not_configured
      );
    }
    throw error;
  }
  if (!submitted.ok) {
    return recordFailure(row, classifySubmitError(submitted.error));
  }

  const submittedAt = new Date().toISOString();
  const updated = await updateActivationSettlementIfStatus({
    settlementId: row.id,
    ifStatusIn: ['queued'],
    patch: {
      status: 'submitted',
      privy_transaction_id: submitted.privyTransactionId,
      submitted_at: submittedAt,
      submission_attempt: row.submission_attempt + 1,
    },
  });
  if (!updated) {
    const latest = await getActivationSettlementTransactionById(row.id);
    if (latest?.status === 'confirmed' && latest.tx_hash) {
      return {
        outcome: 'idempotent_confirmed',
        settlement: latest,
        txHash: latest.tx_hash,
      };
    }
    if (latest)
      return processTempoActivationSettlement({ settlementId: latest.id });
    throw new Error('Settlement row disappeared after Privy Tempo submit');
  }

  try {
    trackSponsoredSettlementSubmitted(
      resolveServerIdentity({ playerId: redemption.user_id }),
      {
        activation_id: row.activation_id,
        settlement_rail: row.settlement_rail,
        user_id: redemption.user_id,
        reward_item_id: redemption.reward_item_id,
        redemption_id: row.redemption_id,
        settlement_id: row.id,
        status: updated.status,
        usdc_amount: updated.amount,
      }
    );
  } catch {
    // Analytics must not affect settlement state.
  }

  const txHash =
    'submittedPending' in submitted && submitted.submittedPending
      ? await reconcileHash()
      : submitted.txHash;
  if (txHash) {
    const failure = await finalize(
      txHash,
      submitted.privyTransactionId,
      submittedAt
    );
    if (failure) return failure;
    const after = await getActivationSettlementTransactionById(row.id);
    if (after?.status === 'confirmed' && after.tx_hash) {
      return { outcome: 'confirmed', settlement: after, txHash: after.tx_hash };
    }
  }
  return {
    outcome: 'submitted_pending',
    settlement:
      (await getActivationSettlementTransactionById(row.id)) ?? updated,
    privyTransactionId: submitted.privyTransactionId,
  };
}

export async function runTempoSettlementWorkerBatch(
  settlements: ActivationSettlementTransactionRow[]
): Promise<TempoSettlementWorkerRunSummary> {
  const summary: TempoSettlementWorkerRunSummary = {
    processed: 0,
    confirmed: 0,
    failed: 0,
    skipped: 0,
    scheduledRetry: 0,
  };
  for (const row of settlements) {
    if (row.settlement_rail !== 'tempo') {
      summary.skipped += 1;
      continue;
    }
    summary.processed += 1;
    try {
      const result = await processTempoActivationSettlement({
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
    } catch (error) {
      console.error('processTempoActivationSettlement:', row.id, error);
      const outcome = await recordActivationSettlementFailureAtomic({
        settlementId: row.id,
        lastErrorCode: 'worker_exception',
      });
      if (outcome === 'exhausted' || outcome === 'already_failed') {
        summary.failed += 1;
      } else if (outcome === 'retry_scheduled') {
        summary.scheduledRetry += 1;
      } else {
        summary.skipped += 1;
      }
    }
  }
  return summary;
}
