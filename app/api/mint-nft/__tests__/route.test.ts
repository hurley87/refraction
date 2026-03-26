import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  loadAccount: vi.fn(),
  simulateTransaction: vi.fn(),
  prepareTransaction: vi.fn(),
  sendTransaction: vi.fn(),
  getTransaction: vi.fn(),
  isSimulationError: vi.fn(),
  scValToNative: vi.fn(),
  contractCallFn: vi.fn(() => ({ kind: 'invoke' })),
  preparedTx: { sign: vi.fn() },
}));

vi.mock('@stellar/stellar-sdk', () => ({
  Keypair: {
    fromSecret: vi.fn(() => ({
      publicKey: () => 'GSERVERSIGNER',
    })),
  },
  Networks: {
    PUBLIC: 'Public Global Stellar Network ; September 2015',
    TESTNET: 'Test SDF Network ; September 2015',
  },
  TransactionBuilder: vi
    .fn()
    .mockImplementation(function MockTransactionBuilder() {
      return {
        addOperation: vi.fn().mockReturnThis(),
        setTimeout: vi.fn().mockReturnThis(),
        build: vi.fn(() => ({ built: true })),
      };
    }),
  Horizon: {
    Server: vi.fn(function MockHorizonServer() {
      return {
        loadAccount: mocks.loadAccount,
      };
    }),
  },
  rpc: {
    Api: {
      isSimulationError: mocks.isSimulationError,
      GetTransactionStatus: {
        SUCCESS: 'SUCCESS',
        FAILED: 'FAILED',
        NOT_FOUND: 'NOT_FOUND',
      },
    },
  },
  scValToNative: mocks.scValToNative,
}));

vi.mock('@/lib/stellar/utils/soroban', () => ({
  addressToScVal: vi.fn(() => ({ scVal: true })),
  getContract: vi.fn(() => ({
    call: mocks.contractCallFn,
  })),
  getSorobanRpc: vi.fn(() => ({
    simulateTransaction: mocks.simulateTransaction,
    prepareTransaction: mocks.prepareTransaction,
    sendTransaction: mocks.sendTransaction,
    getTransaction: mocks.getTransaction,
  })),
  isValidAddress: vi.fn(() => true),
}));

vi.mock('@/lib/stellar/utils/network', () => ({
  getHorizonUrlForNetwork: vi.fn(() => 'https://horizon-testnet.stellar.org'),
  getNFTContractAddress: vi.fn(
    () => 'CBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
  ),
}));

import { POST } from '../route';

function createRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/mint-nft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/mint-nft finality checks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SERVER_WALLET_PRIVATE_KEY = 'SBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';

    mocks.loadAccount.mockResolvedValue({ accountId: 'GACCOUNT' });
    mocks.isSimulationError.mockReturnValue(false);
    mocks.simulateTransaction.mockResolvedValue({
      result: { retval: 'mock-retval' },
    });
    mocks.prepareTransaction.mockResolvedValue(mocks.preparedTx);
    mocks.sendTransaction.mockResolvedValue({
      hash: 'abc123',
      errorResult: null,
    });
    mocks.scValToNative.mockReturnValue(7);
  });

  it('returns 400 when tx fails after submission', async () => {
    mocks.getTransaction.mockResolvedValue({
      status: 'FAILED',
      resultXdr: 'txBAD_AUTH',
    });

    const res = await POST(
      createRequest({
        walletAddress: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      })
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toContain('Transaction failed after submission');
    expect(json.error).toContain('txBAD_AUTH');
  });

  it('returns success only after finalized success', async () => {
    mocks.getTransaction.mockResolvedValue({
      status: 'SUCCESS',
    });

    const res = await POST(
      createRequest({
        walletAddress: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toMatchObject({
      txHash: 'abc123',
      tokenId: 7,
    });
    expect(mocks.contractCallFn).toHaveBeenCalledWith(
      'mint',
      expect.any(Object)
    );
  });
});
