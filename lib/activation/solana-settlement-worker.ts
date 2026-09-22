import {
  resolveServerIdentity,
  trackSponsoredSettlementConfirmed,
  trackSponsoredSettlementFailed,
  trackSponsoredSettlementSubmitted,
} from '@/lib/analytics/server';
import { getActivationRedemptionById } from '@/lib/db/activation-redemptions';
import {
  confirmActivationSettlementAtomic,
  getActivationSettlementTransactionById,
  recordActivationSettlementFailureAtomic,
  updateActivationSettlementIfStatus,
  type ActivationSettlementTransactionRow,
} from '@/lib/db/activation-settlement-transactions';
import {
  getSponsoredActivationById,
  type SponsoredActivationRow,
} from '@/lib/db/sponsored-activations';
import { isSolanaAddress } from '@/lib/activation/solana-config';
import {
  broadcastSolanaTransaction,
  buildSolanaCaddTransferTransaction,
  createSolanaSettlementConnection,
  isSolanaTransactionExpired,
  checkSolanaSignatureOutcome,
  signSolanaCaddTransferWithPrivy,
  type SolanaSettlementConnection,
} from '@/lib/activation/solana-cadd-transfer';
import { solanaCaddAssetConfigSchema } from '@/lib/schemas/sponsored-activation';

export const SOLANA_ACTIVATION_SETTLEMENT_ERROR_CODES = {
  wrong_rail: 'wrong_rail',
  activation_not_found: 'activation_not_found',
  solana_address_invalid: 'solana_address_invalid',
  campaign_from_mismatch: 'campaign_from_mismatch',
  venue_to_mismatch: 'venue_to_mismatch',
  campaign_equals_destination: 'campaign_equals_destination',
  invalid_cadd_asset_config: 'invalid_cadd_asset_config',
  campaign_wallet_not_configured: 'campaign_wallet_not_configured',
  redemption_not_found: 'redemption_not_found',
  redemption_status_invalid: 'redemption_status_invalid',
  submitted_missing_tx_hash: 'submitted_missing_tx_hash',
  solana_broadcast_rejected: 'solana_broadcast_rejected',
  solana_tx_failed_onchain: 'solana_tx_failed_onchain',
  solana_tx_expired: 'solana_tx_expired',
} as const;

const CODES = SOLANA_ACTIVATION_SETTLEMENT_ERROR_CODES;

/**
 * Solana rows have no Privy transaction id, so `privy_transaction_id` carries
 * the submitted transaction's `lastValidBlockHeight`, written atomically with
 * `queued → submitted` and cleared by the existing retry/reset RPCs.
 */
const SOLANA_SUBMISSION_METADATA_PREFIX = 'solana:last_valid_block_height:';

export function encodeSolanaSubmissionMetadata(
  lastValidBlockHeight: number
): string {
  return `${SOLANA_SUBMISSION_METADATA_PREFIX}${lastValidBlockHeight}`;
}

export function parseSolanaSubmissionLastValidBlockHeight(
  value: string | null
): number | null {
  const raw = value?.trim();
  if (!raw?.startsWith(SOLANA_SUBMISSION_METADATA_PREFIX)) return null;
  const digits = raw.slice(SOLANA_SUBMISSION_METADATA_PREFIX.length);
  if (!/^\d+$/.test(digits)) return null;
  const height = Number(digits);
  return Number.isSafeInteger(height) ? height : null;
}

export type SolanaSettlementWorkerItemResult =
  | 'skipped'
  | 'confirmed'
  | 'already_confirmed'
  | 'failed'
  | 'already_failed'
  | 'retry_scheduled';

export type SolanaSettlementWorkerRunSummary = {
  processed: number;
  confirmed: number;
  failed: number;
  skipped: number;
  scheduledRetry: number;
};

export type SolanaSettlementWorkerOptions = {
  connection?: SolanaSettlementConnection;
};

function validateSettlementBundle(
  settlement: ActivationSettlementTransactionRow,
  activation: SponsoredActivationRow
): string | null {
  if (
    settlement.settlement_rail !== 'solana' ||
    activation.settlement_rail !== 'solana'
  ) {
    return CODES.wrong_rail;
  }

  const campaign = activation.campaign_wallet_address.trim();
  const venue = activation.venue_settlement_wallet_address.trim();
  const from = settlement.from_wallet_address.trim();
  const to = settlement.to_wallet_address.trim();
  if (![campaign, venue, from, to].every(isSolanaAddress)) {
    return CODES.solana_address_invalid;
  }
  if (campaign !== from) return CODES.campaign_from_mismatch;
  if (venue !== to) return CODES.venue_to_mismatch;
  if (campaign === to) return CODES.campaign_equals_destination;

  if (
    !solanaCaddAssetConfigSchema.safeParse(activation.usdc_asset_config).success
  ) {
    return CODES.invalid_cadd_asset_config;
  }
  return null;
}

async function trackSettlementEvent(
  track:
    | typeof trackSponsoredSettlementSubmitted
    | typeof trackSponsoredSettlementConfirmed
    | typeof trackSponsoredSettlementFailed,
  settlementId: string
): Promise<void> {
  try {
    const row = await getActivationSettlementTransactionById(settlementId);
    if (!row) return;
    const redemption = await getActivationRedemptionById(row.redemption_id);
    if (!redemption) return;
    track(resolveServerIdentity({ playerId: redemption.user_id }), {
      activation_id: row.activation_id,
      settlement_rail: row.settlement_rail,
      user_id: redemption.user_id,
      reward_item_id: redemption.reward_item_id,
      redemption_id: row.redemption_id,
      settlement_id: row.id,
      status: row.status,
      usdc_amount: row.amount,
    });
  } catch {
    // Analytics must not affect settlement state.
  }
}

async function recordSettlementFailure(
  settlementId: string,
  errorCode: string
): Promise<SolanaSettlementWorkerItemResult> {
  const outcome = await recordActivationSettlementFailureAtomic({
    settlementId,
    lastErrorCode: errorCode,
  });
  if (outcome === 'already_confirmed') return 'already_confirmed';
  if (outcome === 'already_failed') return 'already_failed';
  if (outcome === 'retry_scheduled') return 'retry_scheduled';
  await trackSettlementEvent(trackSponsoredSettlementFailed, settlementId);
  return 'failed';
}

async function confirmWithSignature(input: {
  settlementId: string;
  signature: string;
  lastValidBlockHeight: number | null;
  connection: SolanaSettlementConnection;
}): Promise<SolanaSettlementWorkerItemResult> {
  const outcome = await checkSolanaSignatureOutcome({
    connection: input.connection,
    signature: input.signature,
  });

  if (outcome === 'failed') {
    return recordSettlementFailure(
      input.settlementId,
      CODES.solana_tx_failed_onchain
    );
  }
  if (outcome === 'not_found') {
    if (input.lastValidBlockHeight === null) {
      // Without the blockhash expiry height we cannot prove the transaction can
      // never land, so it stays `submitted` rather than risk a second transfer.
      console.warn(
        'processSolanaActivationSettlement: missing lastValidBlockHeight; not retrying',
        input.settlementId
      );
      return 'skipped';
    }
    const expired = await isSolanaTransactionExpired({
      connection: input.connection,
      signature: input.signature,
      lastValidBlockHeight: input.lastValidBlockHeight,
    });
    return expired
      ? recordSettlementFailure(input.settlementId, CODES.solana_tx_expired)
      : 'skipped';
  }
  if (outcome === 'pending') {
    // Stay `submitted` with this signature; never re-sign or re-send here.
    return 'skipped';
  }

  const confirmed = await confirmActivationSettlementAtomic({
    settlementId: input.settlementId,
    txHash: input.signature,
  });
  if (confirmed === 'confirmed') {
    await trackSettlementEvent(
      trackSponsoredSettlementConfirmed,
      input.settlementId
    );
  }
  return confirmed === 'already_confirmed' ? 'already_confirmed' : 'confirmed';
}

/**
 * `queued`: build → Privy sign → persist signature as `submitted` → broadcast →
 * one status check. `submitted`: check the persisted signature only; never
 * sends again.
 */
export async function processSolanaActivationSettlement(
  settlement: ActivationSettlementTransactionRow,
  options: SolanaSettlementWorkerOptions = {}
): Promise<SolanaSettlementWorkerItemResult> {
  if (settlement.settlement_rail !== 'solana') return 'skipped';
  if (settlement.status === 'confirmed') return 'already_confirmed';
  if (settlement.status === 'failed') return 'already_failed';
  if (settlement.status !== 'queued' && settlement.status !== 'submitted') {
    return 'skipped';
  }

  const activation = await getSponsoredActivationById(settlement.activation_id);
  if (!activation) {
    return recordSettlementFailure(settlement.id, CODES.activation_not_found);
  }
  const validationError = validateSettlementBundle(settlement, activation);
  if (validationError) {
    return recordSettlementFailure(settlement.id, validationError);
  }

  const connection = options.connection ?? createSolanaSettlementConnection();

  if (settlement.status === 'submitted') {
    const signature = settlement.tx_hash?.trim();
    if (!signature) {
      return recordSettlementFailure(
        settlement.id,
        CODES.submitted_missing_tx_hash
      );
    }
    return confirmWithSignature({
      settlementId: settlement.id,
      connection,
      signature,
      lastValidBlockHeight: parseSolanaSubmissionLastValidBlockHeight(
        settlement.privy_transaction_id
      ),
    });
  }

  const privyWalletId = activation.privy_campaign_wallet_id?.trim();
  if (!privyWalletId) {
    return recordSettlementFailure(
      settlement.id,
      CODES.campaign_wallet_not_configured
    );
  }
  const redemption = await getActivationRedemptionById(
    settlement.redemption_id
  );
  if (!redemption) {
    return recordSettlementFailure(settlement.id, CODES.redemption_not_found);
  }
  if (redemption.status !== 'settlement_pending') {
    return recordSettlementFailure(
      settlement.id,
      CODES.redemption_status_invalid
    );
  }

  const assetConfig = solanaCaddAssetConfigSchema.parse(
    activation.usdc_asset_config
  );
  const built = await buildSolanaCaddTransferTransaction({
    connection,
    campaignAddress: activation.campaign_wallet_address,
    venueAddress: activation.venue_settlement_wallet_address,
    assetConfig,
    amount: settlement.amount,
  });
  if (!built.ok) return recordSettlementFailure(settlement.id, built.reason);

  const signed = await signSolanaCaddTransferWithPrivy({
    privyWalletId,
    campaignAddress: activation.campaign_wallet_address.trim(),
    transaction: built.transaction,
  });
  if (!signed.ok) return recordSettlementFailure(settlement.id, signed.reason);

  // Persist the signature and its expiry height before broadcasting so a crash
  // or ambiguous send can only be resolved by tracking this signature, never by
  // a second transfer while the first could still land.
  const markedSubmitted = await updateActivationSettlementIfStatus({
    settlementId: settlement.id,
    ifStatusIn: ['queued'],
    patch: {
      status: 'submitted',
      tx_hash: signed.signature,
      privy_transaction_id: encodeSolanaSubmissionMetadata(
        built.lastValidBlockHeight
      ),
      submitted_at: new Date().toISOString(),
      submission_attempt: settlement.submission_attempt + 1,
    },
  });
  if (!markedSubmitted) {
    console.warn(
      'processSolanaActivationSettlement: settlement no longer queued; not broadcasting',
      settlement.id
    );
    return 'skipped';
  }
  await trackSettlementEvent(trackSponsoredSettlementSubmitted, settlement.id);

  const broadcast = await broadcastSolanaTransaction({
    connection,
    serializedTransaction: signed.serializedTransaction,
  });
  if (broadcast.status === 'rejected') {
    console.warn(
      'processSolanaActivationSettlement: broadcast rejected',
      settlement.id,
      broadcast.message
    );
    return recordSettlementFailure(
      settlement.id,
      CODES.solana_broadcast_rejected
    );
  }
  if (broadcast.status === 'unknown') {
    console.warn(
      'processSolanaActivationSettlement: broadcast outcome unknown; tracking signature',
      settlement.id,
      broadcast.message
    );
  }

  // One immediate check only; if not yet finalized the row stays `submitted`
  // and the next cron tick confirms it.
  return confirmWithSignature({
    settlementId: settlement.id,
    connection,
    signature: signed.signature,
    lastValidBlockHeight: built.lastValidBlockHeight,
  });
}

export async function runSolanaSettlementWorkerBatch(
  settlements: ActivationSettlementTransactionRow[],
  options: SolanaSettlementWorkerOptions = {}
): Promise<SolanaSettlementWorkerRunSummary> {
  const summary: SolanaSettlementWorkerRunSummary = {
    processed: 0,
    confirmed: 0,
    failed: 0,
    skipped: 0,
    scheduledRetry: 0,
  };

  for (const row of settlements) {
    if (row.settlement_rail !== 'solana') {
      summary.skipped += 1;
      continue;
    }

    summary.processed += 1;
    try {
      const result = await processSolanaActivationSettlement(row, options);
      if (result === 'confirmed' || result === 'already_confirmed') {
        summary.confirmed += 1;
      } else if (result === 'failed' || result === 'already_failed') {
        summary.failed += 1;
      } else if (result === 'retry_scheduled') {
        summary.scheduledRetry += 1;
      } else {
        summary.skipped += 1;
      }
    } catch (error) {
      console.error('processSolanaActivationSettlement:', row.id, error);
      try {
        const latest = await getActivationSettlementTransactionById(row.id);
        if (latest?.status === 'submitted' && latest.tx_hash) {
          // A signature is on record; the next tick must track it, not re-send.
          summary.skipped += 1;
          continue;
        }
        const result = await recordSettlementFailure(
          row.id,
          'worker_exception'
        );
        if (result === 'failed' || result === 'already_failed') {
          summary.failed += 1;
        } else if (result === 'retry_scheduled') {
          summary.scheduledRetry += 1;
        } else {
          summary.skipped += 1;
        }
      } catch (failError) {
        console.error(
          'recordActivationSettlementFailureAtomic after worker_exception:',
          failError
        );
        summary.skipped += 1;
      }
    }
  }

  return summary;
}
