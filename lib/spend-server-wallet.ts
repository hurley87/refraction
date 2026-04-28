import {
  encodeUsdcTransferData,
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

export function spendServerWalletAddress(
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

export const getSpendServerWalletAddress = spendServerWalletAddress;

export function spendPaymentRecipientAddress(
  experience: Pick<
    SpendExperience,
    'server_wallet_address' | 'receiving_wallet_address'
  >
): string {
  return (
    experience.server_wallet_address?.trim() ||
    experience.receiving_wallet_address.trim()
  );
}

export function spendServerWalletFundingMetadata(
  experience: Pick<
    SpendExperience,
    'server_wallet_address' | 'treasury_wallet_address' | 'max_usdc_per_user'
  >,
  usdcBalance: number | null
): {
  serverWalletAddress: string;
  chain: string;
  minimumUsdc: number;
  usdcBalance: number | null;
  funded: boolean;
} {
  const minimumUsdc = Number(experience.max_usdc_per_user);
  return {
    serverWalletAddress: spendServerWalletAddress(experience),
    chain: SPEND_SERVER_WALLET_CHAIN,
    minimumUsdc,
    usdcBalance,
    funded: usdcBalance !== null && usdcBalance >= minimumUsdc,
  };
}

export async function getServerWalletFundingStatus(params: {
  walletAddress: string | null;
  minUsdcRequired: number;
}): Promise<{ usdcBalance: number | null; isFunded: boolean }> {
  const walletAddress = params.walletAddress?.trim();
  if (!walletAddress || !isEvmAddress(walletAddress)) {
    return { usdcBalance: null, isFunded: false };
  }
  let usdcBalance: number | null = null;
  try {
    usdcBalance = await fetchUsdcBalanceOnBase(walletAddress as `0x${string}`);
  } catch (error) {
    console.error('getServerWalletFundingStatus:', error);
  }
  return {
    usdcBalance,
    isFunded:
      usdcBalance !== null && usdcBalance >= Number(params.minUsdcRequired),
  };
}

export function buildSpendUsdcTransferTx(params: {
  fromAddress: `0x${string}`;
  recipientAddress: `0x${string}`;
  usdcAmount: number;
}): { from: `0x${string}`; to: `0x${string}`; data: `0x${string}` } {
  return {
    from: params.fromAddress,
    to: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    data: encodeUsdcTransferData(params.recipientAddress, params.usdcAmount),
  };
}
