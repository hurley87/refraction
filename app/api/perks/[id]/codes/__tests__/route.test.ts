import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetUniversal = vi.fn();
const mockHasIndividual = vi.fn();

vi.mock('@/lib/db/perks', () => ({
  getUniversalDiscountCodesByPerkId: (...args: unknown[]) =>
    mockGetUniversal(...args),
  perkHasIndividualDiscountCodes: (...args: unknown[]) =>
    mockHasIndividual(...args),
}));

import { GET } from '../route';

describe('GET /api/perks/[id]/codes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns universal codes and whether individual codes exist', async () => {
    mockGetUniversal.mockResolvedValue([
      { id: 'code-1', code: 'SAVE10', is_universal: true },
    ]);
    mockHasIndividual.mockResolvedValue(false);

    const response = await GET(
      new NextRequest('http://localhost/api/perks/p/codes'),
      {
        params: { id: 'perk-1' },
      }
    );
    const body = await response.json();

    expect(mockGetUniversal).toHaveBeenCalledWith('perk-1');
    expect(mockHasIndividual).toHaveBeenCalledWith('perk-1');
    expect(body.data.codes).toHaveLength(1);
    expect(body.data.hasIndividualCodes).toBe(false);
  });

  it('flags individual-code rewards without listing the codes', async () => {
    mockGetUniversal.mockResolvedValue([]);
    mockHasIndividual.mockResolvedValue(true);

    const response = await GET(
      new NextRequest('http://localhost/api/perks/p/codes'),
      {
        params: { id: 'perk-fuser' },
      }
    );
    const body = await response.json();

    expect(body.data.codes).toEqual([]);
    expect(body.data.hasIndividualCodes).toBe(true);
    expect(JSON.stringify(body)).not.toContain('FUSER');
  });
});
