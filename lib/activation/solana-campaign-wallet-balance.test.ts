import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetTokenAccountsByOwner = vi.fn();
const mockGetBalance = vi.fn();
const mockCreateSolanaRpc = vi.fn();

vi.mock('@solana/kit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@solana/kit')>();
  return {
    ...actual,
    createSolanaRpc: (...args: unknown[]) => mockCreateSolanaRpc(...args),
  };
});

import {
  fetchSolanaNativeBalance,
  fetchSolanaSplTokenBalance,
} from '@/lib/activation/solana-campaign-wallet-balance';
import { SOLANA_USDC_MINT_BY_CLUSTER } from '@/lib/activation/solana-config';

const OWNER = '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1';
const MINT = SOLANA_USDC_MINT_BY_CLUSTER['mainnet-beta'];

function tokenAccount(amount: string) {
  return {
    account: {
      data: {
        program: 'spl-token',
        parsed: { info: { tokenAmount: { amount, decimals: 6 } } },
      },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateSolanaRpc.mockReturnValue({
    getTokenAccountsByOwner: (...args: unknown[]) => ({
      send: () => mockGetTokenAccountsByOwner(...args),
    }),
    getBalance: (...args: unknown[]) => ({
      send: () => mockGetBalance(...args),
    }),
  });
});

describe('fetchSolanaSplTokenBalance', () => {
  it('sums token accounts for the mint in base units', async () => {
    mockGetTokenAccountsByOwner.mockResolvedValue({
      value: [tokenAccount('6131218'), tokenAccount('1000000')],
    });

    await expect(
      fetchSolanaSplTokenBalance({
        ownerAddress: OWNER,
        mint: MINT,
        decimals: 6,
        rpcUrl: 'https://rpc.example',
      })
    ).resolves.toBeCloseTo(7.131218, 6);
    expect(mockCreateSolanaRpc).toHaveBeenCalledWith('https://rpc.example');
    expect(mockGetTokenAccountsByOwner).toHaveBeenCalledWith(
      OWNER,
      { mint: MINT },
      { encoding: 'jsonParsed' }
    );
  });

  it('returns 0 when the wallet has no token account yet', async () => {
    mockGetTokenAccountsByOwner.mockResolvedValue({ value: [] });
    await expect(
      fetchSolanaSplTokenBalance({
        ownerAddress: OWNER,
        mint: MINT,
        decimals: 6,
      })
    ).resolves.toBe(0);
  });

  it('rejects invalid addresses without calling the RPC', async () => {
    await expect(
      fetchSolanaSplTokenBalance({
        ownerAddress: '0xabc',
        mint: MINT,
        decimals: 6,
      })
    ).rejects.toThrow('Invalid Solana owner or mint address');
    expect(mockCreateSolanaRpc).not.toHaveBeenCalled();
  });
});

describe('fetchSolanaNativeBalance', () => {
  it('converts lamports to SOL', async () => {
    mockGetBalance.mockResolvedValue({ value: BigInt(1_500_000_000) });
    await expect(
      fetchSolanaNativeBalance({ ownerAddress: OWNER })
    ).resolves.toBe(1.5);
    expect(mockGetBalance).toHaveBeenCalledWith(OWNER);
  });
});
