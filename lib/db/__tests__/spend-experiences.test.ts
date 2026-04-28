import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFrom, mockSelect, mockOrder } = vi.hoisted(() => {
  const order = vi.fn();
  const select = vi.fn(() => ({ order }));
  const from = vi.fn(() => ({ select }));

  return {
    mockFrom: from,
    mockSelect: select,
    mockOrder: order,
  };
});

vi.mock('@/lib/db/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { listSpendExperiences } from '../spend-experiences';

const legacySpendExperienceRow = {
  id: 'exp-1',
  title: 'Pilot',
  description: null,
  event_id: null,
  status: 'draft',
  points_to_usdc_rate: 1000,
  max_usdc_per_user: 5,
  treasury_wallet_address: '0x1111111111111111111111111111111111111111',
  receiving_wallet_address: '0x2222222222222222222222222222222222222222',
  start_time: '2026-05-01T00:00:00.000Z',
  end_time: '2026-05-02T00:00:00.000Z',
  created_by: 'admin@example.com',
  created_at: '2026-04-01T00:00:00.000Z',
  updated_at: '2026-04-01T00:00:00.000Z',
};

describe('listSpendExperiences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retries without server wallet columns when an older schema is missing them', async () => {
    mockOrder
      .mockResolvedValueOnce({
        data: null,
        error: {
          code: '42703',
          message:
            'column spend_experiences.privy_server_wallet_id does not exist',
        },
      })
      .mockResolvedValueOnce({
        data: [legacySpendExperienceRow],
        error: null,
      });

    const experiences = await listSpendExperiences();

    expect(mockFrom).toHaveBeenCalledWith('spend_experiences');
    expect(mockSelect).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('privy_server_wallet_id')
    );
    expect(mockSelect).toHaveBeenNthCalledWith(
      2,
      expect.not.stringContaining('privy_server_wallet_id')
    );
    expect(experiences).toEqual([
      expect.objectContaining({
        id: 'exp-1',
        title: 'Pilot',
        privy_server_wallet_id: null,
        server_wallet_address: null,
      }),
    ]);
  });

  it('uses server wallet columns when the schema has them', async () => {
    mockOrder.mockResolvedValueOnce({
      data: [
        {
          ...legacySpendExperienceRow,
          privy_server_wallet_id: 'wallet-1',
          server_wallet_address: '0x3333333333333333333333333333333333333333',
          server_wallet_chain: 'base-mainnet',
          server_wallet_created_at: '2026-04-28T00:00:00.000Z',
          spend_create_idempotency_key: 'idem-1',
        },
      ],
      error: null,
    });

    const experiences = await listSpendExperiences();

    expect(mockSelect).toHaveBeenCalledOnce();
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining('server_wallet_created_at')
    );
    expect(experiences[0]).toEqual(
      expect.objectContaining({
        privy_server_wallet_id: 'wallet-1',
        server_wallet_address: '0x3333333333333333333333333333333333333333',
        spend_create_idempotency_key: 'idem-1',
      })
    );
  });
});
