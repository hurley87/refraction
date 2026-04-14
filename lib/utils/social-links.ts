export type SocialPlatform = 'twitter' | 'farcaster' | 'telegram' | 'towns';

export function getSocialUrl(
  platform: SocialPlatform,
  handle: string
): string | null {
  if (!handle?.trim()) return null;
  const handleClean = handle.replace(/^@/, '');
  switch (platform) {
    case 'twitter':
      return `https://twitter.com/${handleClean}`;
    case 'farcaster':
      return `https://warpcast.com/${handleClean}`;
    case 'telegram':
      return `https://t.me/${handleClean}`;
    case 'towns':
      return `https://towns.com/${handleClean}`;
    default:
      return null;
  }
}
