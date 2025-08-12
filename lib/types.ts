// Shared types safe for both client and server. Do NOT import server clients here.

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
};

export type PerkDiscountCode = {
  id?: string;
  perk_id: string;
  code: string;
  is_claimed?: boolean;
  claimed_by_wallet_address?: string;
  claimed_at?: string;
  created_at?: string;
};

export type UserPerkRedemption = {
  id?: string;
  perk_id: string;
  discount_code_id: string;
  user_wallet_address: string;
  redeemed_at?: string;
  perk_discount_codes?: { code: string };
};

export type Player = {
  id?: number;
  wallet_address: string;
  email?: string;
  username?: string;
  total_points: number;
  created_at?: string;
  updated_at?: string;
};
