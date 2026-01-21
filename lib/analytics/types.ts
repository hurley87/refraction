/**
 * Analytics event types and interfaces
 */

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
}

export interface UserProperties {
  $email?: string;
  $name?: string;
  wallet_type?: 'EVM' | 'Solana' | 'Stellar';
  tier?: string;
  total_points?: number;
  first_action_at?: string;
  cohort?: 'new' | 'returning' | 'power';
  wallet_address?: string;
  solana_wallet_address?: string;
  stellar_wallet_address?: string;
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
  chain?: 'evm' | 'solana' | 'stellar';
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
  chain?: 'evm' | 'solana' | 'stellar';
  checkpoint_id?: string;
}

export interface TierChangedProperties {
  old_tier?: string;
  new_tier: string;
  direction: 'up' | 'down' | 'same';
  total_points: number;
}

export interface AccountCreatedProperties {
  wallet_type: 'EVM' | 'Solana' | 'Stellar';
  has_email: boolean;
  wallet_address: string;
}
