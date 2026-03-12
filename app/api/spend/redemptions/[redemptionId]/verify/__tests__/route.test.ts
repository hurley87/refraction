import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db/spend', () => ({
  verifySpendRedemption: vi.fn(),
}));

vi.mock('@/lib/api/privy', () => ({
  verifyWalletOwnership: vi.fn(),
}));

import { POST } from '../route';
import { verifySpendRedemption } from '@/lib/db/spend';
import { verifyWalletOwnership } from '@/lib/api/privy';

const validWallet = '0x1234567890abcdef1234567890abcdef12345678';
const otherWallet = '0xabcdef1234567890abcdef1234567890abcdef12';
const redemptionId = '660e8400-e29b-41d4-a716-446655440001';

function createRequest(body: unknown) {
  return new NextRequest(
    `http://localhost:3000/api/spend/redemptions/${redemptionId}/verify`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
}

describe('POST /api/spend/redemptions/[redemptionId]/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyWalletOwnership).mockResolvedValue({ authorized: true });
  });

  it('verifies redemption and deducts points', async () => {
    const updated = {
      id: redemptionId,
      user_wallet_address: validWallet,
      points_spent: 100,
      is_fulfilled: true,
      fulfilled_at: new Date().toISOString(),
      verified_by: 'user',
    };
    vi.mocked(verifySpendRedemption).mockResolvedValue(updated as any);

    const req = createRequest({ walletAddress: validWallet });
    const res = await POST(req, { params: { redemptionId } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.redemption.is_fulfilled).toBe(true);
    expect(verifySpendRedemption).toHaveBeenCalledWith(
      redemptionId,
      validWallet
    );
  });

  it('returns 400 for already verified redemption', async () => {
    vi.mocked(verifySpendRedemption).mockRejectedValue(
      new Error('Redemption already verified')
    );

    const req = createRequest({ walletAddress: validWallet });
    const res = await POST(req, { params: { redemptionId } });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('already verified');
  });

  it('returns 400 for wrong user', async () => {
    vi.mocked(verifySpendRedemption).mockRejectedValue(
      new Error('Unauthorized')
    );

    const req = createRequest({ walletAddress: otherWallet });
    const res = await POST(req, { params: { redemptionId } });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 400 for insufficient points', async () => {
    vi.mocked(verifySpendRedemption).mockRejectedValue(
      new Error('Insufficient points')
    );

    const req = createRequest({ walletAddress: validWallet });
    const res = await POST(req, { params: { redemptionId } });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('Insufficient points');
  });

  it('returns 400 for missing walletAddress', async () => {
    const req = createRequest({});
    const res = await POST(req, { params: { redemptionId } });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(verifySpendRedemption).not.toHaveBeenCalled();
  });

  it('returns 401 when wallet auth fails', async () => {
    vi.mocked(verifyWalletOwnership).mockResolvedValue({
      authorized: false,
      error: 'Unauthorized',
    });

    const req = createRequest({ walletAddress: validWallet });
    const res = await POST(req, { params: { redemptionId } });
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe('Unauthorized');
    expect(verifySpendRedemption).not.toHaveBeenCalled();
  });
});
