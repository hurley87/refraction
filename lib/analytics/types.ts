/**
 * Analytics event types and interfaces
 */

import type { SpendRail } from '@/lib/types';
import type {
  SpendRailAnalyticsCode,
  SpendRailErrorCategory,
} from '@/lib/spend/payment-rails/errors';

/** Shared optional rail + error metadata for spend pilot Mixpanel payloads (IRL-23). */
export type SpendPilotRailMixpanelFields = {
  spend_rail: SpendRail;
  network: string;
  asset: string;
};

export type SpendPilotSanitizedErrorFields = {
  sanitized_error_category: SpendRailErrorCategory;
  sanitized_error_code: SpendRailAnalyticsCode;
};

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
}

export interface UserProperties {
  $email?: string;
  $name?: string;
  wallet_type?: 'EVM' | 'Solana' | 'Stellar' | 'Aptos';
  tier?: string;
  total_points?: number;
  first_action_at?: string;
  cohort?: 'new' | 'returning' | 'power';
  wallet_address?: string;
  solana_wallet_address?: string;
  stellar_wallet_address?: string;
  aptos_wallet_address?: string;
  privy_user_id?: string;
}

export interface CheckinEventProperties {
  location_id: number;
  city?: string;
  venue?: string;
  points: number;
  checkpoint?: string;
  checkpoint_id?: string;
  checkin_type: 'location' | 'checkpoint';
  chain?: 'evm' | 'solana' | 'stellar' | 'aptos';
}

export interface RewardEventProperties {
  reward_id: string;
  reward_type?: string;
  partner?: string;
  points_required?: number;
}

export interface LocationCreatedProperties {
  location_id: number;
  city?: string;
  country?: string;
  place_id: string;
  type?: string;
  creator_wallet_address?: string;
}

export interface PointsEarnedProperties {
  activity_type: string;
  amount: number;
  cohort?: 'new' | 'returning' | 'power';
  description?: string;
  chain?: 'evm' | 'solana' | 'stellar' | 'aptos';
  checkpoint_id?: string;
}

export interface TierChangedProperties {
  old_tier?: string;
  new_tier: string;
  direction: 'up' | 'down' | 'same';
  total_points: number;
}

export interface TierProgressionProperties {
  previous_tier: string;
  new_tier: string;
  total_points: number;
}

export interface AccountCreatedProperties {
  wallet_type: 'EVM' | 'Solana' | 'Stellar' | 'Aptos';
  has_email: boolean;
  wallet_address: string;

  /** Normalized first-touch signup attribution */
  signup_source?: string;
  signup_channel?: string;
  signup_context?: string;

  /** Raw first-touch */
  initial_utm_source?: string;
  initial_utm_medium?: string;
  initial_utm_campaign?: string;
  initial_utm_term?: string;
  initial_utm_content?: string;
  initial_referrer?: string;
  initial_landing_page?: string;

  /** Raw current / last-touch */
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
  landing_page?: string;
  current_path?: string;

  checkpoint_id?: string;
  event_id?: string;
  location_id?: string;
}

export interface SpendRedemptionStartedProperties {
  spend_item_id: string;
  spend_item_name: string;
  points_committed: number;
  redemption_id: string;
  checkpoint_id?: string | null;
  flow: 'pending_create';
  spend_source?: string;
  transaction_context?: string;
  event_id?: string | null;
  location_id?: string | null;
}

export interface SpendRedemptionCompletedProperties {
  spend_item_id: string;
  spend_item_name: string;
  points_spent: number;
  redemption_id: string;
  checkpoint_id?: string | null;
  flow: 'checkpoint_instant' | 'pending_verify' | 'admin_fulfill';
  verified_by: 'user' | 'admin';
  spend_source?: string;
  transaction_context?: string;
  event_id?: string | null;
  location_id?: string | null;
}

export interface CityMilestoneProperties {
  city: string;
  spot_count: number;
  milestone: number;
}

/** Spend pilot: session / QR analytics */
export interface SpendPilotSessionEventProperties {
  spend_experience_id: string;
  event_id?: string | null;
  user_id: string;
  wallet_address: string;
  spend_session_id?: string;
  /** True when the session row was newly inserted (not idempotent return). */
  created?: boolean;
  spend_rail?: SpendRail;
  network?: string;
  asset?: string;
}

/** Spend pilot: conversion preview / eligibility analytics */
export interface SpendPilotConversionEventProperties {
  spend_experience_id: string;
  event_id?: string | null;
  user_id: string;
  wallet_address: string;
  points_amount: number;
  usdc_amount: number;
  status: string;
  error_reason?: string;
  /** Point conversion row */
  point_conversion_id?: string;
  spend_session_id?: string;
  /** On-chain USDC funding tx */
  funding_tx_hash?: string | null;
  spend_rail?: SpendRail;
  network?: string;
  asset?: string;
  sanitized_error_category?: SpendRailErrorCategory;
  sanitized_error_code?: SpendRailAnalyticsCode;
  wallet_readiness_operation_id?: string;
  sponsor_treasury_transaction_id?: string | null;
  trustline_treasury_transaction_id?: string | null;
}

/** Spend pilot: user payment to receiving wallet (PRD §13). */
export interface SpendPilotPaymentEventProperties {
  spend_experience_id: string;
  event_id?: string | null;
  user_id: string;
  wallet_address: string;
  points_amount: number;
  usdc_amount: number;
  status: string;
  error_reason?: string;
  spend_session_id?: string;
  point_conversion_id?: string;
  spend_transaction_id?: string;
  payment_tx_hash?: string | null;
  spend_rail?: SpendRail;
  network?: string;
  asset?: string;
  sanitized_error_category?: SpendRailErrorCategory;
  sanitized_error_code?: SpendRailAnalyticsCode;
  /** `spend_payment_prepare_operations.id` when a prepare row exists for the session. */
  spend_payment_prepare_operation_id?: string;
}

/** Server-only: mutating spend blocked because the session rail is not operational. */
export interface SpendPilotRailMutationBlockedProperties {
  mutation:
    | 'spend_session_create'
    | 'conversion_confirm'
    | 'conversion_resume'
    | 'payment_confirm_new_tx'
    | 'payment_confirm'
    | 'payment_prepare'
    | 'admin_spend_experience_create'
    | 'admin_spend_experience_update'
    | 'admin_treasury_withdraw';
  spend_rail: SpendRail;
  rail_operational: false;
  /** Curated, non-secret reason labels (see spend-rail-config admin mapping). */
  unavailable_reason_codes: string[];
  spend_experience_id?: string;
  spend_session_id?: string;
  event_id?: string | null;
  user_id?: string;
  wallet_address?: string;
  point_conversion_id?: string;
  admin_actor?: string | null;
  network?: string;
  asset?: string;
}

/** Spend pilot wallet readiness funnel (IRL-23). */
export interface SpendPilotWalletReadinessEventProperties {
  spend_experience_id?: string;
  event_id?: string | null;
  user_id?: string;
  wallet_address?: string;
  spend_session_id: string;
  point_conversion_id?: string;
  spend_rail: SpendRail;
  network: string;
  asset: string;
  /**
   * Base USDC: synchronous validation-only gate (no `spend_wallet_readiness_operations` row).
   * Stellar USDC: persisted readiness row id when available.
   */
  wallet_readiness_operation_id?: string;
  sponsor_treasury_transaction_id?: string | null;
  trustline_treasury_transaction_id?: string | null;
  /** Base: `base_validation_sync`. Stellar: `stellar_async_orchestration`. */
  wallet_readiness_mode: 'base_validation_sync' | 'stellar_async_orchestration';
  sanitized_error_category?: SpendRailErrorCategory;
  sanitized_error_code?: SpendRailAnalyticsCode;
  /** True when Stellar readiness was already `completed` in the database (no new orchestration). */
  resumed_from_completed_row?: boolean;
}
