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

vi.mock('@/lib/db/spend-sessions', () => ({
  getPointConversionBySessionId: (...a: unknown[]) =>
    mockGetPointConversion(...a),
  getSpendSessionById: (...a: unknown[]) => mockGetSpendSessionById(...a),
  confirmSpendConversionAtomic: (...a: unknown[]) => mockConfirmAtomic(...a),
  retrySpendConversionAfterRefundAtomic: (...a: unknown[]) =>
    mockRetryAtomic(...a),
  refundSpendConversionOnFundingFailure: vi.fn(),
  spendConversionFundingIdempotencyKey: (id: string) => `fund_user:${id}`,
  updatePointConversionFields: vi.fn(),
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
});
