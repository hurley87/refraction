import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SPEND_RAIL_ANALYTICS_CODES,
  spendRailErrorWalletReadinessFailed,
} from '@/lib/spend/payment-rails/errors';

const hoisted = vi.hoisted(() => ({
  mockInsertOrGet: vi.fn(),
  mockUpdateReadiness: vi.fn(),
  mockUpdateSessionRail: vi.fn(),
  mockOrchestrator: vi.fn(),
}));

vi.mock('@/lib/db/spend-wallet-readiness', () => ({
  insertPendingSpendWalletReadinessOrGet: (...a: unknown[]) =>
    hoisted.mockInsertOrGet(...a),
  updateSpendWalletReadinessFields: (...a: unknown[]) =>
    hoisted.mockUpdateReadiness(...a),
}));

vi.mock('@/lib/db/spend-sessions', () => ({
  updateSpendSessionRailUserWalletAddress: (...a: unknown[]) =>
    hoisted.mockUpdateSessionRail(...a),
}));

vi.mock('@/lib/spend/stellar-wallet-readiness-orchestration', () => ({
  runStellarUsdcWalletReadinessOrchestration: (...a: unknown[]) =>
    hoisted.mockOrchestrator(...a),
}));

const hoistedTreasury = vi.hoisted(() => ({
  readBal: vi.fn(),
  submit: vi.fn(),
}));

vi.mock('@/lib/spend/stellar-treasury-funding', () => ({
  readStellarTreasuryConfirmedUsdcBalance: (...a: unknown[]) =>
    hoistedTreasury.readBal(...a),
  loadStellarTreasuryAccountWithConfirmedUsdcBalance: async (
    ...a: unknown[]
  ) => {
    const balance = await hoistedTreasury.readBal(...a);
    return {
      balance: balance as number,
      account: {
        account_id: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      },
    };
  },
  submitStellarTreasuryUsdcFunding: (...a: unknown[]) =>
    hoistedTreasury.submit(...a),
}));

import { createStellarUsdcSpendPaymentRail } from './stellar-usdc-rail';

const sessionId = '770e8400-e29b-41d4-a716-446655440000';
const STELLAR_G = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

function pendingRow(opts?: { status?: 'pending' | 'completed' | 'failed' }) {
  const status = opts?.status ?? 'pending';
  return {
    id: '880e8400-e29b-41d4-a716-446655440001',
    spend_session_id: sessionId,
    user_id: 'privy-1',
    spend_rail: 'stellar_usdc' as const,
    rail_user_wallet_address: null as string | null,
    status,
    step_metadata: {},
    sanitized_error_category: null,
    sanitized_error_code: null,
    internal_diagnostics: null,
    idempotency_key: `wallet_readiness:${sessionId}`,
    sponsor_treasury_transaction_id: null,
    trustline_treasury_transaction_id: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };
}

describe('createStellarUsdcSpendPaymentRail — wallet readiness (IRL-18)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.mockUpdateReadiness.mockResolvedValue(
      pendingRow({ status: 'completed' })
    );
    hoisted.mockUpdateSessionRail.mockResolvedValue({});
    hoisted.mockOrchestrator.mockResolvedValue({
      ok: true,
      status: 'completed',
      address: STELLAR_G,
    });
  });

  const ctx = {
    spendSessionId: sessionId,
    spendExperienceId: '990e8400-e29b-41d4-a716-446655440002',
    sessionOwnerPrivyUserId: 'privy-1',
  };

  it('happy path: orchestration completed syncs session rail address', async () => {
    hoisted.mockInsertOrGet.mockResolvedValue({
      row: pendingRow(),
      created: true,
    });

    const rail = createStellarUsdcSpendPaymentRail();
    const res = await rail.runWalletReadinessOrchestration(ctx);

    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error('expected ok');
    expect(res.value.status).toBe('completed');
    expect(hoisted.mockOrchestrator).toHaveBeenCalledTimes(1);
    expect(hoisted.mockOrchestrator).toHaveBeenCalledWith(
      expect.objectContaining({
        spendSessionId: sessionId,
        spendExperienceId: ctx.spendExperienceId,
        sessionOwnerPrivyUserId: 'privy-1',
      })
    );
    expect(hoisted.mockUpdateSessionRail).toHaveBeenCalledWith(
      sessionId,
      STELLAR_G
    );
    expect(hoisted.mockUpdateReadiness).not.toHaveBeenCalled();
  });

  it('idempotent second call: completed row skips orchestration but syncs session rail address', async () => {
    hoisted.mockInsertOrGet.mockResolvedValue({
      row: {
        ...pendingRow({ status: 'completed' }),
        rail_user_wallet_address: STELLAR_G,
      },
      created: false,
    });

    const rail = createStellarUsdcSpendPaymentRail();
    const res = await rail.runWalletReadinessOrchestration(ctx);

    expect(res.ok).toBe(true);
    expect(hoisted.mockOrchestrator).not.toHaveBeenCalled();
    expect(hoisted.mockUpdateReadiness).not.toHaveBeenCalled();
    expect(hoisted.mockUpdateSessionRail).toHaveBeenCalledTimes(1);
    expect(hoisted.mockUpdateSessionRail).toHaveBeenCalledWith(
      sessionId,
      STELLAR_G
    );
  });

  it('orchestration failure: categorized SpendRailError + persisted diagnostics', async () => {
    hoisted.mockInsertOrGet.mockResolvedValue({
      row: pendingRow(),
      created: true,
    });
    hoisted.mockOrchestrator.mockResolvedValue({
      ok: false,
      error: spendRailErrorWalletReadinessFailed(),
    });

    const rail = createStellarUsdcSpendPaymentRail();
    const res = await rail.runWalletReadinessOrchestration(ctx);

    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('expected failure');
    expect(res.error.category).toBe('wallet_readiness_failed');
    expect(res.error.analyticsCode).toBe(
      SPEND_RAIL_ANALYTICS_CODES.wallet_readiness_failed
    );
    expect(hoisted.mockUpdateReadiness).toHaveBeenCalledWith(
      pendingRow().id,
      expect.objectContaining({
        status: 'failed',
        sanitized_error_category: 'wallet_readiness_failed',
        sanitized_error_code:
          SPEND_RAIL_ANALYTICS_CODES.wallet_readiness_failed,
      })
    );
  });

  it('fails when session owner Privy id is missing', async () => {
    const rail = createStellarUsdcSpendPaymentRail();
    const res = await rail.runWalletReadinessOrchestration({
      spendSessionId: sessionId,
    });
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('expected failure');
    expect(res.error).toEqual(spendRailErrorWalletReadinessFailed());
    expect(hoisted.mockInsertOrGet).not.toHaveBeenCalled();
  });

  it('returns pending when orchestration is still confirming on ledger', async () => {
    hoisted.mockInsertOrGet.mockResolvedValue({
      row: pendingRow(),
      created: true,
    });
    hoisted.mockOrchestrator.mockResolvedValue({
      ok: true,
      status: 'pending',
      address: STELLAR_G,
    });

    const rail = createStellarUsdcSpendPaymentRail();
    const res = await rail.runWalletReadinessOrchestration(ctx);
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error('expected ok');
    expect(res.value.status).toBe('pending');
    expect(hoisted.mockUpdateSessionRail).not.toHaveBeenCalled();
  });

  it('at most one orchestration call per invocation (no retry loop)', async () => {
    hoisted.mockInsertOrGet.mockResolvedValue({
      row: pendingRow(),
      created: true,
    });
    hoisted.mockOrchestrator.mockRejectedValueOnce(new Error('first'));
    const rail = createStellarUsdcSpendPaymentRail();
    await rail.runWalletReadinessOrchestration(ctx);
    expect(hoisted.mockOrchestrator).toHaveBeenCalledTimes(1);
  });

  it('failed row short-circuits without calling orchestration', async () => {
    hoisted.mockInsertOrGet.mockResolvedValue({
      row: pendingRow({ status: 'failed' }),
      created: false,
    });
    const rail = createStellarUsdcSpendPaymentRail();
    const res = await rail.runWalletReadinessOrchestration(ctx);
    expect(res.ok).toBe(false);
    expect(hoisted.mockOrchestrator).not.toHaveBeenCalled();
  });
});

describe('createStellarUsdcSpendPaymentRail — treasury funding (IRL-16)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoistedTreasury.readBal.mockReset();
    hoistedTreasury.submit.mockReset();
  });

  it('getTreasurySpendableBalance returns Horizon-backed balance', async () => {
    hoistedTreasury.readBal.mockResolvedValue(42.5);
    const rail = createStellarUsdcSpendPaymentRail();
    const r = await rail.getTreasurySpendableBalance();
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error('expected ok');
    expect(r.value).toBe(42.5);
  });

  it('getTreasurySpendableBalance returns err when balance read throws categorized error', async () => {
    const { spendRailErrorTreasuryConfiguration } =
      await import('@/lib/spend/payment-rails/errors');
    hoistedTreasury.readBal.mockRejectedValue(
      spendRailErrorTreasuryConfiguration()
    );
    const rail = createStellarUsdcSpendPaymentRail();
    const r = await rail.getTreasurySpendableBalance();
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error('expected err');
    expect(r.error.category).toBe('treasury_configuration');
  });

  it('initiateUserFunding returns confirmed when submit succeeds inline', async () => {
    hoistedTreasury.readBal.mockResolvedValue(100);
    hoistedTreasury.submit.mockResolvedValue({
      kind: 'confirmed',
      txHash: 'a'.repeat(64),
    });
    const rail = createStellarUsdcSpendPaymentRail();
    const res = await rail.initiateUserFunding({
      spendSessionId: sessionId,
      fundingReferenceId: 'fund_user:cv-1',
      embeddedEvmWalletAddress: STELLAR_G,
      usdcAmount: 10,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error('expected ok');
    expect(res.value.status).toBe('confirmed');
    expect(res.value.txReference?.toLowerCase()).toBe('a'.repeat(64));
  });

  it('initiateUserFunding rejects invalid destination as readiness failure', async () => {
    hoistedTreasury.readBal.mockResolvedValue(100);
    const rail = createStellarUsdcSpendPaymentRail();
    const res = await rail.initiateUserFunding({
      spendSessionId: sessionId,
      fundingReferenceId: 'fund_user:cv-1',
      embeddedEvmWalletAddress: 'not-stellar',
      usdcAmount: 10,
    });
    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('expected err');
    expect(res.error.category).toBe('wallet_readiness_failed');
  });
});
