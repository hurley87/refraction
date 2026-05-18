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

const { mockTryClaim } = vi.hoisted(() => ({
  mockTryClaim: vi.fn(),
}));

vi.mock('@/lib/db/spend-payment-prepare', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/db/spend-payment-prepare')>();
  return {
    ...actual,
    getSpendPaymentPrepareBySessionId: (...a: unknown[]) =>
      mockGetPaymentPrepare(...a),
    patchSpendPaymentPrepare: (...a: unknown[]) => mockPatchPrepare(...a),
    tryClaimSpendPaymentPrepareForStellarSubmit: (...a: unknown[]) =>
      mockTryClaim(...a),
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

vi.mock('@/lib/spend-payment-verify-stellar', () => ({
  verifySpendStellarUsdcPaymentTx: vi.fn(),
}));

const { mockStellarConfirmPayment } = vi.hoisted(() => ({
  mockStellarConfirmPayment: vi.fn(),
}));

vi.mock('@/lib/spend/payment-rails/registry', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/spend/payment-rails/registry')>();
  return {
    ...actual,
    getSpendPaymentRail: (rail: string) => {
      if (rail === 'stellar_usdc') {
        return { confirmPayment: mockStellarConfirmPayment };
      }
      return actual.getSpendPaymentRail(
        rail as import('@/lib/types').SpendRail
      );
    },
  };
});

vi.mock('@/lib/spend-rail-config', () => ({
  getSpendReceivingWalletAddress: (spendRail: string) =>
    spendRail === 'stellar_usdc'
      ? 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H'
      : '0x2222222222222222222222222222222222222222',
  getSpendRailBaseUsdcContractAddress: () =>
    '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  assertSpendRailAllowsMutatingSpendWork: (...a: unknown[]) =>
    mockRailGate(...a),
}));

vi.mock('@/lib/spend/stellar-wallet-readiness-config', () => ({
  getStellarSpendUsdcIssuer: () =>
    'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
  getStellarSpendUsdcAssetCode: () => 'USDC',
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
import * as stellarVerify from '@/lib/spend-payment-verify-stellar';
import { spendRailErrorPaymentFailed } from '@/lib/spend/payment-rails/errors';
import { getSpendReceivingWalletAddress } from '@/lib/spend-rail-config';
import {
  getStellarSpendUsdcAssetCode,
  getStellarSpendUsdcIssuer,
} from '@/lib/spend/stellar-wallet-readiness-config';
import type {
  PointConversion,
  SpendExperience,
  SpendPaymentPrepareOperation,
  SpendPaymentPrepareOperationStatus,
  SpendSession,
  SpendTransaction,
} from '@/lib/types';

const validHash =
  '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;

const STELLAR_RAIL_WALLET =
  'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const STELLAR_LEDGER_HASH = 'a'.repeat(64);

function buildStellarPrepareRow(
  status: SpendPaymentPrepareOperationStatus,
  sessionId: string
): SpendPaymentPrepareOperation {
  const receivingWallet = getSpendReceivingWalletAddress('stellar_usdc').trim();
  const usdcIssuer = getStellarSpendUsdcIssuer() ?? '';
  const usdcCode = getStellarSpendUsdcAssetCode();
  return {
    id: 'prep-stellar',
    spend_session_id: sessionId,
    user_id: 'user-1',
    spend_rail: 'stellar_usdc',
    status,
    prepared_action: {},
    verification_snapshot: {
      v: 1,
      spend_rail: 'stellar_usdc',
      from_wallet: STELLAR_RAIL_WALLET,
      receiving_wallet: receivingWallet,
      usdc_amount: 5,
      usdc_asset_code: usdcCode,
      usdc_issuer: usdcIssuer,
    },
    idempotency_key: `payment:${sessionId}`,
    attempt_count: 0,
    last_failure_reason: null,
    last_failure_at: null,
    last_ambiguity_metadata: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };
}

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

const stellarExperience: SpendExperience = {
  ...baseExperience,
  spend_rail: 'stellar_usdc',
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
    conversion_attempt_count: 1,
    conversion_last_failure: null,
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
    mockTryClaim.mockReset();
    mockStellarConfirmPayment.mockReset();
    vi.mocked(stellarVerify.verifySpendStellarUsdcPaymentTx).mockReset();
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

  it('rejects Stellar payment confirm without stellarBackendConfirm', async () => {
    mockGetPointConversion.mockResolvedValue(inProgressConversion('funded'));
    const stellarExperience = {
      ...baseExperience,
      spend_rail: 'stellar_usdc' as const,
    };
    const stellarSession = {
      ...baseSession,
      spend_rail: 'stellar_usdc' as const,
      status: 'conversion_complete' as const,
      rail_user_wallet_address:
        'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    };

    const result = await runSpendPaymentConfirm({
      session: stellarSession,
      spendExperience: stellarExperience,
      normalizedWallet: baseSession.wallet_address.toLowerCase(),
      authUserId: 'user-1',
      distinctId: 'd1',
      paymentTxHash: undefined,
      usdcAmount: 5,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(result.httpStatus).toBe(400);
    expect(result.error).toMatch(/in-app Stellar payment confirmation/i);
  });

  it('rejects Stellar payment confirm when paymentTxHash is sent', async () => {
    mockGetPointConversion.mockResolvedValue(inProgressConversion('funded'));
    const stellarExperience = {
      ...baseExperience,
      spend_rail: 'stellar_usdc' as const,
    };
    const stellarSession = {
      ...baseSession,
      spend_rail: 'stellar_usdc' as const,
      status: 'conversion_complete' as const,
      rail_user_wallet_address:
        'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    };

    const result = await runSpendPaymentConfirm({
      session: stellarSession,
      spendExperience: stellarExperience,
      normalizedWallet: baseSession.wallet_address.toLowerCase(),
      authUserId: 'user-1',
      distinctId: 'd1',
      paymentTxHash: validHash,
      stellarBackendConfirm: true,
      usdcAmount: 5,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(result.httpStatus).toBe(400);
    expect(result.error).toMatch(/Do not send paymentTxHash/i);
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

  it('Stellar backend: two parallel confirms invoke confirmPayment at most once (prepare lock)', async () => {
    const sessionId = 'sess-stellar-lock';
    const stellarSession: SpendSession = {
      ...baseSession,
      id: sessionId,
      spend_experience_id: 'exp-1',
      spend_rail: 'stellar_usdc',
      status: 'conversion_complete',
      rail_user_wallet_address: STELLAR_RAIL_WALLET,
    };

    mockGetPointConversion.mockResolvedValue({
      ...inProgressConversion('funded'),
      spend_session_id: sessionId,
      spend_rail: 'stellar_usdc',
    });

    mockStellarConfirmPayment.mockResolvedValue({
      ok: true,
      value: {
        status: 'submitted',
        ledgerTxReference: STELLAR_LEDGER_HASH,
      },
    });
    vi.mocked(stellarVerify.verifySpendStellarUsdcPaymentTx).mockResolvedValue({
      ok: true,
    });
    vi.mocked(
      spendSessions.confirmSpendTransactionIfSubmitted
    ).mockResolvedValue({
      completed_at: '2026-01-02T00:00:00.000Z',
    } as never);
    vi.mocked(spendSessions.insertSpendTransactionSubmitted).mockResolvedValue({
      id: 'tx-stellar',
      spend_experience_id: 'exp-1',
      spend_session_id: sessionId,
      user_id: 'user-1',
      usdc_amount: 5,
      spend_rail: 'stellar_usdc',
      network: 'Stellar',
      asset_symbol: 'USDC',
      from_wallet_address: STELLAR_RAIL_WALLET,
      to_wallet_address: getSpendReceivingWalletAddress('stellar_usdc').trim(),
      status: 'submitted',
      payment_tx_hash: STELLAR_LEDGER_HASH,
      explorer_tx_url: null,
      idempotency_key: null,
      created_at: '2026-01-01T00:00:00.000Z',
      completed_at: null,
      failed_reason: null,
      updated_at: '2026-01-01T00:00:00.000Z',
    } satisfies SpendTransaction);

    let livePrepare = buildStellarPrepareRow('prepared', sessionId);
    mockPatchPrepare.mockImplementation(async (_id, patch) => {
      livePrepare = {
        ...livePrepare,
        ...patch,
        status: (patch.status ??
          livePrepare.status) as SpendPaymentPrepareOperationStatus,
        last_failure_reason:
          patch.lastFailureReason !== undefined
            ? patch.lastFailureReason
            : livePrepare.last_failure_reason,
        last_failure_at:
          patch.lastFailureAt !== undefined
            ? patch.lastFailureAt
            : livePrepare.last_failure_at,
        last_ambiguity_metadata:
          patch.lastAmbiguityMetadata !== undefined
            ? patch.lastAmbiguityMetadata
            : livePrepare.last_ambiguity_metadata,
      };
      return livePrepare;
    });

    // Serialize tryClaim so concurrent confirms hit the mock like a single DB winner
    // (only one call returns the claimed row; others see null then resume or 409).
    let tryClaimChain = Promise.resolve();
    const enqueueTryClaim = <T>(fn: () => Promise<T>): Promise<T> => {
      const next = tryClaimChain.then(fn);
      tryClaimChain = next.then(
        () => undefined,
        () => undefined
      );
      return next;
    };

    let winnerChosen = false;
    let lostRaceNextPrepareRead = false;
    mockTryClaim.mockImplementation(async () =>
      enqueueTryClaim(async () => {
        if (!winnerChosen) {
          winnerChosen = true;
          return buildStellarPrepareRow('submitting', sessionId);
        }
        lostRaceNextPrepareRead = true;
        return null;
      })
    );

    mockGetPaymentPrepare.mockImplementation(async () => {
      if (lostRaceNextPrepareRead) {
        lostRaceNextPrepareRead = false;
        return buildStellarPrepareRow('submitting', sessionId);
      }
      return { ...livePrepare };
    });

    mockGetSpendTransaction.mockResolvedValue(null);
    vi.mocked(spendSessions.getSpendSessionById).mockResolvedValue({
      ...stellarSession,
      status: 'payment_complete',
    });

    const confirmArgs = {
      session: stellarSession,
      spendExperience: stellarExperience,
      normalizedWallet: baseSession.wallet_address.toLowerCase(),
      authUserId: 'user-1',
      distinctId: 'd1',
      usdcAmount: 5,
      stellarBackendConfirm: true as const,
    };

    const [first, second] = await Promise.all([
      runSpendPaymentConfirm(confirmArgs),
      runSpendPaymentConfirm(confirmArgs),
    ]);

    expect(mockStellarConfirmPayment).toHaveBeenCalledTimes(1);
    const httpStatuses = [first, second].map((r) => r.httpStatus);
    expect(httpStatuses).toContain(409);
    expect([first, second].some((r) => r.ok)).toBe(true);
  });

  it('Stellar backend resume: submitted prepare + ledger hash skips confirmPayment', async () => {
    const sessionId = 'sess-stellar-resume';
    const stellarSession: SpendSession = {
      ...baseSession,
      id: sessionId,
      spend_experience_id: 'exp-1',
      spend_rail: 'stellar_usdc',
      status: 'conversion_complete',
      rail_user_wallet_address: STELLAR_RAIL_WALLET,
    };

    mockGetPointConversion.mockResolvedValue({
      ...inProgressConversion('funded'),
      spend_session_id: sessionId,
      spend_rail: 'stellar_usdc',
    });
    mockGetPaymentPrepare.mockResolvedValue(
      buildStellarPrepareRow('submitted', sessionId)
    );
    mockGetSpendTransaction.mockResolvedValue({
      id: 'tx-resume',
      spend_experience_id: 'exp-1',
      spend_session_id: sessionId,
      user_id: 'user-1',
      usdc_amount: 5,
      spend_rail: 'stellar_usdc',
      network: 'Stellar',
      asset_symbol: 'USDC',
      from_wallet_address: STELLAR_RAIL_WALLET,
      to_wallet_address: getSpendReceivingWalletAddress('stellar_usdc').trim(),
      status: 'submitted',
      payment_tx_hash: STELLAR_LEDGER_HASH,
      explorer_tx_url: null,
      idempotency_key: null,
      created_at: '2026-01-01T00:00:00.000Z',
      completed_at: null,
      failed_reason: null,
      updated_at: '2026-01-01T00:00:00.000Z',
    } satisfies SpendTransaction);

    vi.mocked(stellarVerify.verifySpendStellarUsdcPaymentTx).mockResolvedValue({
      ok: true,
    });
    vi.mocked(
      spendSessions.confirmSpendTransactionIfSubmitted
    ).mockResolvedValue({
      completed_at: '2026-01-02T00:00:00.000Z',
    } as never);
    vi.mocked(spendSessions.getSpendSessionById).mockResolvedValue({
      ...stellarSession,
      status: 'payment_complete',
    });

    await runSpendPaymentConfirm({
      session: stellarSession,
      spendExperience: stellarExperience,
      normalizedWallet: baseSession.wallet_address.toLowerCase(),
      authUserId: 'user-1',
      distinctId: 'd1',
      usdcAmount: 5,
      stellarBackendConfirm: true,
    });

    expect(mockStellarConfirmPayment).not.toHaveBeenCalled();
    expect(mockTryClaim).not.toHaveBeenCalled();
  });

  it('Stellar backend: rail rejects submit after winning prepare lock marks prepare failed', async () => {
    const sessionId = 'sess-stellar-reject';
    const stellarSession: SpendSession = {
      ...baseSession,
      id: sessionId,
      spend_experience_id: 'exp-1',
      spend_rail: 'stellar_usdc',
      status: 'conversion_complete',
      rail_user_wallet_address: STELLAR_RAIL_WALLET,
    };

    mockGetPointConversion.mockResolvedValue({
      ...inProgressConversion('funded'),
      spend_session_id: sessionId,
      spend_rail: 'stellar_usdc',
    });
    mockGetPaymentPrepare.mockResolvedValue(
      buildStellarPrepareRow('prepared', sessionId)
    );
    mockTryClaim.mockResolvedValue(
      buildStellarPrepareRow('submitting', sessionId)
    );
    mockStellarConfirmPayment.mockResolvedValue({
      ok: false,
      error: spendRailErrorPaymentFailed(),
    });

    const result = await runSpendPaymentConfirm({
      session: stellarSession,
      spendExperience: stellarExperience,
      normalizedWallet: baseSession.wallet_address.toLowerCase(),
      authUserId: 'user-1',
      distinctId: 'd1',
      usdcAmount: 5,
      stellarBackendConfirm: true,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(mockStellarConfirmPayment).toHaveBeenCalledTimes(1);
    expect(
      mockPatchPrepare.mock.calls.some(
        (args) => (args[1] as { status?: string })?.status === 'failed'
      )
    ).toBe(true);
  });
});
