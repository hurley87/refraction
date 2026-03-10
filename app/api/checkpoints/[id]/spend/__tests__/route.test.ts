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

import { GET, POST } from '../route';
import { getActiveCheckpointById } from '@/lib/db/checkpoints';
import {
  getSpendItemByCheckpointId,
  getUserRedemptionForSpendItem,
  redeemSpendItemOnce,
} from '@/lib/db/spend';

const checkpointId = 'abc123def4';
const walletAddress = '0x1234567890abcdef1234567890abcdef12345678';

describe('checkpoint spend route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
