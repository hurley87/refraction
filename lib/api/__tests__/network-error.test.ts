import { HttpRequestError } from 'viem';
import { getContractError } from 'viem/utils';
import { describe, expect, it } from 'vitest';

import { isFetchNetworkError } from '@/lib/api/network-error';

const balanceOfAbi = [
  {
    type: 'function' as const,
    name: 'balanceOf',
    inputs: [],
    outputs: [],
    stateMutability: 'view' as const,
  },
];

describe('isFetchNetworkError', () => {
  it('detects Chromium failed-to-fetch TypeError', () => {
    expect(
      isFetchNetworkError(new TypeError('Failed to fetch (h4n.app)'))
    ).toBe(true);
  });

  it('detects Node.js undici fetch failed TypeError', () => {
    expect(isFetchNetworkError(new TypeError('fetch failed'))).toBe(true);
  });

  it('detects Safari load failed errors', () => {
    expect(isFetchNetworkError(new TypeError('Load failed'))).toBe(true);
  });

  it('detects nested cause chains from Supabase transport failures', () => {
    const cause = new TypeError('fetch failed');
    const error = new Error('Supabase request failed');
    (error as Error & { cause: Error }).cause = cause;

    expect(isFetchNetworkError(error)).toBe(true);
  });

  it('ignores unrelated TypeErrors', () => {
    expect(
      isFetchNetworkError(new TypeError('Cannot read properties of null'))
    ).toBe(false);
  });

  it('detects viem HttpRequestError transport failures', () => {
    expect(
      isFetchNetworkError(
        new HttpRequestError({ url: 'https://mainnet.base.org' })
      )
    ).toBe(true);
  });

  it('detects viem ContractFunctionExecutionError RPC transport failures', () => {
    const transportError = new HttpRequestError({
      url: 'https://mainnet.base.org',
    });
    const contractError = getContractError(transportError, {
      abi: balanceOfAbi,
      functionName: 'balanceOf',
      args: [],
    });

    expect(isFetchNetworkError(contractError)).toBe(true);
  });

  it('does not treat viem contract reverts as transport failures', () => {
    const contractError = getContractError(
      new Error('execution reverted: Insufficient balance'),
      {
        abi: balanceOfAbi,
        functionName: 'balanceOf',
        args: [],
      }
    );

    expect(isFetchNetworkError(contractError)).toBe(false);
  });
});
