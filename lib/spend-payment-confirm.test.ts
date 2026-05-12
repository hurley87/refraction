import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetPointConversion = vi.fn();
const mockFetchUserUsdc = vi.fn();
const mockGetSpendTransaction = vi.fn();
const mockRailGate = vi.fn(() => ({ ok: true as const }));

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
import type {
  PointConversion,
  SpendExperience,
  SpendSession,
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
    mockFetchUserUsdc.mockResolvedValue(10);
    mockRailGate.mockReturnValue({ ok: true as const });
    mockGetSpendTransaction.mockResolvedValue(null);
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
        mutation: 'payment_confirm_new_tx',
        spend_rail: 'base_usdc',
        rail_operational: false,
        spend_session_id: session.id,
      })
    );
    expect(
      spendSessions.insertSpendTransactionSubmitted
    ).not.toHaveBeenCalled();
  });
});
