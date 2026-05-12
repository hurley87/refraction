import type { SpendRail } from '@/lib/types';

export type SpendRailPublicMetadata = {
  rail: SpendRail;
  /** Human-readable rail label for UI. */
  displayName: string;
  /** Short network label stored on ledger rows (e.g. Base, Stellar). */
  networkLabel: string;
  assetSymbol: string;
  /** Kill switch: when false, new sessions and new money movement are blocked. */
  enabled: boolean;
  /**
   * Global receiving/settlement destination for this rail (safe to expose publicly).
   * EVM 0x-hex for Base; `G…` strkey for Stellar.
   */
  receivingWalletAddress: string | null;
  /**
   * Template for explorer links; replace `{txHash}` with the normalized hash
   * (lowercase for EVM; URI-encoded for Stellar non-EVM hashes).
   */
  explorerTxUrlTemplate: string | null;
};

export type SpendRailOperationalDiagnostics = {
  operational: boolean;
  /** Non-empty when operational is false; safe for server logs/tests only. */
  unavailableReasons: string[];
};

/** Client-safe rail labels for spend flows (no secrets). */
export type SpendRailClientSummary = {
  rail: SpendRail;
  displayName: string;
  networkLabel: string;
  assetSymbol: string;
  explorerTxUrlTemplate: string | null;
};

/** Admin rail catalog row: public metadata plus operational flags and curated reasons. */
export type SpendRailCatalogEntry = SpendRailClientSummary & {
  /** True when the rail passes operational diagnostics (new sessions allowed if policy permits). */
  allowsNewSpendWork: boolean;
  /** Curated, non-secret reasons when `allowsNewSpendWork` is false. */
  adminUnavailableReasons: string[];
  receivingWalletAddress: string | null;
};
