import {
  fetchUsdcBalanceOnBase,
  isEvmAddress,
} from '@/lib/walletconnect-poster-direct-usdc';
import {
  getSpendBaseTreasuryPrivyTransferConfig,
  getSpendRailBaseRpcUrl,
  getSpendRailBaseUsdcContractAddress,
  getSpendTreasuryWalletAddress,
  supportsSpendRailBasePrivyTreasuryFunding,
} from '@/lib/spend-rail-config';
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

/**
 * Global treasury (funding) wallet for the experience rail — from spend rail env config.
 */
export function getSpendServerWalletAddress(
  experience: Pick<SpendExperience, 'spend_rail'>
): string {
  return getSpendTreasuryWalletAddress(experience.spend_rail);
}

export function spendServerWalletFundingMetadata(
  experience: Pick<SpendExperience, 'spend_rail' | 'max_usdc_per_user'>,
  usdcBalance: number | null
): SpendServerWalletFundingMetadata {
  const minimumUsdc = Number(experience.max_usdc_per_user);
  return {
    serverWalletAddress: getSpendTreasuryWalletAddress(experience.spend_rail),
    chain: SPEND_SERVER_WALLET_CHAIN,
    minimumUsdc,
    usdcBalance,
    funded: usdcBalance !== null && usdcBalance >= minimumUsdc,
  };
}

export function getSpendServerWalletTransferConfig(
  experience: Pick<SpendExperience, 'spend_rail'>
): SpendServerWalletTransferConfig | null {
  if (!supportsSpendRailBasePrivyTreasuryFunding(experience.spend_rail)) {
    return null;
  }
  const cfg = getSpendBaseTreasuryPrivyTransferConfig();
  if (!cfg) return null;
  return { walletId: cfg.walletId, address: cfg.address };
}

async function fetchUsdcBalanceSafe(
  spendRail: SpendExperience['spend_rail'],
  walletAddress: string | null | undefined,
  logContext: string
): Promise<number | null> {
  if (spendRail !== 'base_usdc') {
    return null;
  }
  const trimmed = walletAddress?.trim();
  if (!trimmed || !isEvmAddress(trimmed)) {
    return null;
  }

  try {
    return await fetchUsdcBalanceOnBase(trimmed as `0x${string}`, {
      rpcUrl: getSpendRailBaseRpcUrl(),
      usdcContract: getSpendRailBaseUsdcContractAddress(),
    });
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
    'base_usdc',
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
  experience: Pick<SpendExperience, 'spend_rail'>
): Promise<number | null> {
  return fetchUsdcBalanceSafe(
    experience.spend_rail,
    getSpendTreasuryWalletAddress(experience.spend_rail),
    'fetchServerWalletUsdcBalanceSafe'
  );
}
