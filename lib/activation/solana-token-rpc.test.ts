import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetTokenAccountsByOwner = vi.fn();
const mockGetBalance = vi.fn();
const mockGetAccountInfo = vi.fn();
const mockCreateSolanaRpc = vi.fn();

vi.mock('@solana/kit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@solana/kit')>();
  return {
    ...actual,
    createSolanaRpc: (...args: unknown[]) => mockCreateSolanaRpc(...args),
  };
});

import {
  fetchSolanaCampaignWalletBalances,
  fetchSolanaMintDecimals,
  fetchSolanaNativeBalance,
  fetchSolanaSplTokenBalance,
} from '@/lib/activation/solana-token-rpc';

const OWNER = '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1';
const TEST_CADD_MINT = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const TOKEN_2022_PROGRAM = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';

function tokenAccount(amount: string, decimals = 9) {
  return {
    account: {
      data: {
        program: 'spl-token',
        parsed: { info: { tokenAmount: { amount, decimals } } },
      },
    },
  };
}

function mintAccount(
  overrides: {
    owner?: string;
    type?: string;
    decimals?: number;
    isInitialized?: boolean;
  } = {}
) {
  return {
    value: {
      owner: overrides.owner ?? TOKEN_PROGRAM,
      data: {
        parsed: {
          type: overrides.type ?? 'mint',
          info: {
            decimals: overrides.decimals ?? 9,
            isInitialized: overrides.isInitialized ?? true,
          },
        },
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
    getAccountInfo: (...args: unknown[]) => ({
      send: () => mockGetAccountInfo(...args),
    }),
  });
});

describe('fetchSolanaMintDecimals', () => {
  it.each([TOKEN_PROGRAM, TOKEN_2022_PROGRAM])(
    'reads decimals from a mint owned by %s',
    async (owner) => {
      mockGetAccountInfo.mockResolvedValue(mintAccount({ owner, decimals: 9 }));
      await expect(
        fetchSolanaMintDecimals({ mint: TEST_CADD_MINT })
      ).resolves.toBe(9);
      expect(mockGetAccountInfo).toHaveBeenCalledWith(TEST_CADD_MINT, {
        encoding: 'jsonParsed',
      });
    }
  );

  it('rejects a missing account', async () => {
    mockGetAccountInfo.mockResolvedValue({ value: null });
    await expect(
      fetchSolanaMintDecimals({ mint: TEST_CADD_MINT })
    ).rejects.toThrow('Solana mint account not found');
  });

  it('rejects an account not owned by an SPL token program', async () => {
    mockGetAccountInfo.mockResolvedValue(
      mintAccount({ owner: '11111111111111111111111111111111' })
    );
    await expect(
      fetchSolanaMintDecimals({ mint: TEST_CADD_MINT })
    ).rejects.toThrow('Solana mint is not owned by an SPL token program');
  });

  it('rejects a token account passed as a mint', async () => {
    mockGetAccountInfo.mockResolvedValue(mintAccount({ type: 'account' }));
    await expect(
      fetchSolanaMintDecimals({ mint: TEST_CADD_MINT })
    ).rejects.toThrow('Solana account is not an initialized token mint');
  });

  it('rejects an uninitialized mint', async () => {
    mockGetAccountInfo.mockResolvedValue(mintAccount({ isInitialized: false }));
    await expect(
      fetchSolanaMintDecimals({ mint: TEST_CADD_MINT })
    ).rejects.toThrow('Solana account is not an initialized token mint');
  });
});

describe('fetchSolanaSplTokenBalance', () => {
  it('sums token accounts using the configured precision (9 decimals)', async () => {
    mockGetTokenAccountsByOwner.mockResolvedValue({
      value: [tokenAccount('1500000000'), tokenAccount('250000000')],
    });

    await expect(
      fetchSolanaSplTokenBalance({
        ownerAddress: OWNER,
        mint: TEST_CADD_MINT,
        decimals: 9,
        rpcUrl: 'https://rpc.example',
      })
    ).resolves.toBe(1.75);
    expect(mockCreateSolanaRpc).toHaveBeenCalledWith('https://rpc.example');
    expect(mockGetTokenAccountsByOwner).toHaveBeenCalledWith(
      OWNER,
      { mint: TEST_CADD_MINT },
      { encoding: 'jsonParsed' }
    );
  });

  it('throws when on-chain token decimals disagree with the config', async () => {
    mockGetTokenAccountsByOwner.mockResolvedValue({
      value: [tokenAccount('1000000', 6)],
    });
    await expect(
      fetchSolanaSplTokenBalance({
        ownerAddress: OWNER,
        mint: TEST_CADD_MINT,
        decimals: 9,
      })
    ).rejects.toThrow('Token account decimals do not match the mint config');
  });

  it('returns 0 when the wallet has no token account yet', async () => {
    mockGetTokenAccountsByOwner.mockResolvedValue({ value: [] });
    await expect(
      fetchSolanaSplTokenBalance({
        ownerAddress: OWNER,
        mint: TEST_CADD_MINT,
        decimals: 9,
      })
    ).resolves.toBe(0);
  });

  it('rejects invalid addresses without calling the RPC', async () => {
    await expect(
      fetchSolanaSplTokenBalance({
        ownerAddress: '0xabc',
        mint: TEST_CADD_MINT,
        decimals: 9,
      })
    ).rejects.toThrow('Invalid Solana owner or mint address');
    expect(mockCreateSolanaRpc).not.toHaveBeenCalled();
  });
});

describe('fetchSolanaCampaignWalletBalances', () => {
  it('reads CADD and SOL through one RPC client', async () => {
    mockGetTokenAccountsByOwner.mockResolvedValue({
      value: [tokenAccount('12000000000')],
    });
    mockGetBalance.mockResolvedValue({ value: BigInt(50_000_000) });

    await expect(
      fetchSolanaCampaignWalletBalances({
        ownerAddress: OWNER,
        mint: TEST_CADD_MINT,
        decimals: 9,
      })
    ).resolves.toEqual({ tokenBalance: 12, solBalance: 0.05 });
    expect(mockCreateSolanaRpc).toHaveBeenCalledTimes(1);
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
