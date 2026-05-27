import type { ActivationSettlementTransactionRow } from '@/lib/db/activation-settlement-transactions';
import {
  resolveServerIdentity,
  trackSponsoredSettlementConfirmed,
  trackSponsoredSettlementFailed,
  trackSponsoredSettlementSubmitted,
} from '@/lib/analytics/server';
import {
  confirmActivationSettlementAtomic,
  getActivationSettlementTransactionById,
  markActivationSettlementSubmitted,
  recordActivationSettlementFailureAtomic,
} from '@/lib/db/activation-settlement-transactions';
import { getActivationRedemptionById } from '@/lib/db/activation-redemptions';
import {
  getSponsoredActivationById,
  type SponsoredActivationRow,
} from '@/lib/db/sponsored-activations';
import { tryGetStellarSponsoredCampaignPublicKey } from '@/lib/activation/stellar-campaign-wallet-config';
import { pollStellarSettlementTxOutcome } from '@/lib/activation/stellar-settlement-horizon';
import { submitStellarActivationSettlementFromCampaign } from '@/lib/activation/stellar-settlement-submit';
import { stellarWalletAddressSchema } from '@/lib/schemas/player';

export type StellarSettlementWorkerItemResult =
  | 'skipped'
  | 'confirmed'
  | 'already_confirmed'
  | 'failed'
  | 'already_failed'
  | 'retry_scheduled';

export type StellarSettlementWorkerRunSummary = {
  processed: number;
  confirmed: number;
  failed: number;
  skipped: number;
  scheduledRetry: number;
};

function normalizeG(address: string): string | null {
  const parsed = stellarWalletAddressSchema.safeParse(
    address.trim().toUpperCase()
  );
  return parsed.success ? parsed.data : null;
}

function validateSettlementBundle(
  settlement: ActivationSettlementTransactionRow,
  activation: SponsoredActivationRow
): string | null {
  if (activation.settlement_rail !== 'stellar') {
    return 'wrong_rail';
  }
  if (settlement.settlement_rail !== 'stellar') {
    return 'wrong_rail';
  }
  const configuredCampaign = tryGetStellarSponsoredCampaignPublicKey();
  if (!configuredCampaign) {
    return 'stellar_campaign_wallet_not_configured';
  }

  const campaign = normalizeG(activation.campaign_wallet_address);
  const venue = normalizeG(activation.venue_settlement_wallet_address);
  const from = normalizeG(settlement.from_wallet_address);
  const to = normalizeG(settlement.to_wallet_address);

  if (!campaign || !venue || !from || !to) {
    return 'stellar_address_invalid';
  }
  if (campaign !== from) {
    return 'campaign_from_mismatch';
  }
  if (campaign !== configuredCampaign) {
    return 'stellar_campaign_wallet_mismatch';
  }
  if (venue !== to) {
    return 'venue_to_mismatch';
  }
  if (campaign === to) {
    return 'campaign_equals_destination';
  }

  return null;
}

async function recordSettlementFailure(
  settlementId: string,
  errorCode: string
): Promise<StellarSettlementWorkerItemResult> {
  const outcome = await recordActivationSettlementFailureAtomic({
    settlementId,
    lastErrorCode: errorCode,
  });
  if (outcome === 'already_confirmed') return 'already_confirmed';
  if (outcome === 'already_failed') return 'already_failed';
  if (outcome === 'retry_scheduled') return 'retry_scheduled';
  if (outcome === 'exhausted') {
    const stRow = await getActivationSettlementTransactionById(settlementId);
    if (stRow) {
      const redemptionTr = await getActivationRedemptionById(
        stRow.redemption_id
      );
      if (redemptionTr) {
        try {
          const distinctId = resolveServerIdentity({
            playerId: redemptionTr.user_id,
          });
          trackSponsoredSettlementFailed(distinctId, {
            activation_id: stRow.activation_id,
            settlement_rail: stRow.settlement_rail,
            user_id: redemptionTr.user_id,
            reward_item_id: redemptionTr.reward_item_id,
            redemption_id: stRow.redemption_id,
            settlement_id: stRow.id,
            status: stRow.status,
            usdc_amount: stRow.amount,
          });
        } catch {
          /* best-effort */
        }
      }
    }
  }
  return 'failed';
}

async function confirmWithTxHash(
  settlementId: string,
  txHash: string
): Promise<StellarSettlementWorkerItemResult> {
  const poll = await pollStellarSettlementTxOutcome(txHash);
  if (poll === 'failed') {
    return recordSettlementFailure(settlementId, 'stellar_tx_failed_on_ledger');
  }
  if (poll === 'pending') {
    // Keep `submitted` + tx_hash for the next cron tick; never clear the hash or
    // re-queue, or a second submit could double-pay while the first tx settles.
    return 'skipped';
  }

  const outcome = await confirmActivationSettlementAtomic({
    settlementId,
    txHash,
  });
  if (outcome === 'confirmed') {
    const stRow = await getActivationSettlementTransactionById(settlementId);
    const redemptionTr = stRow
      ? await getActivationRedemptionById(stRow.redemption_id)
      : null;
    if (stRow && redemptionTr) {
      try {
        const distinctId = resolveServerIdentity({
          playerId: redemptionTr.user_id,
        });
        trackSponsoredSettlementConfirmed(distinctId, {
          activation_id: stRow.activation_id,
          settlement_rail: stRow.settlement_rail,
          user_id: redemptionTr.user_id,
          reward_item_id: redemptionTr.reward_item_id,
          redemption_id: stRow.redemption_id,
          settlement_id: stRow.id,
          status: stRow.status,
          usdc_amount: stRow.amount,
        });
      } catch {
        /* best-effort */
      }
    }
  }
  return outcome === 'already_confirmed' ? 'already_confirmed' : 'confirmed';
}

/** Queued rows submit then confirm; `submitted` rows poll Horizon only. */
export async function processStellarActivationSettlement(
  settlement: ActivationSettlementTransactionRow
): Promise<StellarSettlementWorkerItemResult> {
  if (settlement.settlement_rail !== 'stellar') {
    return 'skipped';
  }

  if (settlement.status === 'confirmed') {
    return 'already_confirmed';
  }
  if (settlement.status === 'failed') {
    return 'already_failed';
  }
  if (settlement.status === 'retrying') {
    return 'skipped';
  }

  const activation = await getSponsoredActivationById(settlement.activation_id);
  if (!activation) {
    return recordSettlementFailure(settlement.id, 'activation_not_found');
  }

  const validationError = validateSettlementBundle(settlement, activation);
  if (validationError) {
    return recordSettlementFailure(settlement.id, validationError);
  }

  if (settlement.status === 'submitted') {
    const txHash = settlement.tx_hash?.trim();
    if (!txHash) {
      return recordSettlementFailure(
        settlement.id,
        'submitted_missing_tx_hash'
      );
    }
    return confirmWithTxHash(settlement.id, txHash);
  }

  if (settlement.status !== 'queued') {
    return 'skipped';
  }

  const submit = await submitStellarActivationSettlementFromCampaign({
    campaignPublicKey: activation.campaign_wallet_address,
    venueSettlementPublicKey: activation.venue_settlement_wallet_address,
    usdcAmount: settlement.amount,
    usdcAssetConfig: activation.usdc_asset_config,
  });

  if (!submit.ok) {
    return recordSettlementFailure(settlement.id, submit.reason);
  }

  const markedSubmitted = await markActivationSettlementSubmitted({
    settlementId: settlement.id,
    txHash: submit.txHash,
  });
  if (markedSubmitted) {
    const redemptionTr = await getActivationRedemptionById(
      settlement.redemption_id
    );
    const stRow =
      (await getActivationSettlementTransactionById(settlement.id)) ??
      settlement;
    if (redemptionTr) {
      try {
        const distinctId = resolveServerIdentity({
          playerId: redemptionTr.user_id,
        });
        trackSponsoredSettlementSubmitted(distinctId, {
          activation_id: stRow.activation_id,
          settlement_rail: stRow.settlement_rail,
          user_id: redemptionTr.user_id,
          reward_item_id: redemptionTr.reward_item_id,
          redemption_id: stRow.redemption_id,
          settlement_id: stRow.id,
          status: stRow.status,
          usdc_amount: stRow.amount,
        });
      } catch {
        /* best-effort */
      }
    }
  }
  if (!markedSubmitted) {
    // Row was no longer `queued` (concurrent worker or DB race). Do not re-submit; still try to confirm this hash on-ledger.
    console.warn(
      'markActivationSettlementSubmitted: no row updated',
      settlement.id,
      submit.txHash
    );
  }

  return confirmWithTxHash(settlement.id, submit.txHash);
}

export async function runStellarSettlementWorkerBatch(
  settlements: ActivationSettlementTransactionRow[]
): Promise<StellarSettlementWorkerRunSummary> {
  const summary: StellarSettlementWorkerRunSummary = {
    processed: 0,
    confirmed: 0,
    failed: 0,
    skipped: 0,
    scheduledRetry: 0,
  };

  for (const row of settlements) {
    if (row.settlement_rail !== 'stellar') {
      summary.skipped += 1;
      continue;
    }

    summary.processed += 1;
    try {
      const result = await processStellarActivationSettlement(row);
      if (result === 'confirmed' || result === 'already_confirmed') {
        summary.confirmed += 1;
      } else if (result === 'failed' || result === 'already_failed') {
        summary.failed += 1;
      } else if (result === 'retry_scheduled') {
        summary.scheduledRetry += 1;
      } else {
        summary.skipped += 1;
      }
    } catch (e) {
      console.error('processStellarActivationSettlement:', row.id, e);
      try {
        const r = await recordActivationSettlementFailureAtomic({
          settlementId: row.id,
          lastErrorCode: 'worker_exception',
        });
        if (r === 'exhausted') {
          const latest = await getActivationSettlementTransactionById(row.id);
          if (latest) {
            const redemptionTr = await getActivationRedemptionById(
              latest.redemption_id
            );
            if (redemptionTr) {
              try {
                const distinctId = resolveServerIdentity({
                  playerId: redemptionTr.user_id,
                });
                trackSponsoredSettlementFailed(distinctId, {
                  activation_id: latest.activation_id,
                  settlement_rail: latest.settlement_rail,
                  user_id: redemptionTr.user_id,
                  reward_item_id: redemptionTr.reward_item_id,
                  redemption_id: latest.redemption_id,
                  settlement_id: latest.id,
                  status: latest.status,
                  usdc_amount: latest.amount,
                });
              } catch {
                /* best-effort */
              }
            }
          }
        }
        if (r === 'exhausted' || r === 'already_failed') {
          summary.failed += 1;
        } else if (r === 'retry_scheduled') {
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
