import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db/spend', () => ({
  getSpendItemById: vi.fn(),
  createPendingSpendRedemption: vi.fn(),
}));

import { GET, POST } from '../route';
import { getSpendItemById, createPendingSpendRedemption } from '@/lib/db/spend';

const validWallet = '0x1234567890abcdef1234567890abcdef12345678';
const validItemId = '550e8400-e29b-41d4-a716-446655440000';

function createPostRequest(body: unknown, itemId: string = validItemId) {
  return new NextRequest(`http://localhost:3000/api/spend/${itemId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function createGetRequest(itemId: string = validItemId) {
  return new NextRequest(`http://localhost:3000/api/spend/${itemId}`, {
    method: 'GET',
  });
}

describe('GET /api/spend/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns item when found', async () => {
    const item = {
      id: validItemId,
      name: 'Drink',
      points_cost: 100,
      is_active: true,
    };
    vi.mocked(getSpendItemById).mockResolvedValue(item as any);

    const req = createGetRequest();
    const res = await GET(req, { params: { id: validItemId } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.item).toEqual(item);
  });

  it('returns 404 when item not found', async () => {
    vi.mocked(getSpendItemById).mockRejectedValue({ code: 'PGRST116' });

    const req = createGetRequest();
    const res = await GET(req, { params: { id: validItemId } });

    expect(res.status).toBe(404);
  });
});

describe('POST /api/spend/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates pending redemption and does not deduct points', async () => {
    const redemption = {
      id: 'red-1',
      spend_item_id: validItemId,
      user_wallet_address: validWallet,
      points_spent: 100,
      is_fulfilled: false,
      created_at: new Date().toISOString(),
    };
    vi.mocked(createPendingSpendRedemption).mockResolvedValue(
      redemption as any
    );

    const req = createPostRequest({ walletAddress: validWallet });
    const res = await POST(req, { params: { id: validItemId } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.redemption).toEqual(redemption);
    expect(json.message).toContain('Verify at the bar');
    expect(createPendingSpendRedemption).toHaveBeenCalledWith(
      validItemId,
      validWallet
    );
  });

  it('returns 400 for missing walletAddress', async () => {
    const req = createPostRequest({});
    const res = await POST(req, { params: { id: validItemId } });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(createPendingSpendRedemption).not.toHaveBeenCalled();
  });

  it('returns 400 when item is no longer available', async () => {
    vi.mocked(createPendingSpendRedemption).mockRejectedValue(
      new Error('This item is no longer available')
    );

    const req = createPostRequest({ walletAddress: validWallet });
    const res = await POST(req, { params: { id: validItemId } });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('no longer available');
  });
});
