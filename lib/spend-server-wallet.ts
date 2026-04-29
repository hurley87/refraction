import {
  fetchUsdcBalanceOnBase,
  isEvmAddress,
} from '@/lib/walletconnect-poster-direct-usdc';
import type { SpendExperience } from '@/lib/types';

export const SPEND_SERVER_WALLET_CHAIN = 'base-mainnet';
export const SPEND_SERVER_WALLET_CAIP2 = 'eip155:8453';

export type SpendServerWalletMetadata = {
  privy_server_wallet_id: string;
  server_wallet_address: string;
  server_wallet_chain: string;
  server_wallet_created_at: string;
};

export type SpendServerWalletFundingMetadata = {
  serverWalletAddress: string;
  chain: string;
  minimumUsdc: number;
  usdcBalance: number | null;
  funded: boolean;
};

export type SpendServerWalletTransferConfig = {
  walletId: string;
  address: `0x${string}`;
};

export function getSpendServerWalletAddress(
  experience: Pick<
    SpendExperience,
    'server_wallet_address' | 'treasury_wallet_address'
  >
): string {
  return (
    experience.server_wallet_address?.trim() ||
    experience.treasury_wallet_address.trim()
  );
}

export function spendServerWalletFundingMetadata(
  experience: Pick<
    SpendExperience,
    'server_wallet_address' | 'treasury_wallet_address' | 'max_usdc_per_user'
  >,
  usdcBalance: number | null
): SpendServerWalletFundingMetadata {
  const minimumUsdc = Number(experience.max_usdc_per_user);
  return {
    serverWalletAddress: getSpendServerWalletAddress(experience),
    chain: SPEND_SERVER_WALLET_CHAIN,
    minimumUsdc,
    usdcBalance,
    funded: usdcBalance !== null && usdcBalance >= minimumUsdc,
  };
}

export function getSpendServerWalletTransferConfig(
  experience: Pick<
    SpendExperience,
    | 'privy_server_wallet_id'
    | 'server_wallet_address'
    | 'treasury_wallet_address'
  >
): SpendServerWalletTransferConfig | null {
  const walletId = experience.privy_server_wallet_id?.trim();
  const serverAddr = experience.server_wallet_address?.trim();
  if (!walletId || !serverAddr || !isEvmAddress(serverAddr)) {
    return null;
  }

  return { walletId, address: serverAddr as `0x${string}` };
}

async function fetchUsdcBalanceSafe(
  walletAddress: string | null | undefined,
  logContext: string
): Promise<number | null> {
  const trimmed = walletAddress?.trim();
  if (!trimmed || !isEvmAddress(trimmed)) {
    return null;
  }

  try {
    return await fetchUsdcBalanceOnBase(trimmed as `0x${string}`);
  } catch (error) {
    console.error(`${logContext}:`, error);
    return null;
  }
}

export async function getServerWalletFundingStatus(params: {
  walletAddress: string | null;
  minUsdcRequired: number;
}): Promise<{ usdcBalance: number | null; isFunded: boolean }> {
  const usdcBalance = await fetchUsdcBalanceSafe(
    params.walletAddress,
    'getServerWalletFundingStatus'
  );
  return {
    usdcBalance,
    isFunded:
      usdcBalance !== null && usdcBalance >= Number(params.minUsdcRequired),
  };
}

export function fetchServerWalletUsdcBalanceSafe(
  experience: Pick<
    SpendExperience,
    'server_wallet_address' | 'treasury_wallet_address'
  >
): Promise<number | null> {
  return fetchUsdcBalanceSafe(
    getSpendServerWalletAddress(experience),
    'fetchServerWalletUsdcBalanceSafe'
  );
}
