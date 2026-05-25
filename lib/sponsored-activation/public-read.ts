import type { SponsoredActivationStatus } from '@/lib/db/sponsored-activations';

/** Public GET `/api/sponsored-activations/[activationIdOrSlug]` — safe for unauthenticated clients. */
export type SponsoredActivationPublicReadResponse = {
  activation: {
    title: string;
    sponsor_name: string;
    slug: string;
    status: SponsoredActivationStatus;
    window: { starts_at: string; ends_at: string };
  };
  rewardItem: {
    id: string;
    name: string;
    hero_image_url: string | null;
    description: string | null;
    points_cost: number;
  };
};
