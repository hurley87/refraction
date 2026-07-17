import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  normalizePrivyReferenceId,
  PrivyRestApiError,
  signAndSendTransaction,
  signAndSendTempoTransaction,
  waitForTransaction,
} from './privy-server-rest';

const PRIVY_REFERENCE_ID_MAX_LENGTH = 64;

/** Legacy withdraw prefix; still over Privy's 64-char limit with a UUID + timestamp. */
const LONG_REFERENCE_ID = `sponsored-activation-withdraw:66701108-f3d1-4b3a-bc23-84681e8472f4:${Date.now()}`;

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
    expect(LONG_REFERENCE_ID.length).toBeGreaterThan(
      PRIVY_REFERENCE_ID_MAX_LENGTH
    );

    const normalized = normalizePrivyReferenceId(LONG_REFERENCE_ID);
    expect(normalized).toHaveLength(PRIVY_REFERENCE_ID_MAX_LENGTH);
    expect(normalized).toBe(normalizePrivyReferenceId(LONG_REFERENCE_ID));
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

    await signAndSendTransaction({
      walletId: 'w1',
      to: '0x1',
      data: '0x',
      referenceId: LONG_REFERENCE_ID,
    });

    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as { body: string }).body
    );
    expect(body.reference_id).toHaveLength(PRIVY_REFERENCE_ID_MAX_LENGTH);
    expect(body.reference_id).not.toBe(LONG_REFERENCE_ID);
  });
});

describe('signAndSendTempoTransaction', () => {
  it('POSTs a sponsored native type-118 transaction on Tempo', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { transaction_id: 'tempo-tx-1', hash: '0x' + 'a'.repeat(64) },
      }),
    });

    const result = await signAndSendTempoTransaction({
      walletId: 'tempo-wallet',
      calls: [
        {
          to: '0x20c000000000000000000000D65B4808c85DbB81',
          data: '0x1234',
        },
      ],
      referenceId: 'activation-settlement:tempo-1',
    });

    expect(result.transactionId).toBe('tempo-tx-1');
    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as { body: string }).body
    );
    expect(body).toMatchObject({
      method: 'eth_sendTransaction',
      caip2: 'eip155:4217',
      chain_type: 'ethereum',
      sponsor: true,
      params: {
        transaction: {
          type: 118,
          calls: [
            {
              to: '0x20c000000000000000000000D65B4808c85DbB81',
              data: '0x1234',
              value: '0x0',
            },
          ],
        },
      },
    });
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
