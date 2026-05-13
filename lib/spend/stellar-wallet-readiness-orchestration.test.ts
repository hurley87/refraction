import { Account, Asset, Operation } from '@stellar/stellar-sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const VALID_STELLAR_PUBLIC_KEY =
  'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const TRUSTLINE_TREASURY_ID = '990e8400-e29b-41d4-a716-446655440002';

/** Int64-style string rejected by the SDK; Stellar amounts use decimal/scientific format. */
const INVALID_TRUSTLINE_LIMIT_FORMAT = '9223372036854775807';

const hoisted = vi.hoisted(() => ({
  mockUpdateReadiness: vi.fn(),
  mockUpdateSessionRail: vi.fn(),
  mockInsertTreasury: vi.fn(),
  mockFinalizeTreasury: vi.fn(),
  mockEnsureWallet: vi.fn(),
  mockResolveWalletId: vi.fn(),
  mockRawSign: vi.fn(),
  mockServer: {
    loadAccount: vi.fn(),
    fetchBaseFee: vi.fn(),
    submitTransaction: vi.fn(),
    transactions: vi.fn(),
  },
}));

vi.mock('@/lib/db/spend-wallet-readiness', () => ({
  updateSpendWalletReadinessFields: (...args: unknown[]) =>
    hoisted.mockUpdateReadiness(...args),
}));

vi.mock('@/lib/db/spend-sessions', () => ({
  updateSpendSessionRailUserWalletAddress: (...args: unknown[]) =>
    hoisted.mockUpdateSessionRail(...args),
}));

vi.mock('@/lib/db/treasury-transactions', () => ({
  insertTreasuryStellarSetupRow: (...args: unknown[]) =>
    hoisted.mockInsertTreasury(...args),
  finalizeTreasuryStellarSetupRow: (...args: unknown[]) =>
    hoisted.mockFinalizeTreasury(...args),
}));

vi.mock('@/lib/privy/stellar-rail-wallet', () => ({
  ensureStellarRailUserWallet: (...args: unknown[]) =>
    hoisted.mockEnsureWallet(...args),
  resolveStellarPrivyWalletIdForUser: (...args: unknown[]) =>
    hoisted.mockResolveWalletId(...args),
}));

vi.mock('@/lib/privy-server-rest', () => ({
  privyWalletRawSignTransactionHash: (...args: unknown[]) =>
    hoisted.mockRawSign(...args),
}));

vi.mock('@/lib/spend/stellar-wallet-readiness-config', async () => {
  const { Keypair, Networks } = await import('@stellar/stellar-sdk');
  const sponsorKeypair = Keypair.random();
  return {
    createStellarSpendHorizonServer: () => hoisted.mockServer,
    getStellarSpendCreateAccountStartingBalance: () => '3',
    getStellarSpendNetworkPassphrase: () => Networks.TESTNET,
    getStellarSpendUsdcAssetCode: () => 'USDC',
    getStellarSpendUsdcIssuer: () =>
      'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    parseStellarSpendSponsorKeypair: () => sponsorKeypair,
  };
});

import { runStellarUsdcWalletReadinessOrchestration } from './stellar-wallet-readiness-orchestration';

const readinessRow = () => ({
  id: '880e8400-e29b-41d4-a716-446655440001',
  spend_session_id: '770e8400-e29b-41d4-a716-446655440000',
  user_id: 'privy-1',
  spend_rail: 'stellar_usdc' as const,
  rail_user_wallet_address: null,
  status: 'pending' as const,
  step_metadata: {},
  sanitized_error_category: null,
  sanitized_error_code: null,
  internal_diagnostics: null,
  idempotency_key: 'wallet_readiness:770e8400-e29b-41d4-a716-446655440000',
  sponsor_treasury_transaction_id: null,
  trustline_treasury_transaction_id: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
});

function accountWithoutTrustline() {
  return Object.assign(new Account(VALID_STELLAR_PUBLIC_KEY, '1'), {
    balances: [],
  });
}

function diagnosticsPatchFor(phase: string) {
  const patches = hoisted.mockUpdateReadiness.mock.calls.map(
    (call) => call[1] as Record<string, unknown>
  );
  for (let i = patches.length - 1; i >= 0; i -= 1) {
    const patch = patches[i];
    if (
      (patch.internal_diagnostics as { phase?: string } | undefined)?.phase ===
      phase
    ) {
      return patch;
    }
  }
  return undefined;
}

describe('Stellar wallet readiness orchestration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.mockEnsureWallet.mockResolvedValue({
      address: VALID_STELLAR_PUBLIC_KEY,
      walletId: 'privy-wallet-1',
      provisioned: false,
    });
    hoisted.mockResolveWalletId.mockResolvedValue('privy-wallet-1');
    hoisted.mockUpdateReadiness.mockImplementation(
      async (_id: string, patch: Record<string, unknown>) => ({
        ...readinessRow(),
        ...patch,
      })
    );
    hoisted.mockInsertTreasury.mockResolvedValue(TRUSTLINE_TREASURY_ID);
    hoisted.mockRawSign.mockResolvedValue(Buffer.alloc(64));
    hoisted.mockServer.loadAccount.mockResolvedValue(accountWithoutTrustline());
    hoisted.mockServer.fetchBaseFee.mockResolvedValue(100);
    hoisted.mockServer.submitTransaction.mockResolvedValue({
      hash: 'a'.repeat(64),
    });
  });

  it('lets the SDK use its default max limit for USDC changeTrust', () => {
    const usdcAsset = new Asset('USDC', VALID_STELLAR_PUBLIC_KEY);

    expect(() =>
      Operation.changeTrust({
        asset: usdcAsset,
        limit: INVALID_TRUSTLINE_LIMIT_FORMAT,
      })
    ).toThrow();

    const op = Operation.changeTrust({ asset: usdcAsset });
    expect(op.body().changeTrustOp().limit().toString()).toBe(
      INVALID_TRUSTLINE_LIMIT_FORMAT
    );
  });

  it('builds sponsored trustline operations with the expected source accounts', async () => {
    hoisted.mockServer.submitTransaction.mockRejectedValue(
      new Error('inspect submit')
    );

    const result = await runStellarUsdcWalletReadinessOrchestration({
      readinessRow: readinessRow(),
      spendSessionId: '770e8400-e29b-41d4-a716-446655440000',
      spendExperienceId: '990e8400-e29b-41d4-a716-446655440003',
      sessionOwnerPrivyUserId: 'privy-1',
    });

    expect(result.ok).toBe(false);
    const feeBump = hoisted.mockServer.submitTransaction.mock.calls[0]?.[0];
    const operations = feeBump.innerTransaction.operations;
    expect(operations.map((op: { type: string }) => op.type)).toEqual([
      'beginSponsoringFutureReserves',
      'changeTrust',
      'endSponsoringFutureReserves',
    ]);
    expect(operations[0].source).toBe(feeBump.feeSource);
    expect(operations[0].source).not.toBe(VALID_STELLAR_PUBLIC_KEY);
    expect(operations[1].source).toBeUndefined();
    expect(operations[2].source).toBe(VALID_STELLAR_PUBLIC_KEY);
  });

  it('persists diagnostics when Privy raw signing fails during trustline setup', async () => {
    hoisted.mockRawSign.mockRejectedValue(new Error('raw sign failed'));

    const result = await runStellarUsdcWalletReadinessOrchestration({
      readinessRow: readinessRow(),
      spendSessionId: '770e8400-e29b-41d4-a716-446655440000',
      spendExperienceId: '990e8400-e29b-41d4-a716-446655440003',
      sessionOwnerPrivyUserId: 'privy-1',
    });

    expect(result.ok).toBe(false);
    expect(diagnosticsPatchFor('trustline_raw_sign')).toEqual(
      expect.objectContaining({
        status: 'failed',
        sanitized_error_category: 'wallet_readiness_failed',
        internal_diagnostics: expect.objectContaining({
          phase: 'trustline_raw_sign',
          error_name: 'Error',
          error_message: 'raw sign failed',
          wallet_id_suffix: 'wallet-1',
          user_public_key: VALID_STELLAR_PUBLIC_KEY,
        }),
      })
    );
  });

  it('persists diagnostics when fee-bump construction fails during trustline setup', async () => {
    hoisted.mockServer.fetchBaseFee.mockRejectedValue(new Error('fee failed'));

    const result = await runStellarUsdcWalletReadinessOrchestration({
      readinessRow: readinessRow(),
      spendSessionId: '770e8400-e29b-41d4-a716-446655440000',
      spendExperienceId: '990e8400-e29b-41d4-a716-446655440003',
      sessionOwnerPrivyUserId: 'privy-1',
    });

    expect(result.ok).toBe(false);
    expect(diagnosticsPatchFor('trustline_fee_bump_build')).toEqual(
      expect.objectContaining({
        status: 'failed',
        sanitized_error_category: 'wallet_readiness_failed',
        internal_diagnostics: expect.objectContaining({
          phase: 'trustline_fee_bump_build',
          error_message: 'fee failed',
          user_public_key: VALID_STELLAR_PUBLIC_KEY,
        }),
      })
    );
  });

  it('persists diagnostics when Horizon submit fails during trustline setup', async () => {
    const submitError = Object.assign(new Error('submit failed'), {
      response: {
        status: 400,
        data: {
          title: 'Transaction Failed',
          extras: { result_codes: { transaction: 'tx_failed' } },
        },
      },
    });
    hoisted.mockServer.submitTransaction.mockRejectedValue(submitError);

    const result = await runStellarUsdcWalletReadinessOrchestration({
      readinessRow: readinessRow(),
      spendSessionId: '770e8400-e29b-41d4-a716-446655440000',
      spendExperienceId: '990e8400-e29b-41d4-a716-446655440003',
      sessionOwnerPrivyUserId: 'privy-1',
    });

    expect(result.ok).toBe(false);
    expect(diagnosticsPatchFor('trustline_horizon_submit')).toEqual(
      expect.objectContaining({
        status: 'failed',
        sanitized_error_category: 'wallet_readiness_failed',
        internal_diagnostics: expect.objectContaining({
          phase: 'trustline_horizon_submit',
          error_message: 'submit failed',
          horizon_status: 400,
          horizon_title: 'Transaction Failed',
          trustline_treasury_transaction_id: TRUSTLINE_TREASURY_ID,
        }),
      })
    );
  });
});
