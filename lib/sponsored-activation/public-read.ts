import type {
  SettlementRail,
  SponsoredActivationStatus,
} from '@/lib/db/sponsored-activations';

/** Public GET `/api/sponsored-activations/[activationIdOrSlug]` — safe for unauthenticated clients. */
export type SponsoredActivationPublicReadResponse = {
  activation: {
    id: string;
    title: string;
    sponsor_name: string;
    slug: string;
    status: SponsoredActivationStatus;
    settlement_rail: SettlementRail;
    window: { starts_at: string; ends_at: string };
  };
  rewardItem: {
    id: string;
    name: string;
    hero_image_url: string | null;
    description: string | null;
    points_cost: number;
    /** Retail-style USD value for UI (from reward `usdc_amount`, not onchain copy). */
    perk_value_usd: number;
    perk_value_label: string;
  };
};
