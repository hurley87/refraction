import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db/checkpoints', () => ({
  getActiveCheckpointById: vi.fn(),
}));

vi.mock('@/lib/db/spend', () => ({
  getSpendItemByCheckpointId: vi.fn(),
  getUserRedemptionForSpendItem: vi.fn(),
  redeemSpendItemOnce: vi.fn(),
}));

vi.mock('@/lib/api/privy', () => ({
  verifyWalletOwnership: vi.fn(),
}));

import { GET, POST } from '../route';
import { getActiveCheckpointById } from '@/lib/db/checkpoints';
import {
  getSpendItemByCheckpointId,
  getUserRedemptionForSpendItem,
  redeemSpendItemOnce,
} from '@/lib/db/spend';
import { verifyWalletOwnership } from '@/lib/api/privy';

const checkpointId = 'abc123def4';
const walletAddress = '0x1234567890abcdef1234567890abcdef12345678';

describe('checkpoint spend route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyWalletOwnership).mockResolvedValue({
      authorized: true,
      userId: 'did:privy:123',
    });
  });

  it('GET returns checkpoint spend data', async () => {
    vi.mocked(getActiveCheckpointById).mockResolvedValue({
      id: checkpointId,
      checkpoint_mode: 'spend',
      chain_type: 'evm',
    } as any);
    vi.mocked(getSpendItemByCheckpointId).mockResolvedValue({
      id: 'item-1',
      is_active: true,
    } as any);

    const request = new NextRequest(
      `http://localhost:3000/api/checkpoints/${checkpointId}/spend`
    );
    const response = await GET(request, { params: { id: checkpointId } });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.spendItem.id).toBe('item-1');
    expect(payload.data.redemption).toBeNull();
  });

  it('GET with wallet includes redemption', async () => {
    vi.mocked(getActiveCheckpointById).mockResolvedValue({
      id: checkpointId,
      checkpoint_mode: 'spend',
      chain_type: 'evm',
    } as any);
    vi.mocked(getSpendItemByCheckpointId).mockResolvedValue({
      id: 'item-1',
      is_active: true,
    } as any);
    vi.mocked(getUserRedemptionForSpendItem).mockResolvedValue({
      id: 'redeem-1',
      is_fulfilled: true,
    } as any);

    const request = new NextRequest(
      `http://localhost:3000/api/checkpoints/${checkpointId}/spend?walletAddress=${walletAddress}`
    );
    const response = await GET(request, { params: { id: checkpointId } });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.redemption.id).toBe('redeem-1');
    expect(verifyWalletOwnership).toHaveBeenCalledWith(request, walletAddress);
  });

  it('GET with wallet returns 401 when wallet auth fails', async () => {
    vi.mocked(getActiveCheckpointById).mockResolvedValue({
      id: checkpointId,
      checkpoint_mode: 'spend',
      chain_type: 'evm',
    } as any);
    vi.mocked(getSpendItemByCheckpointId).mockResolvedValue({
      id: 'item-1',
      is_active: true,
    } as any);
    vi.mocked(verifyWalletOwnership).mockResolvedValue({
      authorized: false,
      error: 'Unauthorized',
    });

    const request = new NextRequest(
      `http://localhost:3000/api/checkpoints/${checkpointId}/spend?walletAddress=${walletAddress}`
    );
    const response = await GET(request, { params: { id: checkpointId } });
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe('Unauthorized');
    expect(getUserRedemptionForSpendItem).not.toHaveBeenCalled();
  });

  it('POST redeems successfully', async () => {
    vi.mocked(getActiveCheckpointById).mockResolvedValue({
      id: checkpointId,
      checkpoint_mode: 'spend',
      chain_type: 'evm',
    } as any);
    vi.mocked(getSpendItemByCheckpointId).mockResolvedValue({
      id: 'item-1',
      is_active: true,
    } as any);
    vi.mocked(redeemSpendItemOnce).mockResolvedValue({
      redemption: { id: 'redeem-1', is_fulfilled: true },
      player: { id: 1, total_points: 200 },
    } as any);

    const request = new NextRequest(
      `http://localhost:3000/api/checkpoints/${checkpointId}/spend`,
      {
        method: 'POST',
        body: JSON.stringify({ walletAddress }),
      }
    );

    const response = await POST(request, { params: { id: checkpointId } });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.redemption.id).toBe('redeem-1');
    expect(verifyWalletOwnership).toHaveBeenCalledWith(request, walletAddress);
  });

  it('POST returns 400 when already redeemed', async () => {
    vi.mocked(getActiveCheckpointById).mockResolvedValue({
      id: checkpointId,
      checkpoint_mode: 'spend',
      chain_type: 'evm',
    } as any);
    vi.mocked(getSpendItemByCheckpointId).mockResolvedValue({
      id: 'item-1',
      is_active: true,
    } as any);
    vi.mocked(redeemSpendItemOnce).mockRejectedValue(
      new Error('You already redeemed this item')
    );

    const request = new NextRequest(
      `http://localhost:3000/api/checkpoints/${checkpointId}/spend`,
      {
        method: 'POST',
        body: JSON.stringify({ walletAddress }),
      }
    );

    const response = await POST(request, { params: { id: checkpointId } });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain('already redeemed');
  });

  it('POST returns 401 when wallet auth fails', async () => {
    vi.mocked(getActiveCheckpointById).mockResolvedValue({
      id: checkpointId,
      checkpoint_mode: 'spend',
      chain_type: 'evm',
    } as any);
    vi.mocked(getSpendItemByCheckpointId).mockResolvedValue({
      id: 'item-1',
      is_active: true,
    } as any);
    vi.mocked(verifyWalletOwnership).mockResolvedValue({
      authorized: false,
      error: 'Unauthorized',
    });

    const request = new NextRequest(
      `http://localhost:3000/api/checkpoints/${checkpointId}/spend`,
      {
        method: 'POST',
        body: JSON.stringify({ walletAddress }),
      }
    );

    const response = await POST(request, { params: { id: checkpointId } });
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe('Unauthorized');
    expect(redeemSpendItemOnce).not.toHaveBeenCalled();
  });

  it('POST returns generic 500 for unexpected redeem errors', async () => {
    vi.mocked(getActiveCheckpointById).mockResolvedValue({
      id: checkpointId,
      checkpoint_mode: 'spend',
      chain_type: 'evm',
    } as any);
    vi.mocked(getSpendItemByCheckpointId).mockResolvedValue({
      id: 'item-1',
      is_active: true,
    } as any);
    vi.mocked(redeemSpendItemOnce).mockRejectedValue(
      new Error('Database constraint xyz leaked')
    );

    const request = new NextRequest(
      `http://localhost:3000/api/checkpoints/${checkpointId}/spend`,
      {
        method: 'POST',
        body: JSON.stringify({ walletAddress }),
      }
    );

    const response = await POST(request, { params: { id: checkpointId } });
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toBe('Failed to redeem');
  });
});
