import { address, createSolanaRpc } from '@solana/kit';
import {
  getSolanaRpcUrl,
  isSolanaAddress,
  isValidSolanaTokenDecimals,
  SOLANA_LAMPORTS_PER_SOL,
} from '@/lib/activation/solana-config';

/** SPL Token and Token-2022 program ids; a mint must be owned by one of them. */
export const SOLANA_TOKEN_PROGRAM_IDS = new Set([
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
]);

type SolanaRpc = ReturnType<typeof createSolanaRpc>;

function solanaRpc(rpcUrl?: string): SolanaRpc {
  return createSolanaRpc(rpcUrl ?? getSolanaRpcUrl());
}

type ParsedAccountData = {
  parsed?: {
    type?: string;
    info?: {
      decimals?: number;
      isInitialized?: boolean;
      tokenAmount?: { amount?: string; decimals?: number };
    };
  };
};

/**
 * Reads a mint's precision on-chain. Throws unless the account exists, is owned
 * by an SPL token program, and parses as an initialized mint.
 */
export async function fetchSolanaMintDecimals(params: {
  mint: string;
  rpcUrl?: string;
}): Promise<number> {
  if (!isSolanaAddress(params.mint)) {
    throw new Error('Invalid Solana mint address');
  }
  const { value } = await solanaRpc(params.rpcUrl)
    .getAccountInfo(address(params.mint.trim()), { encoding: 'jsonParsed' })
    .send();
  if (!value) throw new Error('Solana mint account not found');
  if (!SOLANA_TOKEN_PROGRAM_IDS.has(String(value.owner))) {
    throw new Error('Solana mint is not owned by an SPL token program');
  }
  const accountData = value.data as ParsedAccountData | null | undefined;
  const parsed = accountData?.parsed;
  const decimals = parsed?.info?.decimals;
  if (
    parsed?.type !== 'mint' ||
    parsed?.info?.isInitialized !== true ||
    !isValidSolanaTokenDecimals(decimals)
  ) {
    throw new Error('Solana account is not an initialized token mint');
  }
  return decimals;
}

/**
 * Sums the owner's SPL token balance for `mint` across all its token accounts
 * (normally just the associated token account). Returns 0 when none exist.
 */
export async function fetchSolanaSplTokenBalance(params: {
  ownerAddress: string;
  mint: string;
  decimals: number;
  rpcUrl?: string;
  rpc?: SolanaRpc;
}): Promise<number> {
  if (!isSolanaAddress(params.ownerAddress) || !isSolanaAddress(params.mint)) {
    throw new Error('Invalid Solana owner or mint address');
  }
  const rpc = params.rpc ?? solanaRpc(params.rpcUrl);
  const { value } = await rpc
    .getTokenAccountsByOwner(
      address(params.ownerAddress.trim()),
      { mint: address(params.mint.trim()) },
      { encoding: 'jsonParsed' }
    )
    .send();
  let baseUnits = BigInt(0);
  for (const account of value) {
    const tokenAmount = (
      account.account.data as ParsedAccountData | null | undefined
    )?.parsed?.info?.tokenAmount;
    if (
      tokenAmount?.decimals !== undefined &&
      tokenAmount.decimals !== params.decimals
    ) {
      throw new Error('Token account decimals do not match the mint config');
    }
    const raw = tokenAmount?.amount;
    if (typeof raw === 'string' && /^\d+$/.test(raw)) baseUnits += BigInt(raw);
  }
  return Number(baseUnits) / 10 ** params.decimals;
}

/** Native SOL balance (used to confirm the wallet can pay network fees). */
export async function fetchSolanaNativeBalance(params: {
  ownerAddress: string;
  rpcUrl?: string;
  rpc?: SolanaRpc;
}): Promise<number> {
  if (!isSolanaAddress(params.ownerAddress)) {
    throw new Error('Invalid Solana owner address');
  }
  const rpc = params.rpc ?? solanaRpc(params.rpcUrl);
  const { value } = await rpc
    .getBalance(address(params.ownerAddress.trim()))
    .send();
  return Number(value) / SOLANA_LAMPORTS_PER_SOL;
}

/** Settlement token (CADD) + native SOL in one RPC session (one client, parallel reads). */
export async function fetchSolanaCampaignWalletBalances(params: {
  ownerAddress: string;
  mint: string;
  decimals: number;
  rpcUrl?: string;
}): Promise<{ tokenBalance: number; solBalance: number }> {
  const rpc = solanaRpc(params.rpcUrl);
  const [tokenBalance, solBalance] = await Promise.all([
    fetchSolanaSplTokenBalance({ ...params, rpc }),
    fetchSolanaNativeBalance({ ownerAddress: params.ownerAddress, rpc }),
  ]);
  return { tokenBalance, solBalance };
}
