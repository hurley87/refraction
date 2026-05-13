import { readStellarTreasuryConfirmedUsdcBalance } from '@/lib/spend/stellar-treasury-funding';
import {
  fetchUsdcBalanceOnBase,
  isEvmAddress,
} from '@/lib/walletconnect-poster-direct-usdc';
import { stellarWalletAddressSchema } from '@/lib/schemas/player';
import {
  getSpendBaseTreasuryPrivyTransferConfig,
  getSpendRailBaseRpcUrl,
  getSpendRailBaseUsdcContractAddress,
  getSpendRailPublicMetadata,
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
  /** Technical network tag (Base mainnet CAIP-style id for Base; `stellar` for Stellar). */
  chain: string;
  minimumUsdc: number;
  usdcBalance: number | null;
  funded: boolean;
  spendRail: SpendExperience['spend_rail'];
  paymentNetworkDisplayName: string;
  fundingNetworkLabel: string;
  fundingCalloutTitle: string;
  fundingCalloutBody: string;
};

export type SpendServerWalletTransferConfig = {
  walletId: string;
  address: `0x${string}`;
};

/** Treasury address used for conversion funding ledger + atomic RPC (rail-specific shape). */
export type SpendTreasuryFundingWalletMeta =
  | { spendRail: 'base_usdc'; treasuryAddress: `0x${string}` }
  | { spendRail: 'stellar_usdc'; treasuryAddress: string };

/**
 * Resolves the configured treasury **public** address for conversion funding (IRL-16).
 * Base continues to use the Privy server wallet id + address pair via `getSpendServerWalletTransferConfig`.
 */
export function getSpendTreasuryFundingWalletMeta(
  experience: Pick<SpendExperience, 'spend_rail'>
): SpendTreasuryFundingWalletMeta | null {
  if (experience.spend_rail === 'base_usdc') {
    const cfg = getSpendServerWalletTransferConfig(experience);
    if (!cfg) return null;
    return { spendRail: 'base_usdc', treasuryAddress: cfg.address };
  }
  if (experience.spend_rail === 'stellar_usdc') {
    const raw = getSpendTreasuryWalletAddress('stellar_usdc').trim();
    const parsed = stellarWalletAddressSchema.safeParse(raw);
    if (!parsed.success) return null;
    return { spendRail: 'stellar_usdc', treasuryAddress: parsed.data };
  }
  return null;
}

/**
 * Global treasury (funding) wallet for the experience rail — from spend rail env config.
 */
export function getSpendServerWalletAddress(
  experience: Pick<SpendExperience, 'spend_rail'>
): string {
  return getSpendTreasuryWalletAddress(experience.spend_rail);
}

function fundingCalloutCopy(
  experience: Pick<SpendExperience, 'spend_rail' | 'max_usdc_per_user'>
): Pick<
  SpendServerWalletFundingMetadata,
  | 'fundingCalloutTitle'
  | 'fundingCalloutBody'
  | 'paymentNetworkDisplayName'
  | 'fundingNetworkLabel'
  | 'chain'
> {
  const meta = getSpendRailPublicMetadata(experience.spend_rail);
  const minStr = Number(experience.max_usdc_per_user).toFixed(2);
  if (experience.spend_rail === 'base_usdc') {
    return {
      chain: SPEND_SERVER_WALLET_CHAIN,
      paymentNetworkDisplayName: meta.displayName,
      fundingNetworkLabel: meta.networkLabel,
      fundingCalloutTitle: 'Fund the server wallet',
      fundingCalloutBody: `Send at least $${minStr} USDC on ${meta.networkLabel} to activate this spend experience. Fund enough USDC for expected redemptions.`,
    };
  }
  return {
    chain: 'stellar',
    paymentNetworkDisplayName: meta.displayName,
    fundingNetworkLabel: meta.networkLabel,
    fundingCalloutTitle: 'Fund the Stellar treasury',
    fundingCalloutBody: `Send at least $${minStr} USDC on the ${meta.networkLabel} network (${meta.displayName}) to the treasury address below. This funds user conversions; add enough for expected redemptions.`,
  };
}

export function spendServerWalletFundingMetadata(
  experience: Pick<SpendExperience, 'spend_rail' | 'max_usdc_per_user'>,
  usdcBalance: number | null
): SpendServerWalletFundingMetadata {
  const minimumUsdc = Number(experience.max_usdc_per_user);
  const callout = fundingCalloutCopy(experience);
  return {
    serverWalletAddress: getSpendTreasuryWalletAddress(experience.spend_rail),
    minimumUsdc,
    usdcBalance,
    funded: usdcBalance !== null && usdcBalance >= minimumUsdc,
    spendRail: experience.spend_rail,
    ...callout,
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

export async function fetchServerWalletUsdcBalanceSafe(
  experience: Pick<SpendExperience, 'spend_rail'>
): Promise<number | null> {
  if (experience.spend_rail === 'stellar_usdc') {
    try {
      return await readStellarTreasuryConfirmedUsdcBalance();
    } catch (error) {
      console.error('fetchServerWalletUsdcBalanceSafe stellar:', error);
      return null;
    }
  }
  return fetchUsdcBalanceSafe(
    experience.spend_rail,
    getSpendTreasuryWalletAddress(experience.spend_rail),
    'fetchServerWalletUsdcBalanceSafe'
  );
}
