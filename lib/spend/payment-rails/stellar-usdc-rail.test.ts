import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SPEND_RAIL_ANALYTICS_CODES,
  spendRailErrorWalletReadinessFailed,
} from '@/lib/spend/payment-rails/errors';

const hoisted = vi.hoisted(() => ({
  mockInsertOrGet: vi.fn(),
  mockUpdateReadiness: vi.fn(),
  mockUpdateSessionRail: vi.fn(),
  mockEnsureStellar: vi.fn(),
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

vi.mock('@/lib/privy/stellar-rail-wallet', () => ({
  ensureStellarRailUserWallet: (...a: unknown[]) =>
    hoisted.mockEnsureStellar(...a),
}));

import { createStellarUsdcSpendPaymentRail } from './stellar-usdc-rail';

const sessionId = '770e8400-e29b-41d4-a716-446655440000';
const STELLAR_G = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

function pendingRow(opts?: { status?: 'pending' | 'completed' }) {
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

describe('createStellarUsdcSpendPaymentRail — wallet readiness (IRL-21)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.mockUpdateReadiness.mockResolvedValue(
      pendingRow({ status: 'completed' })
    );
    hoisted.mockUpdateSessionRail.mockResolvedValue({});
    hoisted.mockEnsureStellar.mockResolvedValue({
      address: STELLAR_G,
      walletId: 'w1',
      provisioned: true,
    });
  });

  const ctx = {
    spendSessionId: sessionId,
    sessionOwnerPrivyUserId: 'privy-1',
  };

  it('happy path: ensures Stellar wallet, updates readiness + session', async () => {
    hoisted.mockInsertOrGet.mockResolvedValue({
      row: pendingRow(),
      created: true,
    });

    const rail = createStellarUsdcSpendPaymentRail();
    const res = await rail.runWalletReadinessOrchestration(ctx);

    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error('expected ok');
    expect(res.value.status).toBe('completed');
    expect(hoisted.mockEnsureStellar).toHaveBeenCalledTimes(1);
    expect(hoisted.mockEnsureStellar).toHaveBeenCalledWith('privy-1');
    expect(hoisted.mockUpdateSessionRail).toHaveBeenCalledWith(
      sessionId,
      STELLAR_G
    );
    expect(hoisted.mockUpdateReadiness).toHaveBeenCalledWith(
      pendingRow().id,
      expect.objectContaining({
        status: 'completed',
        rail_user_wallet_address: STELLAR_G,
      })
    );
  });

  it('idempotent second call: completed row skips Privy but syncs session rail address', async () => {
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
    expect(hoisted.mockEnsureStellar).not.toHaveBeenCalled();
    expect(hoisted.mockUpdateReadiness).not.toHaveBeenCalled();
    expect(hoisted.mockUpdateSessionRail).toHaveBeenCalledTimes(1);
    expect(hoisted.mockUpdateSessionRail).toHaveBeenCalledWith(
      sessionId,
      STELLAR_G
    );
  });

  it('Privy failure: categorized SpendRailError + persisted diagnostics', async () => {
    hoisted.mockInsertOrGet.mockResolvedValue({
      row: pendingRow(),
      created: true,
    });
    hoisted.mockEnsureStellar.mockRejectedValue(new Error('privy outage'));

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
        internal_diagnostics: expect.objectContaining({
          error_message: 'privy outage',
        }),
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

  it('network-style Privy errors map to network_unavailable', async () => {
    hoisted.mockInsertOrGet.mockResolvedValue({
      row: pendingRow(),
      created: true,
    });
    hoisted.mockEnsureStellar.mockRejectedValue(
      new Error('fetch failed upstream')
    );

    const rail = createStellarUsdcSpendPaymentRail();
    const res = await rail.runWalletReadinessOrchestration(ctx);

    expect(res.ok).toBe(false);
    if (res.ok) throw new Error('expected failure');
    expect(res.error.category).toBe('network_unavailable');
    expect(hoisted.mockUpdateReadiness).toHaveBeenCalledWith(
      pendingRow().id,
      expect.objectContaining({
        status: 'failed',
        sanitized_error_category: 'network_unavailable',
      })
    );
  });

  it('at most one ensureStellar call per invocation (no retry loop)', async () => {
    hoisted.mockInsertOrGet.mockResolvedValue({
      row: pendingRow(),
      created: true,
    });
    hoisted.mockEnsureStellar.mockRejectedValueOnce(new Error('first'));
    const rail = createStellarUsdcSpendPaymentRail();
    await rail.runWalletReadinessOrchestration(ctx);
    expect(hoisted.mockEnsureStellar).toHaveBeenCalledTimes(1);
  });
});
