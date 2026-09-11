/**
 * Avatar URL derived from a Twitter/X handle via unavatar.io.
 * Used as a fallback when a player has no `profile_picture_url`.
 */
export function twitterAvatarUrl(
  twitterHandle: string | null | undefined
): string {
  const handle = twitterHandle?.trim().replace(/^@/, '') ?? '';
  if (!handle) return '';
  return `https://unavatar.io/twitter/${encodeURIComponent(handle)}`;
}
