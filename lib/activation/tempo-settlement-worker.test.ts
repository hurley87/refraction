import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSettlement = vi.fn();
const mockUpdateSettlement = vi.fn();
const mockConfirmSettlement = vi.fn();
const mockRecordFailure = vi.fn();
const mockGetActivation = vi.fn();
const mockGetRedemption = vi.fn();
const mockGetPlayerWallet = vi.fn();
const mockSubmit = vi.fn();
const mockFindTransfer = vi.fn();
const mockGetTransferStatus = vi.fn();
const mockWaitForTransaction = vi.fn();

vi.mock('@/lib/db/activation-settlement-transactions', () => ({
  getActivationSettlementTransactionById: (...args: unknown[]) =>
    mockGetSettlement(...args),
  updateActivationSettlementIfStatus: (...args: unknown[]) =>
    mockUpdateSettlement(...args),
  confirmActivationSettlementAtomic: (...args: unknown[]) =>
    mockConfirmSettlement(...args),
  recordActivationSettlementFailureAtomic: (...args: unknown[]) =>
    mockRecordFailure(...args),
}));
vi.mock('@/lib/db/sponsored-activations', () => ({
  getSponsoredActivationById: (...args: unknown[]) =>
    mockGetActivation(...args),
}));
vi.mock('@/lib/db/activation-redemptions', () => ({
  getActivationRedemptionById: (...args: unknown[]) =>
    mockGetRedemption(...args),
  syncActivationRedemptionSettlementOutcome: vi.fn(),
}));
vi.mock('@/lib/db/players', () => ({
  getPlayerEvmWalletAddressById: (...args: unknown[]) =>
    mockGetPlayerWallet(...args),
}));
vi.mock('@/lib/activation/tempo-cadd-transfer', () => ({
  submitTempoCaddTransfer: (...args: unknown[]) => mockSubmit(...args),
  findTempoCaddTransfer: (...args: unknown[]) => mockFindTransfer(...args),
  getTempoCaddTransferStatus: (...args: unknown[]) =>
    mockGetTransferStatus(...args),
}));
vi.mock('@/lib/privy-server-rest', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('@/lib/privy-server-rest')>();
  return {
    ...original,
    waitForTransaction: (...args: unknown[]) => mockWaitForTransaction(...args),
  };
});
vi.mock('@/lib/analytics/server', () => ({
  resolveServerIdentity: vi.fn(() => 'test-user'),
  trackSponsoredSettlementSubmitted: vi.fn(),
  trackSponsoredSettlementConfirmed: vi.fn(),
  trackSponsoredSettlementFailed: vi.fn(),
}));

import {
  processTempoActivationSettlement,
  TEMPO_ACTIVATION_SETTLEMENT_ERROR_CODES,
} from '@/lib/activation/tempo-settlement-worker';
import { TEMPO_CADD_CONTRACT_ADDRESS } from '@/lib/activation/tempo-config';

const campaign = '0x1111111111111111111111111111111111111111';
const venue = '0x2222222222222222222222222222222222222222';
const txHash = `0x${'a'.repeat(64)}` as `0x${string}`;

function settlement(overrides: Record<string, unknown> = {}) {
  return {
    id: 'settlement-1',
    redemption_id: 'redemption-1',
    activation_id: 'activation-1',
    settlement_rail: 'tempo',
    status: 'queued',
    amount: 1.5,
    from_wallet_address: campaign,
    to_wallet_address: venue,
    tx_hash: null,
    submission_attempt: 0,
    last_error_code: null,
    queued_at: '2026-01-01T00:00:00.000Z',
    submitted_at: null,
    confirmed_at: null,
    privy_transaction_id: null,
    ...overrides,
  };
}

const activation = {
  id: 'activation-1',
  settlement_rail: 'tempo',
  campaign_wallet_address: campaign,
  venue_settlement_wallet_address: venue,
  usdc_asset_config: {
    contract_address: TEMPO_CADD_CONTRACT_ADDRESS,
    symbol: 'CADD',
  },
  privy_campaign_wallet_id: 'tempo-wallet-1',
};
const redemption = {
  id: 'redemption-1',
  user_id: 42,
  reward_item_id: 'reward-1',
  status: 'settlement_pending',
};

describe('processTempoActivationSettlement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetActivation.mockResolvedValue(activation);
    mockGetRedemption.mockResolvedValue(redemption);
    mockGetPlayerWallet.mockResolvedValue(null);
    mockConfirmSettlement.mockResolvedValue('confirmed');
    mockRecordFailure.mockResolvedValue('retry_scheduled');
    mockGetTransferStatus.mockResolvedValue('success');
    mockUpdateSettlement.mockResolvedValue(
      settlement({
        status: 'submitted',
        submission_attempt: 1,
        privy_transaction_id: 'privy-tempo-1',
      })
    );
  });

  it('submits CADD and confirms only after the matching Tempo event', async () => {
    mockGetSettlement.mockResolvedValueOnce(settlement()).mockResolvedValue(
      settlement({
        status: 'confirmed',
        tx_hash: txHash,
        submission_attempt: 1,
        privy_transaction_id: 'privy-tempo-1',
      })
    );
    mockSubmit.mockResolvedValue({
      ok: true,
      txHash,
      privyTransactionId: 'privy-tempo-1',
    });

    const result = await processTempoActivationSettlement({
      settlementId: 'settlement-1',
    });

    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        serverWalletId: 'tempo-wallet-1',
        serverWalletAddress: campaign,
        recipientAddress: venue,
        caddAmount: 1.5,
        settlementId: 'settlement-1',
        caddContractAddress: TEMPO_CADD_CONTRACT_ADDRESS,
      })
    );
    expect(mockGetTransferStatus).toHaveBeenCalledWith(
      expect.objectContaining({ txHash, settlementId: 'settlement-1' })
    );
    expect(mockConfirmSettlement).toHaveBeenCalledWith(
      expect.objectContaining({ settlementId: 'settlement-1', txHash })
    );
    expect(result.outcome).toBe('confirmed');
  });

  it('does not confirm a successful receipt with a mismatched CADD event', async () => {
    mockGetSettlement.mockResolvedValueOnce(settlement()).mockResolvedValue(
      settlement({
        status: 'retrying',
        last_error_code:
          TEMPO_ACTIVATION_SETTLEMENT_ERROR_CODES.onchain_transfer_mismatch,
      })
    );
    mockSubmit.mockResolvedValue({
      ok: true,
      txHash,
      privyTransactionId: 'privy-tempo-1',
    });
    mockGetTransferStatus.mockResolvedValue('mismatch');

    const result = await processTempoActivationSettlement({
      settlementId: 'settlement-1',
    });

    expect(result.outcome).toBe('retry_scheduled');
    expect(mockConfirmSettlement).not.toHaveBeenCalled();
    expect(mockRecordFailure).toHaveBeenCalledWith({
      settlementId: 'settlement-1',
      lastErrorCode:
        TEMPO_ACTIVATION_SETTLEMENT_ERROR_CODES.onchain_transfer_mismatch,
    });
  });

  it('reconciles a submitted row by memo without broadcasting twice', async () => {
    mockGetSettlement
      .mockResolvedValueOnce(
        settlement({
          status: 'submitted',
          submission_attempt: 1,
          privy_transaction_id: null,
        })
      )
      .mockResolvedValue(settlement({ status: 'confirmed', tx_hash: txHash }));
    mockFindTransfer.mockResolvedValue(txHash);

    const result = await processTempoActivationSettlement({
      settlementId: 'settlement-1',
    });

    expect(mockSubmit).not.toHaveBeenCalled();
    expect(mockFindTransfer).toHaveBeenCalledWith(
      expect.objectContaining({ settlementId: 'settlement-1' })
    );
    expect(result.outcome).toBe('confirmed');
  });
});
