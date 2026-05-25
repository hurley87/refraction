import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ActivationSettlementTransactionRow } from '@/lib/db/activation-settlement-transactions';
import type { SponsoredActivationRow } from '@/lib/db/sponsored-activations';

const CAMPAIGN = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';
const VENUE = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

const mockGetActivation = vi.fn();
const mockConfirm = vi.fn();
const mockRecord = vi.fn();
const mockMarkSubmitted = vi.fn();
const mockSubmit = vi.fn();
const mockPoll = vi.fn();
const mockGetSettlementById = vi.fn();
const mockGetRedemptionById = vi.fn();

vi.mock('@/lib/analytics/server', () => ({
  resolveServerIdentity: vi.fn(() => 'mixpanel-test'),
  trackSponsoredSettlementSubmitted: vi.fn(),
  trackSponsoredSettlementConfirmed: vi.fn(),
  trackSponsoredSettlementFailed: vi.fn(),
}));

vi.mock('@/lib/db/sponsored-activations', () => ({
  getSponsoredActivationById: (...args: unknown[]) =>
    mockGetActivation(...args),
}));

vi.mock('@/lib/db/activation-redemptions', () => ({
  getActivationRedemptionById: (...args: unknown[]) =>
    mockGetRedemptionById(...args),
}));

vi.mock('@/lib/db/activation-settlement-transactions', () => ({
  confirmActivationSettlementAtomic: (...args: unknown[]) =>
    mockConfirm(...args),
  recordActivationSettlementFailureAtomic: (...args: unknown[]) =>
    mockRecord(...args),
  markActivationSettlementSubmitted: (...args: unknown[]) =>
    mockMarkSubmitted(...args),
  getActivationSettlementTransactionById: (...args: unknown[]) =>
    mockGetSettlementById(...args),
}));

vi.mock('@/lib/activation/stellar-settlement-submit', () => ({
  submitStellarActivationSettlementFromCampaign: (...args: unknown[]) =>
    mockSubmit(...args),
}));

vi.mock('@/lib/activation/stellar-settlement-horizon', () => ({
  pollStellarSettlementTxOutcome: (...args: unknown[]) => mockPoll(...args),
}));

import { processStellarActivationSettlement } from './settlement-worker-stellar';

const activationFixture: SponsoredActivationRow = {
  id: 'act-1',
  slug: 'test',
  title: 't',
  sponsor_name: 's',
  event_id: null,
  status: 'active',
  settlement_rail: 'stellar',
  campaign_wallet_address: CAMPAIGN,
  venue_settlement_wallet_address: VENUE,
  usdc_asset_config: { asset_code: 'USDC', issuer: CAMPAIGN },
  max_redemptions: null,
  max_usdc_budget: null,
  usdc_settled_total: 0,
  redemption_count_confirmed: 0,
  starts_at: '2026-01-01T00:00:00.000Z',
  ends_at: '2027-01-01T00:00:00.000Z',
  eligibility_config: {},
  created_by: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  activation_create_idempotency_key: null,
  privy_campaign_wallet_id: 'privy-campaign-1',
};

function settlementRow(
  overrides: Partial<ActivationSettlementTransactionRow> = {}
): ActivationSettlementTransactionRow {
  return {
    id: 'set-1',
    redemption_id: 'red-1',
    activation_id: 'act-1',
    settlement_rail: 'stellar',
    status: 'queued',
    amount: 1,
    from_wallet_address: CAMPAIGN,
    to_wallet_address: VENUE,
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

describe('processStellarActivationSettlement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetActivation.mockResolvedValue(activationFixture);
    mockSubmit.mockResolvedValue({ ok: true, txHash: 'tx-hash-1' });
    mockMarkSubmitted.mockResolvedValue(true);
    mockPoll.mockResolvedValue('success');
    mockConfirm.mockResolvedValue('confirmed');
    mockRecord.mockResolvedValue('exhausted');
    mockGetSettlementById.mockImplementation(async (id: string) =>
      settlementRow({ id })
    );
    mockGetRedemptionById.mockResolvedValue({
      id: 'red-1',
      activation_id: 'act-1',
      reward_item_id: 'ri-1',
      user_id: 7,
      eligibility_event_id: 'e',
      status: 'settlement_pending',
      idempotency_key: 'k',
      points_spent: 10,
      usdc_amount_snapshot: 1,
      purchase_confirmed_at: '2026-01-01T00:00:00.000Z',
      redeemed_at: '2026-01-01T00:01:00.000Z',
      cancelled_reason: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    });
  });

  it('skips non-stellar rail', async () => {
    const result = await processStellarActivationSettlement(
      settlementRow({ settlement_rail: 'base' as 'stellar' })
    );
    expect(result).toBe('skipped');
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('confirms happy path from queued', async () => {
    const result = await processStellarActivationSettlement(settlementRow());
    expect(result).toBe('confirmed');
    expect(mockSubmit).toHaveBeenCalled();
    expect(mockMarkSubmitted).toHaveBeenCalledWith({
      settlementId: 'set-1',
      txHash: 'tx-hash-1',
    });
    expect(mockConfirm).toHaveBeenCalledWith({
      settlementId: 'set-1',
      txHash: 'tx-hash-1',
    });
  });

  it('poll-only for submitted with tx_hash', async () => {
    const result = await processStellarActivationSettlement(
      settlementRow({
        status: 'submitted',
        tx_hash: 'existing-hash',
        submitted_at: '2026-01-02T00:00:00.000Z',
      })
    );
    expect(result).toBe('confirmed');
    expect(mockSubmit).not.toHaveBeenCalled();
    expect(mockPoll).toHaveBeenCalledWith('existing-hash');
  });

  it('fails on insufficient submit balance', async () => {
    mockSubmit.mockResolvedValue({
      ok: false,
      reason: 'insufficient_usdc_or_reserve',
    });
    const result = await processStellarActivationSettlement(settlementRow());
    expect(result).toBe('failed');
    expect(mockRecord).toHaveBeenCalledWith({
      settlementId: 'set-1',
      lastErrorCode: 'insufficient_usdc_or_reserve',
    });
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it('leaves submitted row unchanged when Horizon poll is still pending', async () => {
    mockPoll.mockResolvedValue('pending');
    const result = await processStellarActivationSettlement(
      settlementRow({
        status: 'submitted',
        tx_hash: 'existing-hash',
      })
    );
    expect(result).toBe('skipped');
    expect(mockRecord).not.toHaveBeenCalled();
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it('is idempotent when already confirmed', async () => {
    const result = await processStellarActivationSettlement(
      settlementRow({ status: 'confirmed', tx_hash: 'done' })
    );
    expect(result).toBe('already_confirmed');
    expect(mockSubmit).not.toHaveBeenCalled();
  });
});
