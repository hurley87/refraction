// Shared types safe for both client and server. Do NOT import server clients here.

/**
 * User account with multi-chain wallet support (EVM, Solana, Stellar, Aptos)
 */
export type Player = {
  id?: number;
  wallet_address: string;
  solana_wallet_address?: string;
  stellar_wallet_address?: string;
  stellar_wallet_id?: string;
  aptos_wallet_address?: string;
  aptos_wallet_id?: string;
  email?: string;
  username?: string;
  total_points: number;
  created_at?: string;
  updated_at?: string;
};

/**
 * Check-in location with coordinates and coin data
 */
export type Location = {
  id?: number;
  name: string;
  address?: string | null;
  description?: string | null;
  latitude: number;
  longitude: number;
  place_id: string;
  points_value: number;
  type?: string;
  event_url?: string | null;
  context?: string;
  city?: string | null;
  coin_address?: string;
  coin_symbol?: string;
  coin_name?: string;
  coin_image_url?: string | null;
  coin_transaction_hash?: string;
  creator_wallet_address?: string;
  creator_username?: string;
  is_visible?: boolean;
  created_at?: string;
};

/**
 * Record of user check-in at a location
 */
export type PlayerLocationCheckin = {
  id?: number;
  player_id: number;
  location_id: number;
  points_earned: number;
  checkin_at?: string;
  created_at?: string;
  comment?: string | null;
  image_url?: string | null;
};

/**
 * Aggregated player stats for ranking
 */
export type LeaderboardEntry = {
  player_id: number;
  wallet_address: string;
  username?: string;
  email?: string;
  total_points: number;
  total_checkins: number;
  rank: number;
};

/**
 * Curated collection of locations
 */
export type LocationList = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  accent_color?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * Location list with location count
 */
export type LocationListWithCount = LocationList & {
  location_count: number;
};

/**
 * Location membership in a location list
 */
export type LocationListLocation = {
  membership_id: number;
  list_id: string;
  location_id: number;
  created_at: string;
  location: Location;
};

/**
 * Simplified location option for dropdowns/search
 */
export type LocationOption = Pick<
  Location,
  'id' | 'name' | 'latitude' | 'longitude' | 'place_id'
>;

/**
 * Redeemable reward with points threshold
 */
export type Perk = {
  id?: string;
  title: string;
  description: string;
  location?: string;
  points_threshold: number;
  website_url?: string;
  type: string;
  end_date?: string;
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
  is_unlisted?: boolean;
  thumbnail_url?: string;
  hero_image?: string;
};

/**
 * Discount codes associated with perks
 */
export type PerkDiscountCode = {
  id?: string;
  perk_id: string;
  code: string;
  is_claimed?: boolean;
  claimed_by_wallet_address?: string;
  claimed_at?: string;
  created_at?: string;
  is_universal?: boolean;
};

/**
 * Record of perk redemption by user
 */
export type UserPerkRedemption = {
  id?: string;
  perk_id: string;
  discount_code_id: string;
  user_wallet_address: string;
  redeemed_at?: string;
  perk_discount_codes?: { code: string };
};

/**
 * Points-based membership tier
 */
export type Tier = {
  id: string;
  title: string;
  min_points: number;
  max_points: number | null;
  description: string;
  created_at: string;
  updated_at: string;
};

/**
 * Extended profile with social handles
 */
export type UserProfile = {
  id?: string;
  wallet_address: string;
  email?: string;
  name?: string;
  username?: string;
  website?: string;
  twitter_handle?: string;
  towns_handle?: string;
  farcaster_handle?: string;
  telegram_handle?: string;
  instagram_handle?: string;
  profile_picture_url?: string;
  /** Display city (free text) */
  city?: string | null;
  /** Display country (free text) */
  country?: string | null;
  /** Short user-written bio */
  bio?: string | null;
  created_at?: string;
  updated_at?: string;
};

/**
 * Item that users can spend points on (points are deducted)
 */
export type SpendItem = {
  id?: string;
  checkpoint_id?: string | null;
  name: string;
  description?: string | null;
  image_url?: string | null;
  points_cost: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

/**
 * Record of a user spending points on an item.
 * Pending: is_fulfilled false, points not deducted until user verifies.
 * Verified: is_fulfilled true, points deducted at verification time.
 */
export type SpendRedemption = {
  id?: string;
  spend_item_id: string;
  user_wallet_address: string;
  points_spent: number;
  is_fulfilled: boolean;
  created_at?: string;
  fulfilled_at?: string | null;
  verified_by?: string | null;
  spend_items?: SpendItem;
};

// Legacy types for number assignment system
export type NumberAssignment = {
  id: number;
  user_address: string;
  assigned_number: number;
  created_at: string;
};

export type Notification = {
  id: number;
  user_address: string;
  created_at: string;
};

/**
 * Unified checkpoint for /c/[id] URLs
 * Supports multiple chain types (EVM, Solana, Stellar, Aptos)
 */
export type ChainType = 'evm' | 'solana' | 'stellar' | 'aptos';
export type CheckpointMode = 'checkin' | 'spend';

export type Checkpoint = {
  id: string;
  name: string;
  description?: string | null;
  login_cta_text?: string | null;
  chain_type: ChainType;
  checkpoint_mode: CheckpointMode;
  points_value: number;
  is_active: boolean;
  created_by?: string | null;
  partner_image_url?: string | null;
  background_gradient?: string | null;
  font_family?: string | null;
  font_color?: string | null;
  footer_title?: string | null;
  footer_description?: string | null;
  cta_text?: string | null;
  cta_url?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type SpendExperienceStatus = 'draft' | 'active' | 'ended';

/** Canonical spend / settlement rail for a spend experience (immutable after insert). */
export type SpendRail = 'base_usdc' | 'stellar_usdc';

/**
 * Admin-configured spend pilot experience (points → USDC conversion window).
 */
export type SpendExperience = {
  id: string;
  title: string;
  description: string | null;
  event_id: string | null;
  status: SpendExperienceStatus;
  spend_rail: SpendRail;
  points_to_usdc_rate: number;
  max_usdc_per_user: number;
  treasury_wallet_address: string;
  receiving_wallet_address: string;
  privy_server_wallet_id: string | null;
  server_wallet_address: string | null;
  server_wallet_chain: string | null;
  server_wallet_created_at: string | null;
  spend_create_idempotency_key: string | null;
  start_time: string;
  end_time: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type SpendSessionStatus =
  | 'created'
  | 'conversion_pending'
  | 'conversion_complete'
  | 'payment_pending'
  | 'payment_complete'
  | 'failed'
  | 'expired';

/**
 * Per-user session for a spend experience (created on QR scan / open).
 */
export type SpendSession = {
  id: string;
  spend_experience_id: string;
  user_id: string;
  wallet_address: string;
  /** Copied from the parent experience at session creation. Immutable in DB. */
  spend_rail: SpendRail;
  /**
   * Rail-specific user wallet: required non-NULL EVM for `base_usdc`.
   * For `stellar_usdc`, NULL until conversion confirm wallet readiness sets the
   * Privy-managed Stellar G-address (never the signed-in EVM wallet as a placeholder).
   */
  rail_user_wallet_address: string | null;
  status: SpendSessionStatus;
  qr_token_hash: string | null;
  created_at: string;
  expires_at: string;
  completed_at: string | null;
};

export type PointConversionStatus =
  | 'pending'
  | 'points_deducted'
  | 'funding_pending'
  /** Ambiguous funding outcome (submitted / pending confirmation); no automatic refund (IRL-20). */
  | 'needs_review'
  | 'funded'
  | 'failed';

/** Persisted on `point_conversions.conversion_last_failure` after a safe refund (IRL-17). */
export type PointConversionLastFailure = {
  recorded_at: string;
  phase: 'readiness' | 'funding' | 'resume';
  category: string;
  reason_snippet: string;
  internal_diagnostics?: Record<string, unknown>;
};

export type PointConversion = {
  id: string;
  spend_experience_id: string;
  spend_session_id: string;
  user_id: string;
  points_deducted: number;
  usdc_amount: number;
  status: PointConversionStatus;
  /** Rail snapshotted at conversion insert. Immutable in DB. */
  spend_rail: SpendRail;
  /** Chain/network label at insert. Immutable in DB. */
  network: string;
  /** Asset at insert (e.g. USDC). Immutable in DB. */
  asset_symbol: string;
  treasury_wallet_address: string;
  user_wallet_address: string;
  funding_tx_hash: string | null;
  /** Canonical explorer URL when known; set-once in DB. */
  explorer_tx_url: string | null;
  idempotency_key: string | null;
  /** Point-deduction attempts for this row (1 on first confirm; incremented on each explicit retry). */
  conversion_attempt_count: number;
  /** Last refunded failure metadata for support (IRL-17). */
  conversion_last_failure: PointConversionLastFailure | null;
  created_at: string;
  completed_at: string | null;
  failed_reason: string | null;
  updated_at: string;
};

export type SpendTransactionStatus =
  | 'pending'
  | 'submitted'
  | 'confirmed'
  | 'failed';

export type SpendTransaction = {
  id: string;
  spend_experience_id: string;
  spend_session_id: string;
  user_id: string;
  usdc_amount: number;
  /** Rail snapshotted at payment row insert. Immutable in DB. */
  spend_rail: SpendRail;
  network: string;
  asset_symbol: string;
  from_wallet_address: string;
  to_wallet_address: string;
  status: SpendTransactionStatus;
  payment_tx_hash: string | null;
  /** Canonical explorer URL when known; set-once in DB. */
  explorer_tx_url: string | null;
  idempotency_key: string | null;
  created_at: string;
  completed_at: string | null;
  failed_reason: string | null;
  updated_at: string;
};

export type TreasuryTransactionType =
  | 'fund_user'
  | 'receive_payment'
  | 'admin_recovery'
  | 'stellar_account_activation'
  | 'stellar_usdc_trustline_setup';

export type TreasuryTransactionRowStatus =
  | 'pending'
  | 'submitted'
  | 'confirmed'
  | 'failed';

export type TreasuryTransaction = {
  id: string;
  spend_experience_id: string | null;
  transaction_type: TreasuryTransactionType;
  amount: number;
  spend_rail: SpendRail;
  network: string;
  asset_symbol: string;
  from_wallet_address: string | null;
  to_wallet_address: string | null;
  tx_hash: string | null;
  explorer_tx_url: string | null;
  status: TreasuryTransactionRowStatus;
  created_at: string;
  updated_at: string;
};

/** Wallet readiness lifecycle for rail setup (e.g. Stellar account + trustline). */
export type SpendWalletReadinessStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'needs_review';

/**
 * Idempotent per-session wallet readiness operation (v1 idempotency key
 * `wallet_readiness:{spend_session_id}`).
 */
export type SpendWalletReadinessOperation = {
  id: string;
  spend_session_id: string;
  user_id: string;
  spend_rail: SpendRail;
  /** Resolved G-address when known; NULL while Stellar readiness is still pending. */
  rail_user_wallet_address: string | null;
  status: SpendWalletReadinessStatus;
  step_metadata: Record<string, unknown>;
  sanitized_error_category: string | null;
  sanitized_error_code: string | null;
  internal_diagnostics: Record<string, unknown> | null;
  idempotency_key: string;
  sponsor_treasury_transaction_id: string | null;
  trustline_treasury_transaction_id: string | null;
  created_at: string;
  updated_at: string;
};

/** Client-safe wallet readiness snapshot (conversion confirm / Stellar); excludes server diagnostics. */
export type SpendWalletReadinessClientDto = {
  id: string;
  status: SpendWalletReadinessStatus;
  rail_user_wallet_address: string | null;
  sanitized_error_category: string | null;
  sanitized_error_code: string | null;
  /** From persisted `step_metadata.current_step` when it is a non-empty string. */
  current_step: string | null;
  sponsor_treasury_transaction_id: string | null;
  trustline_treasury_transaction_id: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * `spend_payment_prepare_operations.status` — aligned with `SpendRailPaymentOperationStatus`
 * (IRL-28).
 */
export type SpendPaymentPrepareOperationStatus =
  | 'prepared'
  | 'submitted'
  | 'confirmed'
  | 'failed'
  | 'needs_review';

/**
 * Server-prepared payment action row (IRL-19 / IRL-28). `prepared_action` / `verification_snapshot`
 * are rail-specific JSON; Base USDC uses `SpendPaymentPrepareStoredActionV1` + snapshot types in
 * `lib/spend-payment-prepare-types.ts`.
 */
export type SpendPaymentPrepareOperation = {
  id: string;
  spend_session_id: string;
  user_id: string;
  spend_rail: SpendRail;
  status: SpendPaymentPrepareOperationStatus;
  prepared_action: Record<string, unknown>;
  verification_snapshot: Record<string, unknown>;
  idempotency_key: string;
  attempt_count: number;
  last_failure_reason: string | null;
  last_failure_at: string | null;
  last_ambiguity_metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

/** Client-safe subset for Pay / retry / needs_review gating (IRL-28). */
export type SpendPaymentOperationClientSummary = {
  id: string;
  status: SpendPaymentPrepareOperationStatus;
  attempt_count: number;
  last_failure_reason: string | null;
  last_failure_at: string | null;
};
