import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { PointConversion } from '@/lib/types';

const mockGetPointConversionBySessionId = vi.fn();

vi.mock('@/lib/db/spend-sessions', () => ({
  getPointConversionBySessionId: (...args: unknown[]) =>
    mockGetPointConversionBySessionId(...args),
}));

import { waitForPeerFundingTxHash } from '@/lib/spend-conversion-peer-funding-wait';

const baseConv: PointConversion = {
  id: 'c1',
  spend_experience_id: 'e1',
  spend_session_id: 's1',
  user_id: 'u1',
  points_deducted: 100,
  usdc_amount: 1,
  status: 'points_deducted',
  treasury_wallet_address: '0x1',
  user_wallet_address: '0x2',
  funding_tx_hash: null,
  idempotency_key: null,
  created_at: '2026-01-01T00:00:00.000Z',
  completed_at: null,
  failed_reason: null,
};

describe('waitForPeerFundingTxHash', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockGetPointConversionBySessionId.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns when peer row gains funding_tx_hash', async () => {
    let n = 0;
    mockGetPointConversionBySessionId.mockImplementation(async () => {
      n += 1;
      if (n < 3) {
        return {
          ...baseConv,
          status: 'points_deducted',
          funding_tx_hash: null,
        };
      }
      return {
        ...baseConv,
        status: 'funding_pending',
        funding_tx_hash: '0xabc',
      };
    });

    const done = waitForPeerFundingTxHash('s1');
    await vi.advanceTimersByTimeAsync(400);
    const row = await done;
    expect(row?.funding_tx_hash).toBe('0xabc');
    expect(row?.status).toBe('funding_pending');
  });

  it('returns immediately when row is not waiting on peer', async () => {
    mockGetPointConversionBySessionId.mockResolvedValue({
      ...baseConv,
      status: 'funding_pending',
      funding_tx_hash: '0xdef',
    });
    const row = await waitForPeerFundingTxHash('s1');
    expect(row?.funding_tx_hash).toBe('0xdef');
    expect(mockGetPointConversionBySessionId).toHaveBeenCalledTimes(1);
  });
});
