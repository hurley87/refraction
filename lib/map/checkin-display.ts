import type { LocationCheckinPreview } from '@/components/map/interactive-map-types';

export function getCheckinDisplayName(entry: LocationCheckinPreview) {
  if (entry.username && entry.username.trim().length > 0) {
    return entry.username;
  }
  if (entry.walletAddress && entry.walletAddress.length > 8) {
    return `${entry.walletAddress.slice(0, 6)}...${entry.walletAddress.slice(-4)}`;
  }
  return 'Explorer';
}

export function getCheckinInitial(entry: LocationCheckinPreview) {
  if (entry.username && entry.username.trim().length > 0) {
    return entry.username.trim().charAt(0).toUpperCase();
  }
  if (entry.walletAddress && entry.walletAddress.length > 2) {
    return entry.walletAddress.slice(2, 3).toUpperCase();
  }
  return '+';
}

/** Shareable map deep link using the location display name (not place_id). */
export function buildLocationShareUrl(locationName: string) {
  const params = new URLSearchParams();
  params.set('name', locationName.trim());
  return `${window.location.origin}/interactive-map?${params.toString()}`;
}
