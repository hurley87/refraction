import type { LocationCategory } from '@/lib/types';

export interface MarkerData {
  latitude: number;
  longitude: number;
  place_id: string;
  name: string;
  address?: string | null;
  description?: string | null;
  creator_wallet_address?: string | null;
  creator_username?: string | null;
  imageUrl?: string | null;
  imageThumbUrl?: string | null;
  category?: LocationCategory | null;
  event_url?: string | null;
  points_value?: number | null;
}

export interface LocationCheckinPreview {
  id: number;
  comment: string;
  imageUrl?: string | null;
  pointsEarned: number;
  createdAt?: string | null;
  username?: string | null;
  walletAddress?: string | null;
  profilePictureUrl?: string | null;
}

export interface LocationFormData {
  name: string;
  address: string;
  description: string;
  /** `categories.id` persisted as `locations.category_id`. */
  categoryId: string;
  locationImage: File | null;
  checkInComment: string;
}

export type CategoryOption = {
  id: string;
  name: string;
  slug: string;
};

export type FormStep = 'business-details' | 'success';
