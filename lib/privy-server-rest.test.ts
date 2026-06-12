import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  normalizePrivyReferenceId,
  PRIVY_REFERENCE_ID_MAX_LENGTH,
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

describe('normalizePrivyReferenceId', () => {
  it('returns short ids unchanged', () => {
    expect(normalizePrivyReferenceId('activation-settlement:abc')).toBe(
      'activation-settlement:abc'
    );
  });

  it('maps ids longer than 64 chars to a 64-char digest', () => {
    const longId = `sponsored-activation-withdraw:66701108-f3d1-4b3a-bc23-84681e8472f4:${Date.now()}`;
    expect(longId.length).toBeGreaterThan(PRIVY_REFERENCE_ID_MAX_LENGTH);

    const normalized = normalizePrivyReferenceId(longId);
    expect(normalized).toHaveLength(PRIVY_REFERENCE_ID_MAX_LENGTH);
    expect(normalized).toBe(normalizePrivyReferenceId(longId));
  });
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

  it('normalizes reference_id longer than 64 characters before send', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          transaction_id: 'tx-abc',
          user_operation_hash: null,
          hash: '',
        },
      }),
    });

    const longReferenceId = `sponsored-activation-withdraw:66701108-f3d1-4b3a-bc23-84681e8472f4:${Date.now()}`;
    await signAndSendTransaction({
      walletId: 'w1',
      to: '0x1',
      data: '0x',
      referenceId: longReferenceId,
    });

    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as { body: string }).body
    );
    expect(body.reference_id).toHaveLength(PRIVY_REFERENCE_ID_MAX_LENGTH);
    expect(body.reference_id).toBe(normalizePrivyReferenceId(longReferenceId));
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
