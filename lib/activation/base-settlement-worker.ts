import { getAddress, isAddress } from 'viem';
import {
  getActivationRedemptionById,
  syncActivationRedemptionSettlementOutcome,
} from '@/lib/db/activation-redemptions';
import {
  getActivationSettlementTransactionById,
  updateActivationSettlementIfStatus,
  updateActivationSettlementTransaction,
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
      reason: 'settlement_rail_not_base' | 'activation_rail_not_base';
    }
  | {
      outcome: 'idempotent_confirmed';
      settlement: ActivationSettlementTransactionRow;
      txHash: string;
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
    }
  | {
      outcome: 'config_or_validation_failed';
      settlement: ActivationSettlementTransactionRow;
      lastErrorCode: BaseActivationSettlementErrorCode;
    };

const INSUFFICIENT_ERC20_RE =
  /exceeds\s+balance|insufficient\s+funds|transfer\s+amount|ERC20:\s+transfer\s+amount/i;

function classifyPrivySubmitError(message: string): string {
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

async function markSettlementAndRedemptionFailed(input: {
  settlementId: string;
  redemptionId: string;
  lastErrorCode: string;
}): Promise<void> {
  await updateActivationSettlementTransaction(input.settlementId, {
    status: 'failed',
    last_error_code: input.lastErrorCode,
  });
  await syncActivationRedemptionSettlementOutcome({
    redemptionId: input.redemptionId,
    nextStatus: 'settlement_failed',
  });
}

async function confirmSettlementAndRedemption(input: {
  settlementId: string;
  redemptionId: string;
  txHash: string;
  privyTransactionId: string | null;
  submissionAttempt: number;
  /** When already set (e.g. `submitted_at` from the submit step), preserve it. */
  submittedAt?: string | null;
}): Promise<void> {
  const ts = nowIso();
  await updateActivationSettlementTransaction(input.settlementId, {
    status: 'confirmed',
    tx_hash: input.txHash,
    privy_transaction_id: input.privyTransactionId,
    confirmed_at: ts,
    submitted_at: input.submittedAt?.trim() || ts,
    last_error_code: null,
    submission_attempt: input.submissionAttempt,
  });
  await syncActivationRedemptionSettlementOutcome({
    redemptionId: input.redemptionId,
    nextStatus: 'settlement_confirmed',
  });
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

  const row = await getActivationSettlementTransactionById(settlementId);
  if (!row) {
    throw new Error(
      BASE_ACTIVATION_SETTLEMENT_ERROR_CODES.settlement_not_found
    );
  }

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
    await markSettlementAndRedemptionFailed({
      settlementId: row.id,
      redemptionId: row.redemption_id,
      lastErrorCode:
        BASE_ACTIVATION_SETTLEMENT_ERROR_CODES.settlement_wallet_invalid,
    });
    const refreshed = await getActivationSettlementTransactionById(row.id);
    return {
      outcome: 'config_or_validation_failed',
      settlement: refreshed ?? row,
      lastErrorCode:
        BASE_ACTIVATION_SETTLEMENT_ERROR_CODES.settlement_wallet_invalid,
    };
  }

  if (
    !sameWalletAddress(
      row.to_wallet_address,
      activation.venue_settlement_wallet_address
    )
  ) {
    await markSettlementAndRedemptionFailed({
      settlementId: row.id,
      redemptionId: row.redemption_id,
      lastErrorCode:
        BASE_ACTIVATION_SETTLEMENT_ERROR_CODES.venue_wallet_mismatch,
    });
    const refreshed = await getActivationSettlementTransactionById(row.id);
    return {
      outcome: 'config_or_validation_failed',
      settlement: refreshed ?? row,
      lastErrorCode:
        BASE_ACTIVATION_SETTLEMENT_ERROR_CODES.venue_wallet_mismatch,
    };
  }

  if (
    !sameWalletAddress(
      row.from_wallet_address,
      activation.campaign_wallet_address
    )
  ) {
    await markSettlementAndRedemptionFailed({
      settlementId: row.id,
      redemptionId: row.redemption_id,
      lastErrorCode:
        BASE_ACTIVATION_SETTLEMENT_ERROR_CODES.campaign_wallet_mismatch,
    });
    const refreshed = await getActivationSettlementTransactionById(row.id);
    return {
      outcome: 'config_or_validation_failed',
      settlement: refreshed ?? row,
      lastErrorCode:
        BASE_ACTIVATION_SETTLEMENT_ERROR_CODES.campaign_wallet_mismatch,
    };
  }

  const userWallet = await getPlayerEvmWalletAddressById(redemption.user_id);
  if (userWallet) {
    const userNorm = tryNormalizeEvmAddress(userWallet) ?? userWallet.trim();
    if (userNorm && sameWalletAddress(toParsed, userNorm)) {
      await markSettlementAndRedemptionFailed({
        settlementId: row.id,
        redemptionId: row.redemption_id,
        lastErrorCode:
          BASE_ACTIVATION_SETTLEMENT_ERROR_CODES.recipient_is_user_wallet,
      });
      const refreshed = await getActivationSettlementTransactionById(row.id);
      return {
        outcome: 'config_or_validation_failed',
        settlement: refreshed ?? row,
        lastErrorCode:
          BASE_ACTIVATION_SETTLEMENT_ERROR_CODES.recipient_is_user_wallet,
      };
    }
  }

  const cfgParse = baseUsdcAssetConfigSchema.safeParse(
    activation.usdc_asset_config
  );
  if (!cfgParse.success) {
    await markSettlementAndRedemptionFailed({
      settlementId: row.id,
      redemptionId: row.redemption_id,
      lastErrorCode:
        BASE_ACTIVATION_SETTLEMENT_ERROR_CODES.invalid_usdc_contract,
    });
    const refreshed = await getActivationSettlementTransactionById(row.id);
    return {
      outcome: 'config_or_validation_failed',
      settlement: refreshed ?? row,
      lastErrorCode:
        BASE_ACTIVATION_SETTLEMENT_ERROR_CODES.invalid_usdc_contract,
    };
  }
  const usdcContract = cfgParse.data.contract_address;

  const privyWalletId = activation.privy_campaign_wallet_id?.trim();
  if (!privyWalletId) {
    await markSettlementAndRedemptionFailed({
      settlementId: row.id,
      redemptionId: row.redemption_id,
      lastErrorCode:
        BASE_ACTIVATION_SETTLEMENT_ERROR_CODES.campaign_wallet_not_configured,
    });
    const refreshed = await getActivationSettlementTransactionById(row.id);
    return {
      outcome: 'config_or_validation_failed',
      settlement: refreshed ?? row,
      lastErrorCode:
        BASE_ACTIVATION_SETTLEMENT_ERROR_CODES.campaign_wallet_not_configured,
    };
  }

  if (redemption.status !== 'settlement_pending') {
    if (row.status === 'submitted' || row.status === 'queued') {
      await markSettlementAndRedemptionFailed({
        settlementId: row.id,
        redemptionId: row.redemption_id,
        lastErrorCode:
          BASE_ACTIVATION_SETTLEMENT_ERROR_CODES.redemption_status_invalid,
      });
      const refreshed = await getActivationSettlementTransactionById(row.id);
      return {
        outcome: 'config_or_validation_failed',
        settlement: refreshed ?? row,
        lastErrorCode:
          BASE_ACTIVATION_SETTLEMENT_ERROR_CODES.redemption_status_invalid,
      };
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
    redemptionId: string;
    txHash: `0x${string}`;
    privyTransactionId: string | null;
    submissionAttempt: number;
    submittedAtPreserve?: string | null;
  }): Promise<void> {
    const receipt = await getTreasuryTxReceiptStatus(params.txHash);
    if (receipt === 'reverted') {
      await markSettlementAndRedemptionFailed({
        settlementId: params.settlementId,
        redemptionId: params.redemptionId,
        lastErrorCode: BASE_ACTIVATION_SETTLEMENT_ERROR_CODES.onchain_reverted,
      });
      return;
    }
    if (receipt === 'success') {
      await confirmSettlementAndRedemption({
        settlementId: params.settlementId,
        redemptionId: params.redemptionId,
        txHash: params.txHash,
        privyTransactionId: params.privyTransactionId,
        submissionAttempt: params.submissionAttempt,
        submittedAt: params.submittedAtPreserve,
      });
    }
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
          await markSettlementAndRedemptionFailed({
            settlementId: row.id,
            redemptionId: row.redemption_id,
            lastErrorCode:
              BASE_ACTIVATION_SETTLEMENT_ERROR_CODES.privy_transaction_failed,
          });
          const refreshed = await getActivationSettlementTransactionById(
            row.id
          );
          return {
            outcome: 'terminal_failed',
            settlement: refreshed ?? row,
            lastErrorCode:
              BASE_ACTIVATION_SETTLEMENT_ERROR_CODES.privy_transaction_failed,
          };
        }
        if (e instanceof PrivyRestTransactionTimeoutError) {
          txHash = await tryResolveHashFromChain();
        } else {
          throw e;
        }
      }
    }

    if (!txHash) {
      txHash = await tryResolveHashFromChain();
    }

    if (txHash) {
      await finalizeFromTxHash({
        settlementId: row.id,
        redemptionId: row.redemption_id,
        txHash,
        privyTransactionId: row.privy_transaction_id,
        submissionAttempt: row.submission_attempt,
        submittedAtPreserve: row.submitted_at,
      });
      const after = await getActivationSettlementTransactionById(row.id);
      if (after?.status === 'confirmed' && after.tx_hash) {
        return {
          outcome: 'confirmed',
          settlement: after,
          txHash: after.tx_hash,
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
      await markSettlementAndRedemptionFailed({
        settlementId: row.id,
        redemptionId: row.redemption_id,
        lastErrorCode:
          BASE_ACTIVATION_SETTLEMENT_ERROR_CODES.privy_not_configured,
      });
      const refreshed = await getActivationSettlementTransactionById(row.id);
      return {
        outcome: 'config_or_validation_failed',
        settlement: refreshed ?? row,
        lastErrorCode:
          BASE_ACTIVATION_SETTLEMENT_ERROR_CODES.privy_not_configured,
      };
    }
    throw e;
  }

  if (!submit.ok) {
    const code = classifyPrivySubmitError(submit.error);
    await markSettlementAndRedemptionFailed({
      settlementId: row.id,
      redemptionId: row.redemption_id,
      lastErrorCode: code,
    });
    const refreshed = await getActivationSettlementTransactionById(row.id);
    return {
      outcome: 'terminal_failed',
      settlement: refreshed ?? row,
      lastErrorCode: code,
    };
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
  if (submit.ok && !('submittedPending' in submit && submit.submittedPending)) {
    txHash = submit.txHash;
  } else if (
    submit.ok &&
    'submittedPending' in submit &&
    submit.submittedPending
  ) {
    txHash = await tryResolveHashFromChain();
  }

  if (txHash) {
    await finalizeFromTxHash({
      settlementId: row.id,
      redemptionId: row.redemption_id,
      txHash,
      privyTransactionId,
      submissionAttempt: nextAttempt,
      submittedAtPreserve: submittedAt,
    });
    const after = await getActivationSettlementTransactionById(row.id);
    if (after?.status === 'confirmed' && after.tx_hash) {
      return { outcome: 'confirmed', settlement: after, txHash: after.tx_hash };
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
