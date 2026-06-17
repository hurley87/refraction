export type MapCheckinAvatarEntry = {
  id: number;
  username?: string | null;
  walletAddress?: string | null;
  profilePictureUrl?: string | null;
};

export function getCheckinDisplayName(entry: MapCheckinAvatarEntry): string {
  if (entry.username && entry.username.trim().length > 0) {
    return entry.username;
  }
  if (entry.walletAddress && entry.walletAddress.length > 8) {
    return `${entry.walletAddress.slice(0, 6)}...${entry.walletAddress.slice(-4)}`;
  }
  return 'Explorer';
}

export function getCheckinInitial(entry: MapCheckinAvatarEntry): string {
  if (entry.username && entry.username.trim().length > 0) {
    return entry.username.trim().charAt(0).toUpperCase();
  }
  if (entry.walletAddress && entry.walletAddress.length > 2) {
    return entry.walletAddress.slice(2, 3).toUpperCase();
  }
  return '+';
}
