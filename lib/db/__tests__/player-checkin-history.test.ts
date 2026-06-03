import { describe, it, expect, vi, beforeEach } from 'vitest';
import { playerHasPriorCheckins } from '../player-checkin-history';

const mockFrom = vi.fn();

vi.mock('../client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

function chainWithCount(count: number | null, error: Error | null = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: (
      resolve: (v: { count: number | null; error: Error | null }) => void
    ) => resolve({ count, error }),
  };
  return chain;
}

describe('playerHasPriorCheckins', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false when player has no location or checkpoint check-ins', async () => {
    mockFrom
      .mockReturnValueOnce(chainWithCount(0))
      .mockReturnValueOnce(chainWithCount(0))
      .mockReturnValueOnce(chainWithCount(0));

    await expect(playerHasPriorCheckins(42, '0xabc')).resolves.toBe(false);
    expect(mockFrom).toHaveBeenCalledTimes(3);
  });

  it('returns true when player has a location check-in', async () => {
    mockFrom.mockReturnValueOnce(chainWithCount(1));

    await expect(playerHasPriorCheckins(42)).resolves.toBe(true);
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it('returns true when player has a checkpoint check-in by wallet', async () => {
    mockFrom
      .mockReturnValueOnce(chainWithCount(0))
      .mockReturnValueOnce(chainWithCount(2))
      .mockReturnValueOnce(chainWithCount(0));

    await expect(playerHasPriorCheckins(42, '0xwallet')).resolves.toBe(true);
    expect(mockFrom).toHaveBeenCalledTimes(3);
  });

  it('returns true when player has a checkpoint check-in by metadata player_id', async () => {
    mockFrom
      .mockReturnValueOnce(chainWithCount(0))
      .mockReturnValueOnce(chainWithCount(1));

    await expect(playerHasPriorCheckins(99)).resolves.toBe(true);
  });
});
