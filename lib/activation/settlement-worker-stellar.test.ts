import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ActivationSettlementTransactionRow } from '@/lib/db/activation-settlement-transactions';
import type { SponsoredActivationRow } from '@/lib/db/sponsored-activations';

const CAMPAIGN = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';
const VENUE = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

const mockGetActivation = vi.fn();
const mockConfirm = vi.fn();
const mockFail = vi.fn();
const mockMarkSubmitted = vi.fn();
const mockSubmit = vi.fn();
const mockPoll = vi.fn();

vi.mock('@/lib/db/sponsored-activations', () => ({
  getSponsoredActivationById: (...args: unknown[]) =>
    mockGetActivation(...args),
}));

vi.mock('@/lib/db/activation-settlement-transactions', () => ({
  confirmActivationSettlementAtomic: (...args: unknown[]) =>
    mockConfirm(...args),
  failActivationSettlementAtomic: (...args: unknown[]) => mockFail(...args),
  markActivationSettlementSubmitted: (...args: unknown[]) =>
    mockMarkSubmitted(...args),
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
    mockFail.mockResolvedValue('failed');
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
    expect(mockFail).toHaveBeenCalledWith({
      settlementId: 'set-1',
      lastErrorCode: 'insufficient_usdc_or_reserve',
    });
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
