import {
  POSTER_CHECKOUT_USDC_ADDRESS_BASE,
  isEvmAddress,
} from '@/lib/walletconnect-poster-direct-usdc';
import { stellarWalletAddressSchema } from '@/lib/schemas/player';
import type { SpendRail } from '@/lib/types';
import { mapSpendRailOperationalReasonToAdminCurated } from '@/lib/spend-rail-config/admin-curated-unavailable-reasons';
import { collectStellarSpendReadinessConfigReasons } from '@/lib/spend/stellar-wallet-readiness-config';
import { collectStellarTreasuryFundingConfigReasons } from '@/lib/spend/stellar-treasury-funding-config';
import type {
  SpendRailCatalogEntry,
  SpendRailClientSummary,
  SpendRailOperationalDiagnostics,
  SpendRailPublicMetadata,
} from '@/lib/spend-rail-config/types';

export type {
  SpendRailPublicMetadata,
  SpendRailOperationalDiagnostics,
  SpendRailClientSummary,
  SpendRailCatalogEntry,
} from '@/lib/spend-rail-config/types';

const DEFAULT_BASE_RPC = 'https://mainnet.base.org';

function trimEnv(key: string): string {
  return (process.env[key] ?? '').trim();
}

function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null || value.trim() === '') return defaultValue;
  const v = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(v)) return true;
  if (['0', 'false', 'no', 'off'].includes(v)) return false;
  return defaultValue;
}

function stellarExplorerTemplateFromNetwork(networkUpper: string): string {
  const base =
    networkUpper === 'TESTNET' || networkUpper === 'FUTURENET'
      ? 'https://stellar.expert/explorer/testnet'
      : 'https://stellar.expert/explorer/public';
  return `${base}/tx/{txHash}`;
}

type ParsedBase = {
  enabled: boolean;
  treasuryAddress: string | null;
  receivingAddress: string | null;
  privyServerWalletId: string | null;
  usdcContract: string;
  rpcUrl: string;
  explorerTxUrlTemplate: string;
};

type ParsedStellar = {
  enabled: boolean;
  receivingAddress: string | null;
  /** Optional; when unset, treasury display/fallback uses `receivingAddress`. */
  treasuryAddress: string | null;
  stellarNetworkUpper: string;
  explorerTxUrlTemplate: string;
};

type ParsedRails = {
  base: ParsedBase;
  stellar: ParsedStellar;
};

function parseRailsConfig(): ParsedRails {
  const baseEnabled = parseBool(process.env.SPEND_RAIL_BASE_USDC_ENABLED, true);
  const treasuryAddress =
    trimEnv('SPEND_RAIL_BASE_USDC_TREASURY_WALLET_ADDRESS') || null;
  const receivingAddress =
    trimEnv('SPEND_RAIL_BASE_USDC_RECEIVING_WALLET_ADDRESS') || null;
  const privyServerWalletId =
    trimEnv('SPEND_RAIL_BASE_USDC_PRIVY_SERVER_WALLET_ID') || null;
  const usdcContract =
    trimEnv('SPEND_RAIL_BASE_USDC_USDC_CONTRACT') ||
    POSTER_CHECKOUT_USDC_ADDRESS_BASE;
  const rpcUrl =
    trimEnv('SPEND_RAIL_BASE_USDC_RPC_URL') ||
    trimEnv('NEXT_PUBLIC_BASE_RPC') ||
    DEFAULT_BASE_RPC;
  const explorerTemplateRaw = trimEnv(
    'NEXT_PUBLIC_SPEND_RAIL_BASE_USDC_EXPLORER_TX_URL_TEMPLATE'
  );
  const explorerTxUrlTemplate =
    explorerTemplateRaw.length > 0
      ? explorerTemplateRaw
      : 'https://basescan.org/tx/{txHash}';

  const stellarEnabled = parseBool(
    process.env.SPEND_RAIL_STELLAR_USDC_ENABLED,
    false
  );
  const stellarReceiving =
    trimEnv('SPEND_RAIL_STELLAR_USDC_RECEIVING_ADDRESS') || null;
  const stellarTreasury =
    trimEnv('SPEND_RAIL_STELLAR_USDC_TREASURY_ADDRESS') || null;
  const stellarNetworkRaw = trimEnv('NEXT_PUBLIC_STELLAR_NETWORK');
  const stellarNetworkUpper = stellarNetworkRaw.toUpperCase();
  const stellarExplorerOverride = trimEnv(
    'NEXT_PUBLIC_SPEND_RAIL_STELLAR_USDC_EXPLORER_TX_URL_TEMPLATE'
  );
  const stellarExplorerTxUrlTemplate =
    stellarExplorerOverride.length > 0
      ? stellarExplorerOverride
      : stellarExplorerTemplateFromNetwork(stellarNetworkUpper);

  return {
    base: {
      enabled: baseEnabled,
      treasuryAddress,
      receivingAddress,
      privyServerWalletId,
      usdcContract,
      rpcUrl,
      explorerTxUrlTemplate,
    },
    stellar: {
      enabled: stellarEnabled,
      receivingAddress: stellarReceiving,
      treasuryAddress: stellarTreasury,
      stellarNetworkUpper,
      explorerTxUrlTemplate: stellarExplorerTxUrlTemplate,
    },
  };
}

function validateExplorerTemplate(template: string, label: string): string[] {
  if (!template.includes('{txHash}')) {
    return [`${label} explorer template must include {txHash} placeholder`];
  }
  return [];
}

function collectBaseOperationalReasons(parsed: ParsedBase): string[] {
  const reasons: string[] = [];
  if (!parsed.enabled) {
    reasons.push('base_usdc rail is disabled (SPEND_RAIL_BASE_USDC_ENABLED)');
    return reasons;
  }
  if (!parsed.treasuryAddress) {
    reasons.push('SPEND_RAIL_BASE_USDC_TREASURY_WALLET_ADDRESS is missing');
  } else if (!isEvmAddress(parsed.treasuryAddress)) {
    reasons.push(
      'SPEND_RAIL_BASE_USDC_TREASURY_WALLET_ADDRESS is not a valid EVM address'
    );
  }
  if (!parsed.receivingAddress) {
    reasons.push('SPEND_RAIL_BASE_USDC_RECEIVING_WALLET_ADDRESS is missing');
  } else if (!isEvmAddress(parsed.receivingAddress)) {
    reasons.push(
      'SPEND_RAIL_BASE_USDC_RECEIVING_WALLET_ADDRESS is not a valid EVM address'
    );
  }
  if (!parsed.privyServerWalletId) {
    reasons.push('SPEND_RAIL_BASE_USDC_PRIVY_SERVER_WALLET_ID is missing');
  }
  if (!isEvmAddress(parsed.usdcContract)) {
    reasons.push(
      'SPEND_RAIL_BASE_USDC_USDC_CONTRACT is not a valid EVM address'
    );
  }
  reasons.push(
    ...validateExplorerTemplate(parsed.explorerTxUrlTemplate, 'Base')
  );
  if (!parsed.rpcUrl) {
    reasons.push('Base RPC URL resolved empty');
  }
  return reasons;
}

function collectStellarOperationalReasons(parsed: ParsedStellar): string[] {
  const reasons: string[] = [];
  if (!parsed.enabled) {
    reasons.push(
      'stellar_usdc rail is disabled (SPEND_RAIL_STELLAR_USDC_ENABLED)'
    );
    return reasons;
  }
  if (!trimEnv('NEXT_PUBLIC_STELLAR_NETWORK')) {
    reasons.push(
      'NEXT_PUBLIC_STELLAR_NETWORK is missing (required for Stellar spend rail)'
    );
  }
  if (!parsed.receivingAddress) {
    reasons.push('SPEND_RAIL_STELLAR_USDC_RECEIVING_ADDRESS is missing');
  } else {
    const stellarCheck = stellarWalletAddressSchema.safeParse(
      parsed.receivingAddress
    );
    if (!stellarCheck.success) {
      reasons.push(
        'SPEND_RAIL_STELLAR_USDC_RECEIVING_ADDRESS is not a valid Stellar public key'
      );
    }
  }
  if (parsed.treasuryAddress) {
    const t = stellarWalletAddressSchema.safeParse(parsed.treasuryAddress);
    if (!t.success) {
      reasons.push(
        'SPEND_RAIL_STELLAR_USDC_TREASURY_ADDRESS is not a valid Stellar public key'
      );
    }
  }
  reasons.push(
    ...validateExplorerTemplate(parsed.explorerTxUrlTemplate, 'Stellar')
  );
  reasons.push(...collectStellarSpendReadinessConfigReasons());
  const treasuryResolved =
    parsed.treasuryAddress?.trim() || parsed.receivingAddress?.trim() || '';
  reasons.push(
    ...collectStellarTreasuryFundingConfigReasons({
      treasuryPublicAddressTrimmed: treasuryResolved,
    })
  );
  return reasons;
}

/** Optional Stellar server URL used elsewhere in the app; validated only when set (IRL-8). */
export function getOptionalStellarHorizonUrlForSpendEnv(): {
  value: string | null;
  valid: boolean;
  reason: string | null;
} {
  const v = trimEnv('NEXT_PUBLIC_STELLAR_HORIZON_URL');
  if (!v) return { value: null, valid: true, reason: null };
  try {
    // eslint-disable-next-line no-new -- URL validates shape
    new URL(v);
    return { value: v, valid: true, reason: null };
  } catch {
    return {
      value: v,
      valid: false,
      reason: 'NEXT_PUBLIC_STELLAR_HORIZON_URL is not a valid URL',
    };
  }
}

export function getSpendRailOperationalDiagnostics(
  spendRail: SpendRail
): SpendRailOperationalDiagnostics {
  const parsed = parseRailsConfig();
  const reasons =
    spendRail === 'stellar_usdc'
      ? collectStellarOperationalReasons(parsed.stellar)
      : collectBaseOperationalReasons(parsed.base);
  const horizon = getOptionalStellarHorizonUrlForSpendEnv();
  if (spendRail === 'stellar_usdc' && !horizon.valid && horizon.reason) {
    reasons.push(horizon.reason);
  }
  return {
    operational: reasons.length === 0,
    unavailableReasons: reasons,
  };
}

export function isSpendRailOperational(spendRail: SpendRail): boolean {
  return getSpendRailOperationalDiagnostics(spendRail).operational;
}

/** Safe analytics payload when mutating spend work is blocked (no secrets). */
export type SpendRailMutationBlockAnalytics = {
  spend_rail: SpendRail;
  rail_operational: false;
  unavailable_reason_codes: string[];
};

export function spendRailMutationBlockAnalytics(
  spendRail: SpendRail
): SpendRailMutationBlockAnalytics {
  const diag = getSpendRailOperationalDiagnostics(spendRail);
  return {
    spend_rail: spendRail,
    rail_operational: false,
    unavailable_reason_codes: dedupeStrings(
      diag.unavailableReasons.map(mapSpendRailOperationalReasonToAdminCurated)
    ),
  };
}

const SPEND_RAIL_MUTATION_BLOCKED_USER_MESSAGE =
  'This payment network is temporarily unavailable. Please try again later.';

/**
 * Blocks user- or admin-initiated spend work that must not run when the rail is
 * disabled or misconfigured (sessions, conversion funding, new payment rows, etc.).
 * Read-only flows (e.g. confirmed receipts) use separate rules in eligibility builders.
 */
export function assertSpendRailAllowsMutatingSpendWork(
  spendRail: SpendRail
):
  | { ok: true }
  | { ok: false; error: string; analytics: SpendRailMutationBlockAnalytics } {
  const { operational } = getSpendRailOperationalDiagnostics(spendRail);
  if (operational) return { ok: true };
  return {
    ok: false,
    error: SPEND_RAIL_MUTATION_BLOCKED_USER_MESSAGE,
    analytics: spendRailMutationBlockAnalytics(spendRail),
  };
}

export function assertSpendRailAllowsNewSessions(
  spendRail: SpendRail
): { ok: true } | { ok: false; error: string } {
  const gate = assertSpendRailAllowsMutatingSpendWork(spendRail);
  if (gate.ok) return { ok: true };
  return { ok: false, error: gate.error };
}

/** Treasury funding via Privy server wallet + Base USDC exists only for `base_usdc` today. */
export function supportsSpendRailBasePrivyTreasuryFunding(
  spendRail: SpendRail
): boolean {
  return spendRail === 'base_usdc';
}

/** Stable ordering for admin catalog and pickers. */
export const SPEND_RAILS_CATALOG_ORDER: SpendRail[] = [
  'base_usdc',
  'stellar_usdc',
];

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

export function getSpendRailClientSummary(
  spendRail: SpendRail
): SpendRailClientSummary {
  const m = getSpendRailPublicMetadata(spendRail);
  return {
    rail: m.rail,
    displayName: m.displayName,
    networkLabel: m.networkLabel,
    assetSymbol: m.assetSymbol,
    explorerTxUrlTemplate: m.explorerTxUrlTemplate,
  };
}

export function getSpendRailCatalogEntry(
  spendRail: SpendRail
): SpendRailCatalogEntry {
  const summary = getSpendRailClientSummary(spendRail);
  const diag = getSpendRailOperationalDiagnostics(spendRail);
  const allowsNewSpendWork = diag.operational;
  const meta = getSpendRailPublicMetadata(spendRail);
  const adminUnavailableReasons = allowsNewSpendWork
    ? []
    : dedupeStrings(
        diag.unavailableReasons.map(mapSpendRailOperationalReasonToAdminCurated)
      );
  return {
    ...summary,
    allowsNewSpendWork,
    adminUnavailableReasons,
    receivingWalletAddress: meta.receivingWalletAddress,
  };
}

export function listSpendRailCatalog(): SpendRailCatalogEntry[] {
  return SPEND_RAILS_CATALOG_ORDER.map(getSpendRailCatalogEntry);
}

export function getSpendRailPublicMetadata(
  spendRail: SpendRail
): SpendRailPublicMetadata {
  const parsed = parseRailsConfig();
  if (spendRail === 'stellar_usdc') {
    const s = parsed.stellar;
    return {
      rail: 'stellar_usdc',
      displayName: 'Stellar USDC',
      networkLabel: 'Stellar',
      assetSymbol: 'USDC',
      enabled: s.enabled,
      receivingWalletAddress: s.receivingAddress,
      explorerTxUrlTemplate: s.explorerTxUrlTemplate,
    };
  }
  const b = parsed.base;
  return {
    rail: 'base_usdc',
    displayName: 'Base USDC',
    networkLabel: 'Base',
    assetSymbol: 'USDC',
    enabled: b.enabled,
    receivingWalletAddress: b.receivingAddress,
    explorerTxUrlTemplate: b.explorerTxUrlTemplate,
  };
}

export function spendLedgerNetworkLabel(spendRail: SpendRail): string {
  return getSpendRailPublicMetadata(spendRail).networkLabel;
}

/**
 * Builds an explorer URL from rail templates. EVM-shaped hashes always use the
 * Base USDC template (on-chain activity may be on Base even when the session rail is Stellar).
 */
export function formatExplorerTxUrlForSpendLedger(
  spendRail: SpendRail,
  txHash: string | null | undefined
): string | null {
  const raw = txHash?.trim();
  if (!raw || raw.toLowerCase().startsWith('pending:')) {
    return null;
  }

  const parsed = parseRailsConfig();
  const evmHash = /^0x[a-fA-F0-9]{64}$/.test(raw);
  if (evmHash) {
    const tpl = parsed.base.explorerTxUrlTemplate;
    return tpl.replace('{txHash}', raw.toLowerCase());
  }

  if (spendRail === 'stellar_usdc') {
    const tpl = parsed.stellar.explorerTxUrlTemplate;
    return tpl.replace('{txHash}', encodeURIComponent(raw));
  }

  return null;
}

export function getSpendTreasuryWalletAddress(spendRail: SpendRail): string {
  const parsed = parseRailsConfig();
  if (spendRail === 'stellar_usdc') {
    const s = parsed.stellar;
    return s.treasuryAddress?.trim() || s.receivingAddress?.trim() || '';
  }
  return parsed.base.treasuryAddress?.trim() ?? '';
}

export function getSpendReceivingWalletAddress(spendRail: SpendRail): string {
  const parsed = parseRailsConfig();
  if (spendRail === 'stellar_usdc') {
    return parsed.stellar.receivingAddress?.trim() ?? '';
  }
  return parsed.base.receivingAddress?.trim() ?? '';
}

export type SpendBaseTreasuryPrivyTransferConfig = {
  walletId: string;
  address: `0x${string}`;
};

export function getSpendBaseTreasuryPrivyTransferConfig(): SpendBaseTreasuryPrivyTransferConfig | null {
  const parsed = parseRailsConfig().base;
  if (!parsed.enabled) return null;
  const walletId = parsed.privyServerWalletId?.trim();
  const addr = parsed.treasuryAddress?.trim();
  if (!walletId || !addr || !isEvmAddress(addr)) return null;
  return { walletId, address: addr as `0x${string}` };
}

export function getSpendRailBaseRpcUrl(): string {
  return parseRailsConfig().base.rpcUrl;
}

export function getSpendRailBaseUsdcContractAddress(): `0x${string}` {
  const raw = parseRailsConfig().base.usdcContract.trim();
  return raw as `0x${string}`;
}
