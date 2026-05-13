import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetPointConversion = vi.fn();
const mockFetchUserUsdc = vi.fn();
const mockGetSpendTransaction = vi.fn();
const mockRailGate = vi.fn(
  (
    ...args: unknown[]
  ):
    | { ok: true }
    | {
        ok: false;
        error: string;
        analytics: {
          spend_rail: string;
          rail_operational: false;
          unavailable_reason_codes: string[];
        };
      } => {
    void args;
    return { ok: true as const };
  }
);

vi.mock('@/lib/db/spend-sessions', () => ({
  getPointConversionBySessionId: (...a: unknown[]) =>
    mockGetPointConversion(...a),
  getSpendSessionById: vi.fn(),
  getSpendTransactionBySessionId: (...a: unknown[]) =>
    mockGetSpendTransaction(...a),
  insertSpendTransactionSubmitted: vi.fn(),
  updateSpendSessionStatus: vi.fn(),
  updateSpendTransactionFields: vi.fn(),
  confirmSpendTransactionIfSubmitted: vi.fn(),
}));

const mockGetPaymentPrepare = vi.fn();
const mockPatchPrepare = vi.fn();

vi.mock('@/lib/db/spend-payment-prepare', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/db/spend-payment-prepare')>();
  return {
    ...actual,
    getSpendPaymentPrepareBySessionId: (...a: unknown[]) =>
      mockGetPaymentPrepare(...a),
    patchSpendPaymentPrepare: (...a: unknown[]) => mockPatchPrepare(...a),
  };
});

vi.mock('@/lib/db/treasury-transactions', () => ({
  insertTreasuryReceivePaymentLedgerIfAbsent: vi.fn(),
}));

vi.mock('@/lib/spend-conversion-preview', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/spend-conversion-preview')>();
  return {
    ...actual,
    fetchUserUsdcBalanceSafe: (...a: unknown[]) => mockFetchUserUsdc(...a),
  };
});

vi.mock('@/lib/spend-payment-verify', () => ({
  verifySpendUsdcPaymentTx: vi.fn(),
}));

vi.mock('@/lib/spend-rail-config', () => ({
  getSpendReceivingWalletAddress: () =>
    '0x2222222222222222222222222222222222222222',
  getSpendRailBaseUsdcContractAddress: () =>
    '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  assertSpendRailAllowsMutatingSpendWork: (...a: unknown[]) =>
    mockRailGate(...a),
}));

vi.mock('@/lib/analytics/server', () => ({
  trackSpendPaymentCompleted: vi.fn(),
  trackSpendPaymentConfirmed: vi.fn(),
  trackSpendPaymentFailed: vi.fn(),
  trackSpendPilotRailMutationBlocked: vi.fn(),
}));

import { runSpendPaymentConfirm } from '@/lib/spend-payment-confirm';
import * as analytics from '@/lib/analytics/server';
import * as spendSessions from '@/lib/db/spend-sessions';
import * as spendPaymentVerify from '@/lib/spend-payment-verify';
import type {
  PointConversion,
  SpendExperience,
  SpendSession,
  SpendTransaction,
} from '@/lib/types';

const validHash =
  '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;

const baseSession: SpendSession = {
  id: 'sess-1',
  spend_experience_id: 'exp-1',
  user_id: 'user-1',
  wallet_address: '0x1111111111111111111111111111111111111111',
  spend_rail: 'base_usdc',
  rail_user_wallet_address: '0x1111111111111111111111111111111111111111',
  /** Stale or partial-write state: conversion row exists but session not advanced yet. */
  status: 'created',
  qr_token_hash: null,
  created_at: '2026-01-01T00:00:00.000Z',
  expires_at: '2099-01-01T00:00:00.000Z',
  completed_at: null,
};

const baseExperience: SpendExperience = {
  id: 'exp-1',
  title: 'Test spend',
  description: null,
  event_id: 'evt-1',
  status: 'active',
  spend_rail: 'base_usdc',
  max_usdc_per_user: 5,
  points_to_usdc_rate: 1000,
  treasury_wallet_address: '0x3333333333333333333333333333333333333333',
  receiving_wallet_address: '0x2222222222222222222222222222222222222222',
  privy_server_wallet_id: 'w1',
  server_wallet_address: '0x3333333333333333333333333333333333333333',
  server_wallet_chain: 'base',
  server_wallet_created_at: null,
  spend_create_idempotency_key: null,
  start_time: '2026-01-01T00:00:00.000Z',
  end_time: '2099-12-31T23:59:59.000Z',
  created_by: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

function inProgressConversion(
  status: PointConversion['status']
): PointConversion {
  return {
    id: 'conv-1',
    spend_experience_id: 'exp-1',
    spend_session_id: 'sess-1',
    user_id: 'user-1',
    points_deducted: 5000,
    usdc_amount: 5,
    status,
    spend_rail: 'base_usdc',
    network: 'Base',
    asset_symbol: 'USDC',
    treasury_wallet_address: '0x3333333333333333333333333333333333333333',
    user_wallet_address: baseSession.wallet_address,
    funding_tx_hash: null,
    explorer_tx_url: null,
    idempotency_key: null,
    created_at: '2026-01-01T00:00:00.000Z',
    completed_at: null,
    failed_reason: null,
    updated_at: '2026-01-01T00:00:00.000Z',
  };
}

describe('runSpendPaymentConfirm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPatchPrepare.mockReset();
    mockFetchUserUsdc.mockResolvedValue(10);
    mockRailGate.mockReturnValue({ ok: true as const });
    mockGetSpendTransaction.mockResolvedValue(null);
    mockGetPaymentPrepare.mockResolvedValue({
      id: 'prep-1',
      spend_session_id: baseSession.id,
      user_id: 'user-1',
      spend_rail: 'base_usdc',
      status: 'prepared',
      prepared_action: {},
      verification_snapshot: {
        v: 1,
        spend_rail: 'base_usdc',
        chain_id: 8453,
        usdc_contract: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
        receiving_wallet: '0x2222222222222222222222222222222222222222',
        from_wallet: baseSession.wallet_address.toLowerCase(),
        usdc_amount: 5,
        transfer_calldata: '0x',
      },
      idempotency_key: 'payment:sess-1',
      attempt_count: 0,
      last_failure_reason: null,
      last_failure_at: null,
      last_ambiguity_metadata: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    });
  });

  it('rejects direct USDC payment while a points conversion is still in progress', async () => {
    mockGetPointConversion.mockResolvedValue(
      inProgressConversion('points_deducted')
    );

    const result = await runSpendPaymentConfirm({
      session: baseSession,
      spendExperience: baseExperience,
      normalizedWallet: baseSession.wallet_address.toLowerCase(),
      authUserId: 'user-1',
      distinctId: 'd1',
      paymentTxHash: validHash,
      usdcAmount: 5,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(result.httpStatus).toBe(400);
    expect(result.error).toMatch(/conversion is still in progress/i);
  });

  it('rejects user-signed payment confirm for stellar_usdc via spend payment rail', async () => {
    const stellarExperience = {
      ...baseExperience,
      spend_rail: 'stellar_usdc' as const,
    };
    const stellarSession = {
      ...baseSession,
      spend_rail: 'stellar_usdc' as const,
    };

    const result = await runSpendPaymentConfirm({
      session: stellarSession,
      spendExperience: stellarExperience,
      normalizedWallet: baseSession.wallet_address.toLowerCase(),
      authUserId: 'user-1',
      distinctId: 'd1',
      paymentTxHash: validHash,
      usdcAmount: 5,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(result.httpStatus).toBe(400);
    expect(result.error).toBe(
      'USDC payment verification on this network is not available in this release.'
    );
  });

  it('returns 400 and does not insert when rail blocks new payment tx (HTTP 400 per spend API convention)', async () => {
    mockGetPointConversion.mockResolvedValue(inProgressConversion('funded'));
    mockRailGate.mockReturnValue({
      ok: false as const,
      error:
        'This payment network is temporarily unavailable. Please try again later.',
      analytics: {
        spend_rail: 'base_usdc',
        rail_operational: false as const,
        unavailable_reason_codes: ['Base USDC is turned off in configuration.'],
      },
    });

    const session = {
      ...baseSession,
      status: 'conversion_complete' as const,
    };

    const result = await runSpendPaymentConfirm({
      session,
      spendExperience: baseExperience,
      normalizedWallet: baseSession.wallet_address.toLowerCase(),
      authUserId: 'user-1',
      distinctId: 'd1',
      paymentTxHash: validHash,
      usdcAmount: 5,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(result.httpStatus).toBe(400);
    expect(result.error).toMatch(/temporarily unavailable/i);
    expect(analytics.trackSpendPilotRailMutationBlocked).toHaveBeenCalledWith(
      'd1',
      expect.objectContaining({
        mutation: 'payment_confirm',
        spend_rail: 'base_usdc',
        rail_operational: false,
        spend_session_id: session.id,
      })
    );
    expect(
      spendSessions.insertSpendTransactionSubmitted
    ).not.toHaveBeenCalled();
  });

  it('rejects confirm when no server-prepared payment exists for Base', async () => {
    mockGetPointConversion.mockResolvedValue(inProgressConversion('funded'));
    mockGetPaymentPrepare.mockResolvedValue(null);

    const session = {
      ...baseSession,
      status: 'conversion_complete' as const,
    };

    const result = await runSpendPaymentConfirm({
      session,
      spendExperience: baseExperience,
      normalizedWallet: baseSession.wallet_address.toLowerCase(),
      authUserId: 'user-1',
      distinctId: 'd1',
      paymentTxHash: validHash,
      usdcAmount: 5,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(result.httpStatus).toBe(400);
    expect(result.error).toMatch(/not ready to confirm/i);
  });

  it('rejects confirm while payment operation needs_review', async () => {
    mockGetPointConversion.mockResolvedValue(inProgressConversion('funded'));
    mockGetPaymentPrepare.mockResolvedValue({
      id: 'prep-1',
      spend_session_id: baseSession.id,
      user_id: 'user-1',
      spend_rail: 'base_usdc',
      status: 'needs_review',
      prepared_action: {},
      verification_snapshot: {
        v: 1,
        spend_rail: 'base_usdc',
        chain_id: 8453,
        usdc_contract: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
        receiving_wallet: '0x2222222222222222222222222222222222222222',
        from_wallet: baseSession.wallet_address.toLowerCase(),
        usdc_amount: 5,
        transfer_calldata: '0x',
      },
      idempotency_key: 'payment:sess-1',
      attempt_count: 0,
      last_failure_reason: 'timeout',
      last_failure_at: '2026-01-01T00:00:01.000Z',
      last_ambiguity_metadata: {},
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    });

    const session = {
      ...baseSession,
      status: 'conversion_complete' as const,
    };

    const result = await runSpendPaymentConfirm({
      session,
      spendExperience: baseExperience,
      normalizedWallet: baseSession.wallet_address.toLowerCase(),
      authUserId: 'user-1',
      distinctId: 'd1',
      paymentTxHash: validHash,
      usdcAmount: 5,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(result.httpStatus).toBe(400);
    expect(result.details?.paymentOperation?.status).toBe('needs_review');
    expect(
      spendSessions.insertSpendTransactionSubmitted
    ).not.toHaveBeenCalled();
  });

  it('marks payment operation needs_review and does not mark spend transaction failed when verification is ambiguous', async () => {
    mockGetPointConversion.mockResolvedValue(inProgressConversion('funded'));
    mockGetSpendTransaction.mockResolvedValue(null);

    const submittedTx: SpendTransaction = {
      id: 'tx-1',
      spend_experience_id: 'exp-1',
      spend_session_id: 'sess-1',
      user_id: 'user-1',
      usdc_amount: 5,
      spend_rail: 'base_usdc',
      network: 'Base',
      asset_symbol: 'USDC',
      from_wallet_address: baseSession.wallet_address.toLowerCase(),
      to_wallet_address: '0x2222222222222222222222222222222222222222',
      status: 'submitted',
      payment_tx_hash: validHash,
      explorer_tx_url: null,
      idempotency_key: null,
      created_at: '2026-01-01T00:00:00.000Z',
      completed_at: null,
      failed_reason: null,
      updated_at: '2026-01-01T00:00:00.000Z',
    };

    vi.mocked(spendSessions.insertSpendTransactionSubmitted).mockResolvedValue(
      submittedTx
    );

    vi.mocked(spendPaymentVerify.verifySpendUsdcPaymentTx).mockResolvedValue({
      ok: false,
      reason: 'waitForTransactionReceipt timeout',
    });

    mockPatchPrepare.mockResolvedValue({
      id: 'prep-1',
      spend_session_id: baseSession.id,
      user_id: 'user-1',
      spend_rail: 'base_usdc',
      status: 'needs_review',
      prepared_action: {},
      verification_snapshot: {
        v: 1,
        spend_rail: 'base_usdc',
        chain_id: 8453,
        usdc_contract: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
        receiving_wallet: '0x2222222222222222222222222222222222222222',
        from_wallet: baseSession.wallet_address.toLowerCase(),
        usdc_amount: 5,
        transfer_calldata: '0x',
      },
      idempotency_key: 'payment:sess-1',
      attempt_count: 0,
      last_failure_reason: 'waitForTransactionReceipt timeout',
      last_failure_at: '2026-01-01T00:00:02.000Z',
      last_ambiguity_metadata: { spend_transaction_id: 'tx-1' },
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:02.000Z',
    });

    const session = {
      ...baseSession,
      status: 'conversion_complete' as const,
    };

    const result = await runSpendPaymentConfirm({
      session,
      spendExperience: baseExperience,
      normalizedWallet: baseSession.wallet_address.toLowerCase(),
      authUserId: 'user-1',
      distinctId: 'd1',
      paymentTxHash: validHash,
      usdcAmount: 5,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(result.httpStatus).toBe(400);
    expect(
      mockPatchPrepare.mock.calls.some(
        (args) => (args[1] as { status?: string })?.status === 'needs_review'
      )
    ).toBe(true);
    expect(spendSessions.updateSpendTransactionFields).not.toHaveBeenCalled();
    expect(analytics.trackSpendPaymentFailed).not.toHaveBeenCalled();
  });
});
