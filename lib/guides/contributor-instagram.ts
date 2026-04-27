const INSTAGRAM_PATH_RESERVED = new Set([
  'p',
  'reel',
  'reels',
  'stories',
  'explore',
  'accounts',
  'direct',
  'tv',
]);

/**
 * Normalizes contributor Instagram input for storage: prefers `@handle` over full profile URLs.
 * Legacy full URLs are reduced to `@username` when the path is a simple profile segment.
 */
export function normalizeContributorInstagramForDb(
  raw: string | null | undefined
): string | null {
  const t = raw?.trim() ?? '';
  if (!t) return null;

  if (/^https?:\/\//i.test(t)) {
    try {
      const u = new URL(t);
      const host = u.hostname.replace(/^www\./i, '').toLowerCase();
      if (!host.endsWith('instagram.com')) return t;

      const segments = u.pathname.split('/').filter(Boolean);
      if (segments.length === 0) return t;

      const first = segments[0];
      if (!first || INSTAGRAM_PATH_RESERVED.has(first.toLowerCase())) return t;

      const user = first.replace(/^@+/, '');
      if (!user) return t;
      return `@${user}`;
    } catch {
      return t;
    }
  }

  const handle = t.replace(/^@+/, '').trim();
  if (!handle) return null;
  return `@${handle}`;
}

/** Builds a profile URL for `<a href>` from stored `@handle` or legacy full URL. */
export function resolveContributorInstagramProfileUrl(
  stored: string | null | undefined
): string {
  const t = stored?.trim() ?? '';
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) return t;

  const handle = t.replace(/^@+/, '').split('/')[0]?.trim() ?? '';
  if (!handle) return '';
  return `https://www.instagram.com/${handle}/`;
}
