import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PrivyRestApiError,
  signAndSendTransaction,
  waitForTransaction,
} from './privy-server-rest';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  process.env.NEXT_PUBLIC_PRIVY_APP_ID = 'app-id';
  process.env.PRIVY_APP_SECRET = 'app-secret';
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('signAndSendTransaction', () => {
  it('POSTs eth_sendTransaction and parses data.transaction_id', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          transaction_id: 'tx-abc',
          user_operation_hash: '0x' + 'b'.repeat(64),
          hash: '',
        },
      }),
    });

    const r = await signAndSendTransaction({
      walletId: 'w1',
      to: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      data: '0x',
    });

    expect(r.transactionId).toBe('tx-abc');
    expect(r.userOperationHash).toHaveLength(66);
    expect(r.hash).toBe('');

    const call = fetchMock.mock.calls[0];
    expect(String(call[0])).toContain('/wallets/w1/rpc');
    const body = JSON.parse((call[1] as { body: string }).body);
    expect(body.method).toBe('eth_sendTransaction');
    expect(body.sponsor).toBe(true);
    expect(body.params.transaction.to).toContain('0x');
  });

  it('throws when transaction_id is missing', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { hash: '' } }),
    });

    await expect(
      signAndSendTransaction({
        walletId: 'w1',
        to: '0x1',
        data: '0x',
      })
    ).rejects.toBeInstanceOf(PrivyRestApiError);
  });
});

describe('waitForTransaction', () => {
  it('returns hash when GET returns confirmed with transaction_hash', async () => {
    const h =
      '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc';
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'tx-1',
        status: 'confirmed',
        transaction_hash: h,
        user_operation_hash: null,
      }),
    });

    const r = await waitForTransaction('tx-1', { timeoutMs: 2_000 });
    expect(r.transactionHash).toBe(h);
    expect(r.status).toBe('confirmed');
  });
});
