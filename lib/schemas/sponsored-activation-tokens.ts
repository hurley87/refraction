import { POSTER_CHECKOUT_USDC_ADDRESS_BASE } from '@/lib/walletconnect-poster-direct-usdc';

/**
 * Payment tokens sponsored activations can settle in on Base. Admin picks one
 * at create time (`payment_token`); the resolved contract + decimals are
 * persisted in `usdc_asset_config` so settlement/withdraw/balance reads never
 * have to re-derive them.
 */
export type SponsoredActivationBaseTokenSymbol = 'USDC' | 'CADD';

export type SponsoredActivationBaseToken = {
  symbol: SponsoredActivationBaseTokenSymbol;
  label: string;
  contract_address: `0x${string}`;
  decimals: number;
};

/** CADD ("CAD Digital Inc") on Base mainnet. */
export const CADD_ADDRESS_BASE =
  '0x16F93eBC5320C89EfC8701577efe49d14A276a06' as const;

export const SPONSORED_ACTIVATION_BASE_TOKENS: Record<
  SponsoredActivationBaseTokenSymbol,
  SponsoredActivationBaseToken
> = {
  USDC: {
    symbol: 'USDC',
    label: 'USDC',
    contract_address: POSTER_CHECKOUT_USDC_ADDRESS_BASE,
    decimals: 6,
  },
  CADD: {
    symbol: 'CADD',
    label: 'CADD',
    contract_address: CADD_ADDRESS_BASE,
    decimals: 18,
  },
};

export const SPONSORED_ACTIVATION_BASE_TOKEN_SYMBOLS = Object.keys(
  SPONSORED_ACTIVATION_BASE_TOKENS
) as SponsoredActivationBaseTokenSymbol[];

export function isSponsoredActivationBaseTokenSymbol(
  value: string
): value is SponsoredActivationBaseTokenSymbol {
  return (SPONSORED_ACTIVATION_BASE_TOKEN_SYMBOLS as string[]).includes(value);
}

export function getSponsoredActivationBaseTokenBySymbol(
  symbol: string
): SponsoredActivationBaseToken | null {
  return isSponsoredActivationBaseTokenSymbol(symbol)
    ? SPONSORED_ACTIVATION_BASE_TOKENS[symbol]
    : null;
}

export function getSponsoredActivationBaseTokenByContract(
  contractAddress: string
): SponsoredActivationBaseToken | null {
  const normalized = contractAddress.trim().toLowerCase();
  return (
    Object.values(SPONSORED_ACTIVATION_BASE_TOKENS).find(
      (t) => t.contract_address.toLowerCase() === normalized
    ) ?? null
  );
}

/**
 * Resolves ERC-20 decimals for a Base settlement contract. Falls back to
 * USDC's 6 decimals for legacy activations (pre-dating `symbol` on
 * `usdc_asset_config`) and unrecognized/custom contracts, matching prior
 * behavior where 6 decimals was hardcoded everywhere.
 */
export function resolveBaseTokenDecimals(contractAddress: string): number {
  return (
    getSponsoredActivationBaseTokenByContract(contractAddress)?.decimals ?? 6
  );
}

/**
 * Display symbol for a sponsored activation's settlement token (Base or
 * Stellar). Structural typing keeps this safe to import from client
 * components without pulling in `lib/db/sponsored-activations`.
 */
export function describeSponsoredActivationPaymentTokenSymbol(row: {
  settlement_rail: string;
  usdc_asset_config: Record<string, unknown>;
}): string {
  if (row.settlement_rail === 'stellar') {
    const code = row.usdc_asset_config?.asset_code;
    return typeof code === 'string' && code.trim() ? code.trim() : 'USDC';
  }
  const contract = row.usdc_asset_config?.contract_address;
  if (typeof contract === 'string') {
    return (
      getSponsoredActivationBaseTokenByContract(contract)?.symbol ?? 'USDC'
    );
  }
  return 'USDC';
}
