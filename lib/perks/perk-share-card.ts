import type { Perk } from '@/lib/types';

/** Perks tagged with this city apply everywhere, so it reads as no venue. */
const GLOBAL_CITY = 'Global';

/** Path of the branded share image for a perk. */
export function perkShareImagePath(perkId: string): string {
  return `/api/og/reward/${encodeURIComponent(perkId)}`;
}

/** Canonical share path: /rewards opens the perk's drawer from `perkId`. */
export function perkSharePath(perkId: string): string {
  return `/rewards?perkId=${encodeURIComponent(perkId)}`;
}

/**
 * Only rewards a visitor can actually see on /rewards get their own preview.
 * Unlisted, inactive, and expired perks fall back to the site-wide card, since
 * the catalog will not open a drawer for them.
 */
export function isPerkShareable(perk: Perk, now: Date = new Date()): boolean {
  if (perk.is_active === false) return false;
  if (perk.is_unlisted) return false;
  if (!perk.end_date) return true;

  const endsAt = new Date(perk.end_date);
  if (Number.isNaN(endsAt.getTime())) return true;
  return endsAt.getTime() >= now.getTime();
}

export function perkShareTitle(perk: Perk): string {
  const title = perk.title?.trim();
  return title ? `${title} on IRL` : 'Rewards on IRL';
}

/** Unfurlers truncate past roughly this length, so cut on a word instead. */
const MAX_SHARE_DESCRIPTION_LENGTH = 200;

/**
 * First sentence of the reward copy, matching what /rewards shows on the card.
 */
export function perkShareDescription(perk: Perk): string {
  const description = perk.description?.trim();
  if (!description) {
    return 'A member reward from the IRL Venue Network.';
  }

  const [firstSentence] = description.split(/(?<=[.!?])\s/);
  const sentence = (firstSentence || description).trim();
  if (sentence.length <= MAX_SHARE_DESCRIPTION_LENGTH) return sentence;

  const clipped = sentence.slice(0, MAX_SHARE_DESCRIPTION_LENGTH);
  const lastSpace = clipped.lastIndexOf(' ');
  return `${(lastSpace > 0 ? clipped.slice(0, lastSpace) : clipped).replace(/[,;:]$/, '')}…`;
}

export function perkShareVenueLabel(perk: Perk): string {
  const location = perk.location?.trim();
  if (!location || location === GLOBAL_CITY) return '';
  return location;
}

export function perkSharePointsLabel(perk: Perk): string {
  const points = Number(perk.points_threshold) || 0;
  if (points <= 0) return 'Free for members';
  return `${points.toLocaleString('en-US')} points`;
}

export type PerkShareCard = {
  title: string;
  venueLabel: string;
  pointsLabel: string;
  photoUrl: string | null;
};

export function buildPerkShareCard(perk: Perk): PerkShareCard {
  return {
    title: perk.title?.trim() || 'IRL reward',
    venueLabel: perkShareVenueLabel(perk),
    pointsLabel: perkSharePointsLabel(perk),
    photoUrl: perk.hero_image?.trim() || perk.thumbnail_url?.trim() || null,
  };
}
