import { address, createSolanaRpc } from '@solana/kit';
import {
  getSolanaRpcUrl,
  isSolanaAddress,
  SOLANA_LAMPORTS_PER_SOL,
} from '@/lib/activation/solana-config';

type ParsedTokenAccountData = {
  parsed?: {
    info?: {
      tokenAmount?: { amount?: string; decimals?: number };
    };
  };
};

/**
 * Sums the owner's SPL token balance for `mint` across all its token accounts
 * (normally just the associated token account). Returns 0 when none exist.
 */
export async function fetchSolanaSplTokenBalance(params: {
  ownerAddress: string;
  mint: string;
  decimals: number;
  rpcUrl?: string;
}): Promise<number> {
  if (!isSolanaAddress(params.ownerAddress) || !isSolanaAddress(params.mint)) {
    throw new Error('Invalid Solana owner or mint address');
  }
  const rpc = createSolanaRpc(params.rpcUrl ?? getSolanaRpcUrl());
  const { value } = await rpc
    .getTokenAccountsByOwner(
      address(params.ownerAddress.trim()),
      { mint: address(params.mint.trim()) },
      { encoding: 'jsonParsed' }
    )
    .send();
  let baseUnits = BigInt(0);
  for (const account of value) {
    const data = account.account.data as ParsedTokenAccountData;
    const raw = data.parsed?.info?.tokenAmount?.amount;
    if (typeof raw === 'string' && /^\d+$/.test(raw)) baseUnits += BigInt(raw);
  }
  return Number(baseUnits) / 10 ** params.decimals;
}

/** Native SOL balance (used to confirm the wallet can pay network fees). */
export async function fetchSolanaNativeBalance(params: {
  ownerAddress: string;
  rpcUrl?: string;
}): Promise<number> {
  if (!isSolanaAddress(params.ownerAddress)) {
    throw new Error('Invalid Solana owner address');
  }
  const rpc = createSolanaRpc(params.rpcUrl ?? getSolanaRpcUrl());
  const { value } = await rpc
    .getBalance(address(params.ownerAddress.trim()))
    .send();
  return Number(value) / SOLANA_LAMPORTS_PER_SOL;
}
