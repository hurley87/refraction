import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SPEND_CONVERSION_FAILED_REQUIRES_RETRY_ACTION,
  SPEND_ELIGIBILITY_MESSAGES,
} from '@/lib/spend-eligibility-messages';
import type {
  SpendExperience,
  SpendSession,
  PointConversion,
} from '@/lib/types';

const mockGetPointConversion = vi.fn();
const mockGetSpendSessionById = vi.fn();
const mockConfirmAtomic = vi.fn();
const mockRetryAtomic = vi.fn();
const mockLoadEligibility = vi.fn();
const mockGetPlayerByWallet = vi.fn();
const mockAssertSpendExperienceOpen = vi.fn();
const mockAssertSpendRailAllows = vi.fn();
const mockGetSpendPaymentRail = vi.fn();
const mockGetTreasuryFundingMeta = vi.fn();
const mockUpdatePointConversionFields = vi.fn();

vi.mock('@/lib/db/spend-sessions', () => ({
  getPointConversionBySessionId: (...a: unknown[]) =>
    mockGetPointConversion(...a),
  getSpendSessionById: (...a: unknown[]) => mockGetSpendSessionById(...a),
  confirmSpendConversionAtomic: (...a: unknown[]) => mockConfirmAtomic(...a),
  retrySpendConversionAfterRefundAtomic: (...a: unknown[]) =>
    mockRetryAtomic(...a),
  refundSpendConversionOnFundingFailure: vi.fn(),
  spendConversionFundingIdempotencyKey: (id: string) => `fund_user:${id}`,
  updatePointConversionFields: (...a: unknown[]) =>
    mockUpdatePointConversionFields(...a),
  updateSpendSessionStatus: vi.fn(),
}));

vi.mock('@/lib/db/players', () => ({
  getPlayerByWallet: (...a: unknown[]) => mockGetPlayerByWallet(...a),
}));

vi.mock('@/lib/spend-conversion-preview', () => ({
  computeConversionAmounts: () => ({ usdcAmount: 5, pointsRequired: 5000 }),
  loadSpendEligibilityForSession: (...a: unknown[]) =>
    mockLoadEligibility(...a),
}));

vi.mock('@/lib/spend-experience-guard', () => ({
  assertSpendExperienceOpenForSessions: (...a: unknown[]) =>
    mockAssertSpendExperienceOpen(...a),
}));

vi.mock('@/lib/spend-rail-config', () => ({
  assertSpendRailAllowsMutatingSpendWork: (...a: unknown[]) =>
    mockAssertSpendRailAllows(...a),
  isSpendRailOperational: () => true,
}));

vi.mock('@/lib/spend-server-wallet', () => ({
  getSpendTreasuryFundingWalletMeta: (...a: unknown[]) =>
    mockGetTreasuryFundingMeta(...a),
}));

vi.mock('@/lib/spend/payment-rails', () => ({
  getSpendPaymentRail: () => mockGetSpendPaymentRail(),
}));

vi.mock('@/lib/tier-progression', () => ({
  checkAndTrackTierProgression: vi.fn(),
}));

vi.mock('@/lib/analytics/server', () => ({
  resolveServerIdentity: () => 'distinct',
  trackSpendConversionCompleted: vi.fn(),
  trackSpendConversionConfirmed: vi.fn(),
  trackSpendConversionFailed: vi.fn(),
  trackSpendPilotRailMutationBlocked: vi.fn(),
  trackSpendTreasuryInsufficientFunds: vi.fn(),
}));

vi.mock('@/lib/spend-treasury-usdc-transfer', () => ({
  findRecentTreasuryUsdcTransfer: vi.fn(),
  getTreasuryTxReceiptStatus: vi.fn(),
  isEvmTxHash: vi.fn(),
}));

vi.mock('@/lib/api/privy', () => ({
  resolvePrivyServerTransactionHash: vi.fn(),
}));

vi.mock('@/lib/db/treasury-transactions', () => ({
  insertTreasuryFundUserLedgerIfAbsent: vi.fn(),
}));

vi.mock('@/lib/spend-ledger-explorer-url', () => ({
  explorerTxUrlForSpendLedger: vi.fn(),
  isStellarTransactionHash: vi.fn(),
  isValidSpendConversionFundingTxReference: vi.fn(),
}));

vi.mock('@/lib/spend/spend-conversion-resume-policy', () => ({
  spendConversionResumeInvokesWalletReadinessOrchestration: () => false,
}));

vi.mock('@/lib/spend/stellar-treasury-funding', () => ({
  getStellarTreasuryFundingTxOutcome: vi.fn(),
}));

import { runSpendConversionConfirm } from '@/lib/spend-conversion-confirm';

const baseSession: SpendSession = {
  id: 'sess-1',
  spend_experience_id: 'exp-1',
  user_id: 'privy-1',
  wallet_address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  spend_rail: 'base_usdc',
  rail_user_wallet_address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  status: 'created',
  qr_token_hash: null,
  created_at: '2026-01-01T00:00:00.000Z',
  expires_at: '2026-12-31T00:00:00.000Z',
  completed_at: null,
};

const baseExperience: SpendExperience = {
  id: 'exp-1',
  title: 'E',
  description: null,
  event_id: null,
  status: 'active',
  spend_rail: 'base_usdc',
  points_to_usdc_rate: 1000,
  max_usdc_per_user: 5,
  treasury_wallet_address: '0x1111111111111111111111111111111111111111',
  receiving_wallet_address: '0x2222222222222222222222222222222222222222',
  privy_server_wallet_id: 'w',
  server_wallet_address: '0x4444444444444444444444444444444444444444',
  server_wallet_chain: 'base',
  server_wallet_created_at: '2026-01-01T00:00:00.000Z',
  spend_create_idempotency_key: 'k',
  start_time: '2026-01-01T00:00:00.000Z',
  end_time: '2030-01-01T00:00:00.000Z',
  created_by: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

function failedConversion(
  attemptCount: number,
  over: Partial<PointConversion> = {}
): PointConversion {
  return {
    id: 'conv-1',
    spend_experience_id: 'exp-1',
    spend_session_id: baseSession.id,
    user_id: 'privy-1',
    points_deducted: 5000,
    usdc_amount: 5,
    status: 'failed',
    spend_rail: 'base_usdc',
    network: 'Base',
    asset_symbol: 'USDC',
    treasury_wallet_address: '0x1111111111111111111111111111111111111111',
    user_wallet_address: baseSession.wallet_address,
    funding_tx_hash: null,
    explorer_tx_url: null,
    idempotency_key: 'fund_user:conv-1',
    conversion_attempt_count: attemptCount,
    conversion_last_failure: {
      recorded_at: '2026-01-01T00:00:00.000Z',
      phase: 'readiness',
      category: 'test',
      reason_snippet: 'x',
    },
    created_at: '2026-01-01T00:00:00.000Z',
    completed_at: '2026-01-01T00:00:01.000Z',
    failed_reason: 'readiness:test',
    updated_at: '2026-01-01T00:00:01.000Z',
    ...over,
  };
}

describe('runSpendConversionConfirm (IRL-17 retry)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSpendSessionById.mockImplementation(async (id: string) => ({
      ...baseSession,
      id,
    }));
    mockAssertSpendExperienceOpen.mockReturnValue({ ok: true as const });
    mockAssertSpendRailAllows.mockReturnValue({ ok: true as const });
    mockGetTreasuryFundingMeta.mockReturnValue({
      spendRail: 'base_usdc',
      walletId: 'wallet-exp-1',
      treasuryAddress: '0x1111111111111111111111111111111111111111',
    });
    mockGetSpendPaymentRail.mockReturnValue({
      getTreasurySpendableBalance: async () => ({
        ok: true as const,
        value: 100,
      }),
      runWalletReadinessOrchestration: vi.fn(),
      initiateUserFunding: vi.fn(),
    });
  });

  it('rejects confirm intent when conversion is failed (explicit retry required)', async () => {
    mockGetPointConversion.mockResolvedValue(failedConversion(1));
    const r = await runSpendConversionConfirm({
      session: baseSession,
      spendExperience: baseExperience,
      normalizedWallet: baseSession.wallet_address.toLowerCase(),
      authUserId: 'privy-1',
      distinctId: 'd',
      usdcAmount: 5,
      pointsRequired: 5000,
      intent: 'confirm',
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected failure');
    expect(r.httpStatus).toBe(400);
    expect(r.error).toBe(SPEND_CONVERSION_FAILED_REQUIRES_RETRY_ACTION);
    expect(mockRetryAtomic).not.toHaveBeenCalled();
    expect(mockConfirmAtomic).not.toHaveBeenCalled();
  });

  it('rejects retry_conversion when there is no failed conversion', async () => {
    mockGetPointConversion.mockResolvedValue(null);
    const r = await runSpendConversionConfirm({
      session: baseSession,
      spendExperience: baseExperience,
      normalizedWallet: baseSession.wallet_address.toLowerCase(),
      authUserId: 'privy-1',
      distinctId: 'd',
      usdcAmount: 5,
      pointsRequired: 5000,
      intent: 'retry_conversion',
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected failure');
    expect(r.httpStatus).toBe(400);
    expect(mockRetryAtomic).not.toHaveBeenCalled();
  });

  it('blocks retry when preview eligibility is not conversion_failed_retryable', async () => {
    mockGetPointConversion.mockResolvedValue(failedConversion(4));
    mockLoadEligibility.mockResolvedValue({
      status: 'conversion_failed_retry_exhausted',
      message: SPEND_ELIGIBILITY_MESSAGES.conversion_failed_retry_exhausted,
      preview: null,
    });
    const r = await runSpendConversionConfirm({
      session: baseSession,
      spendExperience: baseExperience,
      normalizedWallet: baseSession.wallet_address.toLowerCase(),
      authUserId: 'privy-1',
      distinctId: 'd',
      usdcAmount: 5,
      pointsRequired: 5000,
      intent: 'retry_conversion',
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected failure');
    expect(r.error).toBe(
      SPEND_ELIGIBILITY_MESSAGES.conversion_failed_retry_exhausted
    );
    expect(mockRetryAtomic).not.toHaveBeenCalled();
  });

  it('maps retry RPC retry limit errors to user-facing copy', async () => {
    mockGetPointConversion.mockResolvedValue(failedConversion(3));
    mockLoadEligibility.mockResolvedValue({
      status: 'conversion_failed_retryable',
      message: SPEND_ELIGIBILITY_MESSAGES.conversion_failed_retryable,
      preview: {},
    });
    mockGetPlayerByWallet.mockResolvedValue({ total_points: 6000 });
    mockRetryAtomic.mockRejectedValue(
      new Error('Conversion retry limit reached')
    );
    const r = await runSpendConversionConfirm({
      session: baseSession,
      spendExperience: baseExperience,
      normalizedWallet: baseSession.wallet_address.toLowerCase(),
      authUserId: 'privy-1',
      distinctId: 'd',
      usdcAmount: 5,
      pointsRequired: 5000,
      intent: 'retry_conversion',
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected failure');
    expect(r.httpStatus).toBe(400);
    expect(r.error).toBe(
      SPEND_ELIGIBILITY_MESSAGES.conversion_failed_retry_exhausted
    );
  });

  it('uses the experience Base server wallet for conversion RPC and rail funding', async () => {
    const pointConversion: PointConversion = {
      ...failedConversion(0, {
        status: 'points_deducted',
        conversion_attempt_count: 1,
        completed_at: null,
        failed_reason: null,
        conversion_last_failure: null,
      }),
    };
    const initiateUserFunding = vi.fn().mockResolvedValue({
      ok: true as const,
      value: {
        status: 'pending' as const,
        txReference: 'pending:privy-tx-1',
      },
    });
    mockGetSpendPaymentRail.mockReturnValue({
      getTreasurySpendableBalance: async () => ({
        ok: true as const,
        value: 100,
      }),
      runWalletReadinessOrchestration: vi.fn().mockResolvedValue({
        ok: true as const,
        value: { status: 'completed' as const },
      }),
      initiateUserFunding,
    });
    mockGetTreasuryFundingMeta.mockReturnValue({
      spendRail: 'base_usdc',
      walletId: 'wallet-exp-1',
      treasuryAddress: '0x9999999999999999999999999999999999999999',
    });
    mockLoadEligibility.mockResolvedValue({
      status: 'eligible',
      message: 'eligible',
      preview: {},
    });
    mockGetPlayerByWallet.mockResolvedValue({ total_points: 6000 });
    mockConfirmAtomic.mockResolvedValue({
      outcome: 'created',
      conversionId: pointConversion.id,
      playerTotalPoints: 1000,
    });
    mockGetPointConversion
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(pointConversion);
    mockUpdatePointConversionFields.mockResolvedValue({
      ...pointConversion,
      status: 'needs_review',
      funding_tx_hash: 'pending:privy-tx-1',
    });

    const r = await runSpendConversionConfirm({
      session: baseSession,
      spendExperience: {
        ...baseExperience,
        privy_server_wallet_id: 'wallet-exp-1',
        server_wallet_address: '0x9999999999999999999999999999999999999999',
      },
      normalizedWallet: baseSession.wallet_address.toLowerCase(),
      authUserId: 'privy-1',
      distinctId: 'd',
      usdcAmount: 5,
      pointsRequired: 5000,
      intent: 'confirm',
    });

    expect(r.ok).toBe(true);
    expect(mockConfirmAtomic).toHaveBeenCalledWith(
      expect.objectContaining({
        treasuryWalletAddress: '0x9999999999999999999999999999999999999999',
      })
    );
    expect(initiateUserFunding).toHaveBeenCalledWith(
      expect.objectContaining({
        treasuryFundingWalletId: 'wallet-exp-1',
        treasuryFundingWalletAddress:
          '0x9999999999999999999999999999999999999999',
      })
    );
  });

  it('uses fresh Stellar rail wallet after readiness before funding', async () => {
    const evmWallet = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
    const stellarWallet =
      'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
    const staleSession: SpendSession = {
      ...baseSession,
      wallet_address: evmWallet,
      spend_rail: 'stellar_usdc',
      rail_user_wallet_address: null,
    };
    const freshSession: SpendSession = {
      ...staleSession,
      rail_user_wallet_address: stellarWallet,
    };
    const stellarExperience: SpendExperience = {
      ...baseExperience,
      spend_rail: 'stellar_usdc',
      treasury_wallet_address: stellarWallet,
      receiving_wallet_address: stellarWallet,
      server_wallet_address: stellarWallet,
      server_wallet_chain: 'stellar',
      privy_server_wallet_id: null,
    };
    const pointConversion: PointConversion = {
      ...failedConversion(0, {
        status: 'points_deducted',
        spend_rail: 'stellar_usdc',
        network: 'Stellar',
        treasury_wallet_address: stellarWallet,
        user_wallet_address: evmWallet,
        conversion_attempt_count: 1,
        completed_at: null,
        failed_reason: null,
        conversion_last_failure: null,
      }),
    };
    const runWalletReadinessOrchestration = vi.fn().mockResolvedValue({
      ok: true as const,
      value: { status: 'completed' as const },
    });
    const initiateUserFunding = vi.fn().mockResolvedValue({
      ok: true as const,
      value: {
        status: 'submitted' as const,
        txReference: 'a'.repeat(64),
      },
    });
    mockGetSpendPaymentRail.mockReturnValue({
      getTreasurySpendableBalance: async () => ({
        ok: true as const,
        value: 100,
      }),
      runWalletReadinessOrchestration,
      initiateUserFunding,
    });
    mockGetTreasuryFundingMeta.mockReturnValue({
      spendRail: 'stellar_usdc',
      treasuryAddress: stellarWallet,
    });
    mockLoadEligibility.mockResolvedValue({
      status: 'eligible',
      message: 'eligible',
      preview: {},
    });
    mockGetPlayerByWallet.mockResolvedValue({ total_points: 6000 });
    mockConfirmAtomic.mockResolvedValue({
      outcome: 'created',
      conversionId: pointConversion.id,
      playerTotalPoints: 1000,
    });
    mockGetPointConversion
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(pointConversion);
    mockGetSpendSessionById.mockResolvedValue(freshSession);
    mockUpdatePointConversionFields.mockResolvedValue({
      ...pointConversion,
      status: 'needs_review',
      funding_tx_hash: 'a'.repeat(64),
    });

    const r = await runSpendConversionConfirm({
      session: staleSession,
      spendExperience: stellarExperience,
      normalizedWallet: evmWallet.toLowerCase(),
      authUserId: 'privy-1',
      distinctId: 'd',
      usdcAmount: 5,
      pointsRequired: 5000,
      intent: 'confirm',
    });

    expect(r.ok).toBe(true);
    expect(runWalletReadinessOrchestration).toHaveBeenCalledWith(
      expect.objectContaining({
        embeddedEvmWalletAddress: evmWallet,
        stellarFundingDestinationWalletAddress: null,
      })
    );
    expect(initiateUserFunding).toHaveBeenCalledWith(
      expect.objectContaining({
        embeddedEvmWalletAddress: stellarWallet,
        stellarFundingDestinationWalletAddress: stellarWallet,
        railUserWalletAddress: stellarWallet,
      })
    );
    expect(initiateUserFunding).not.toHaveBeenCalledWith(
      expect.objectContaining({
        stellarFundingDestinationWalletAddress: evmWallet,
      })
    );
  });
});
