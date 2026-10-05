import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockRequireAdmin = vi.fn();
const mockGetSponsoredActivationById = vi.fn();
const mockSendToVenue = vi.fn();

vi.mock('@/lib/auth', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}));

vi.mock('@/lib/db/sponsored-activations', () => ({
  getSponsoredActivationById: (...args: unknown[]) =>
    mockGetSponsoredActivationById(...args),
}));

vi.mock('@/lib/activation/campaign-wallet-send-to-venue', () => ({
  sendSponsoredActivationRemainingBalanceToVenue: (...args: unknown[]) =>
    mockSendToVenue(...args),
}));

import { POST } from '../route';

const SIGNATURE =
  '5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW';
const VENUE = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
const activation = {
  id: 'act-1',
  status: 'paused' as const,
  settlement_rail: 'solana' as const,
  campaign_wallet_address: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
  venue_settlement_wallet_address: VENUE,
};

const URL =
  'http://localhost:3000/api/admin/sponsored-activations/act-1/campaign-wallet/send-to-venue';

function post() {
  return POST(new NextRequest(URL, { method: 'POST' }), {
    params: { activationId: 'act-1' },
  });
}

describe('POST /api/admin/sponsored-activations/[activationId]/campaign-wallet/send-to-venue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ isValid: true });
    mockGetSponsoredActivationById.mockResolvedValue(activation);
  });

  it('returns 403 when admin auth fails', async () => {
    mockRequireAdmin.mockResolvedValue({ isValid: false });
    const res = await post();
    expect(res.status).toBe(403);
    expect(mockSendToVenue).not.toHaveBeenCalled();
  });

  it('returns 404 when activation is missing', async () => {
    mockGetSponsoredActivationById.mockResolvedValue(null);
    const res = await post();
    expect(res.status).toBe(404);
    expect(mockSendToVenue).not.toHaveBeenCalled();
  });

  it('returns 200 with an explorer link when confirmed', async () => {
    mockSendToVenue.mockResolvedValue({
      ok: true,
      status: 'confirmed',
      txHash: SIGNATURE,
      amountUsdc: 85.5,
      destinationAddress: VENUE,
    });
    const res = await post();
    expect(res.status).toBe(200);
    expect(mockSendToVenue).toHaveBeenCalledWith({ activation });
    const json = await res.json();
    expect(json.data).toMatchObject({
      status: 'confirmed',
      txHash: SIGNATURE,
      amountUsdc: 85.5,
      destinationAddress: VENUE,
    });
    expect(json.data.explorerTxUrl).toBe(`https://solscan.io/tx/${SIGNATURE}`);
  });

  it('returns 202 when the transfer is still pending', async () => {
    mockSendToVenue.mockResolvedValue({
      ok: true,
      status: 'submitted',
      txHash: SIGNATURE,
      amountUsdc: 85.5,
      destinationAddress: VENUE,
      message: 'pending',
    });
    const res = await post();
    expect(res.status).toBe(202);
    const json = await res.json();
    expect(json.data.message).toBe('pending');
  });

  it('returns business errors from the helper', async () => {
    mockSendToVenue.mockResolvedValue({
      ok: false,
      error: 'No unreserved CADD left to send to the venue.',
      statusCode: 400,
    });
    const res = await post();
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('No unreserved CADD left to send to the venue.');
  });
});
