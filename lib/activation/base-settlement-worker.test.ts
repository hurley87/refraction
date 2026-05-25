import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSettlementById = vi.fn();
const mockUpdateSettlement = vi.fn();
const mockUpdateSettlementIfStatus = vi.fn();
const mockGetActivationById = vi.fn();
const mockGetRedemptionById = vi.fn();
const mockSyncRedemption = vi.fn();
const mockGetPlayerWallet = vi.fn();
const mockSubmitTreasury = vi.fn();
const mockFindRecent = vi.fn();
const mockGetReceiptStatus = vi.fn();
const mockWaitForTransaction = vi.fn();

vi.mock('@/lib/db/activation-settlement-transactions', () => ({
  getActivationSettlementTransactionById: (...a: unknown[]) =>
    mockGetSettlementById(...a),
  updateActivationSettlementTransaction: (...a: unknown[]) =>
    mockUpdateSettlement(...a),
  updateActivationSettlementIfStatus: (...a: unknown[]) =>
    mockUpdateSettlementIfStatus(...a),
}));

vi.mock('@/lib/db/sponsored-activations', () => ({
  getSponsoredActivationById: (...a: unknown[]) => mockGetActivationById(...a),
}));

vi.mock('@/lib/db/activation-redemptions', () => ({
  getActivationRedemptionById: (...a: unknown[]) => mockGetRedemptionById(...a),
  syncActivationRedemptionSettlementOutcome: (...a: unknown[]) =>
    mockSyncRedemption(...a),
}));

vi.mock('@/lib/db/players', () => ({
  getPlayerEvmWalletAddressById: (...a: unknown[]) => mockGetPlayerWallet(...a),
}));

vi.mock('@/lib/spend-treasury-usdc-transfer', () => ({
  submitTreasuryUsdcTransfer: (...a: unknown[]) => mockSubmitTreasury(...a),
  findRecentTreasuryUsdcTransfer: (...a: unknown[]) => mockFindRecent(...a),
  getTreasuryTxReceiptStatus: (...a: unknown[]) => mockGetReceiptStatus(...a),
}));

vi.mock('@/lib/privy-server-rest', () => {
  class PrivyRestNotConfiguredError extends Error {
    name = 'PrivyRestNotConfiguredError';
  }
  class PrivyRestTransactionFailedError extends Error {
    name = 'PrivyRestTransactionFailedError';
  }
  class PrivyRestTransactionTimeoutError extends Error {
    name = 'PrivyRestTransactionTimeoutError';
    constructor(public transactionId: string) {
      super('timeout');
    }
  }
  return {
    PrivyRestNotConfiguredError,
    PrivyRestTransactionFailedError,
    PrivyRestTransactionTimeoutError,
    waitForTransaction: (...a: unknown[]) => mockWaitForTransaction(...a),
  };
});

import {
  BASE_ACTIVATION_SETTLEMENT_ERROR_CODES,
  processBaseActivationSettlement,
} from '@/lib/activation/base-settlement-worker';
import { PrivyRestTransactionTimeoutError } from '@/lib/privy-server-rest';

const campaign = '0x1111111111111111111111111111111111111111';
const venue = '0x2222222222222222222222222222222222222222';
const usdc = '0x1234567890123456789012345678901234567890';
const txHash =
  '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

function baseActivation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'act-1',
    settlement_rail: 'base',
    campaign_wallet_address: campaign,
    venue_settlement_wallet_address: venue,
    usdc_asset_config: { contract_address: usdc },
    privy_campaign_wallet_id: 'privy-wallet-1',
    ...overrides,
  };
}

function baseSettlement(overrides: Record<string, unknown> = {}) {
  return {
    id: 'settle-1',
    redemption_id: 'red-1',
    activation_id: 'act-1',
    settlement_rail: 'base',
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

function baseRedemption(overrides: Record<string, unknown> = {}) {
  return {
    id: 'red-1',
    activation_id: 'act-1',
    reward_item_id: 'item-1',
    user_id: 42,
    eligibility_event_id: 'elig-1',
    status: 'settlement_pending',
    idempotency_key: 'key',
    points_spent: null,
    usdc_amount_snapshot: 1.5,
    purchase_confirmed_at: null,
    redeemed_at: '2026-01-01T00:00:00.000Z',
    cancelled_reason: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('processBaseActivationSettlement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateSettlement.mockImplementation(
      async (_id: string, patch: object) => ({
        ...baseSettlement(),
        ...patch,
      })
    );
    mockUpdateSettlementIfStatus.mockImplementation(
      async (_input: { patch: object }) => ({
        ...baseSettlement({ status: 'submitted' }),
        ...(_input as { patch: object }).patch,
      })
    );
    mockGetReceiptStatus.mockResolvedValue('success');
    mockGetPlayerWallet.mockResolvedValue(null);
  });

  it('skips when settlement rail is not base', async () => {
    mockGetSettlementById.mockResolvedValue(
      baseSettlement({ settlement_rail: 'stellar' })
    );
    const r = await processBaseActivationSettlement({
      settlementId: 'settle-1',
    });
    expect(r).toEqual({
      outcome: 'skipped',
      reason: 'settlement_rail_not_base',
    });
    expect(mockSubmitTreasury).not.toHaveBeenCalled();
  });

  it('skips when activation rail is not base', async () => {
    mockGetSettlementById.mockResolvedValue(baseSettlement());
    mockGetActivationById.mockResolvedValue(
      baseActivation({ settlement_rail: 'stellar' })
    );
    const r = await processBaseActivationSettlement({
      settlementId: 'settle-1',
    });
    expect(r).toEqual({
      outcome: 'skipped',
      reason: 'activation_rail_not_base',
    });
    expect(mockSubmitTreasury).not.toHaveBeenCalled();
  });

  it('happy path: submits with activation USDC contract, confirms, syncs redemption', async () => {
    mockGetSettlementById
      .mockResolvedValueOnce(baseSettlement())
      .mockResolvedValue({
        ...baseSettlement({
          status: 'confirmed',
          tx_hash: txHash,
          privy_transaction_id: 'privy-tx-1',
          submission_attempt: 1,
        }),
      });
    mockGetActivationById.mockResolvedValue(baseActivation());
    mockGetRedemptionById.mockResolvedValue(baseRedemption());
    mockSubmitTreasury.mockResolvedValue({
      ok: true,
      txHash: txHash as `0x${string}`,
      privyTransactionId: 'privy-tx-1',
      privyStatus: 'finalized',
    });
    mockUpdateSettlementIfStatus.mockResolvedValue({
      ...baseSettlement({
        status: 'submitted',
        privy_transaction_id: 'privy-tx-1',
      }),
    });

    const r = await processBaseActivationSettlement({
      settlementId: 'settle-1',
    });

    expect(mockSubmitTreasury).toHaveBeenCalledWith(
      expect.objectContaining({
        serverWalletId: 'privy-wallet-1',
        serverWalletAddress: campaign,
        recipientAddress: venue,
        usdcAmount: 1.5,
        usdcContractAddress: usdc,
        referenceId: 'activation-settlement:settle-1',
      })
    );
    expect(r.outcome).toBe('confirmed');
    if (r.outcome === 'confirmed') {
      expect(r.txHash).toBe(txHash);
    }
    expect(mockSyncRedemption).toHaveBeenCalledWith({
      redemptionId: 'red-1',
      nextStatus: 'settlement_confirmed',
    });
  });

  it('fails venue guard when to_wallet_address does not match activation venue', async () => {
    mockGetSettlementById.mockResolvedValue(
      baseSettlement({
        to_wallet_address: '0x3333333333333333333333333333333333333333',
      })
    );
    mockGetActivationById.mockResolvedValue(baseActivation());
    mockGetRedemptionById.mockResolvedValue(baseRedemption());

    const r = await processBaseActivationSettlement({
      settlementId: 'settle-1',
    });

    expect(r.outcome).toBe('config_or_validation_failed');
    expect(mockSubmitTreasury).not.toHaveBeenCalled();
    expect(mockUpdateSettlement).toHaveBeenCalledWith(
      'settle-1',
      expect.objectContaining({
        status: 'failed',
        last_error_code:
          BASE_ACTIVATION_SETTLEMENT_ERROR_CODES.venue_wallet_mismatch,
      })
    );
  });

  it('fails when recipient would be user embedded wallet', async () => {
    mockGetSettlementById.mockResolvedValue(baseSettlement());
    mockGetActivationById.mockResolvedValue(baseActivation());
    mockGetRedemptionById.mockResolvedValue(baseRedemption());
    mockGetPlayerWallet.mockResolvedValue(venue);

    const r = await processBaseActivationSettlement({
      settlementId: 'settle-1',
    });

    expect(r.outcome).toBe('config_or_validation_failed');
    expect(mockSubmitTreasury).not.toHaveBeenCalled();
    expect(mockUpdateSettlement).toHaveBeenCalledWith(
      'settle-1',
      expect.objectContaining({
        last_error_code:
          BASE_ACTIVATION_SETTLEMENT_ERROR_CODES.recipient_is_user_wallet,
      })
    );
  });

  it('idempotent when already confirmed', async () => {
    mockGetSettlementById.mockResolvedValue(
      baseSettlement({
        status: 'confirmed',
        tx_hash: txHash,
      })
    );
    mockGetActivationById.mockResolvedValue(baseActivation());
    mockGetRedemptionById.mockResolvedValue(
      baseRedemption({ status: 'settlement_confirmed' })
    );

    const r = await processBaseActivationSettlement({
      settlementId: 'settle-1',
    });
    expect(r).toMatchObject({
      outcome: 'idempotent_confirmed',
      txHash,
    });
    expect(mockSubmitTreasury).not.toHaveBeenCalled();
  });

  it('idempotent replay on submitted: resolves hash via chain scan without second submit', async () => {
    mockGetSettlementById
      .mockResolvedValueOnce(
        baseSettlement({
          status: 'submitted',
          privy_transaction_id: 'privy-tx-old',
          submission_attempt: 1,
        })
      )
      .mockResolvedValue({
        ...baseSettlement({
          status: 'confirmed',
          tx_hash: txHash,
          privy_transaction_id: 'privy-tx-old',
          submission_attempt: 1,
        }),
      });
    mockGetActivationById.mockResolvedValue(baseActivation());
    mockGetRedemptionById.mockResolvedValue(baseRedemption());
    mockWaitForTransaction.mockRejectedValue(
      new PrivyRestTransactionTimeoutError('privy-tx-old')
    );
    mockFindRecent.mockResolvedValue(txHash as `0x${string}`);

    const r = await processBaseActivationSettlement({
      settlementId: 'settle-1',
    });

    expect(mockSubmitTreasury).not.toHaveBeenCalled();
    expect(mockFindRecent).toHaveBeenCalledWith(
      expect.objectContaining({
        erc20ContractAddress: usdc,
        usdcAmount: 1.5,
      })
    );
    expect(r.outcome).toBe('confirmed');
  });

  it('insufficient campaign USDC → settlement_failed + error code', async () => {
    mockGetSettlementById.mockResolvedValue(baseSettlement());
    mockGetActivationById.mockResolvedValue(baseActivation());
    mockGetRedemptionById.mockResolvedValue(baseRedemption());
    mockSubmitTreasury.mockResolvedValue({
      ok: false,
      error: 'ERC20: transfer amount exceeds balance',
    });

    const r = await processBaseActivationSettlement({
      settlementId: 'settle-1',
    });

    expect(r.outcome).toBe('terminal_failed');
    if (r.outcome === 'terminal_failed') {
      expect(r.lastErrorCode).toBe(
        BASE_ACTIVATION_SETTLEMENT_ERROR_CODES.insufficient_campaign_usdc
      );
    }
    expect(mockUpdateSettlement).toHaveBeenCalledWith(
      'settle-1',
      expect.objectContaining({
        status: 'failed',
      })
    );
  });

  it('missing privy_campaign_wallet_id → failed without submit', async () => {
    mockGetSettlementById.mockResolvedValue(baseSettlement());
    mockGetActivationById.mockResolvedValue(
      baseActivation({ privy_campaign_wallet_id: null })
    );
    mockGetRedemptionById.mockResolvedValue(baseRedemption());

    const r = await processBaseActivationSettlement({
      settlementId: 'settle-1',
    });

    expect(r.outcome).toBe('config_or_validation_failed');
    expect(mockSubmitTreasury).not.toHaveBeenCalled();
    expect(mockUpdateSettlement).toHaveBeenCalledWith(
      'settle-1',
      expect.objectContaining({
        last_error_code:
          BASE_ACTIVATION_SETTLEMENT_ERROR_CODES.campaign_wallet_not_configured,
      })
    );
  });

  it('Privy REST not configured → config failure after submit attempt', async () => {
    const { PrivyRestNotConfiguredError } =
      await import('@/lib/privy-server-rest');
    mockGetSettlementById.mockResolvedValue(baseSettlement());
    mockGetActivationById.mockResolvedValue(baseActivation());
    mockGetRedemptionById.mockResolvedValue(baseRedemption());
    mockSubmitTreasury.mockRejectedValue(new PrivyRestNotConfiguredError());

    const r = await processBaseActivationSettlement({
      settlementId: 'settle-1',
    });

    expect(r.outcome).toBe('config_or_validation_failed');
    expect(mockSubmitTreasury).toHaveBeenCalled();
  });
});
