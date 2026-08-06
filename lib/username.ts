import { z } from 'zod';

/**
 * Top-level App Router segments and redirect aliases that must not be
 * claimable as public profile usernames (`irl.energy/{username}`).
 */
export const RESERVED_USERNAMES = new Set(
  [
    // Top-level app/ route segments
    'activation',
    'admin',
    'api',
    'c',
    'challenges',
    'checkpoints',
    'city-guides',
    'claim',
    'contact-us',
    'dashboard',
    'events',
    'faq',
    'interactive-map',
    'leaderboard',
    'livepaper',
    'membership',
    'onboarding',
    'partners',
    'perks',
    'profiles',
    'rewards',
    'spend',
    'stellar',
    'stripecommons',
    'tour',
    'venue-network',
    'walletconnect',
    // next.config redirects / aliases
    'map',
    'editorial',
    'write-a-guide',
    // Non-page roots
    '_next',
    'favicon.ico',
    'icon.svg',
  ].map((s) => s.toLowerCase())
);

/**
 * Trim, collapse whitespace runs to `_`, and lowercase.
 * e.g. "Mr Frog" → "mr_frog"
 */
export function normalizeUsername(input: string): string {
  return input.trim().replace(/\s+/g, '_').toLowerCase();
}

/** Live input helper: replace spaces with underscores as the user types. */
export function sanitizeUsernameInput(input: string): string {
  return input.replace(/\s+/g, '_');
}

export function isReservedUsername(slug: string): boolean {
  const key = normalizeUsername(slug);
  return key.length > 0 && RESERVED_USERNAMES.has(key);
}

/**
 * Public profile username: 3–30 chars, lowercase alphanumeric + underscore,
 * not a reserved system route. Spaces are converted to underscores.
 */
export const usernameSchema = z
  .string()
  .transform((s) => normalizeUsername(s))
  .pipe(
    z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username must be at most 30 characters')
      .regex(
        /^[a-z0-9_]+$/,
        'Username may only contain letters, numbers, and underscores'
      )
      .refine((s) => !isReservedUsername(s), {
        message: 'That username is reserved',
      })
  );

/**
 * Canonical public profile path: `/{username}` when set, else wallet profile.
 */
export function profilePathForPlayer(player: {
  username?: string | null;
  wallet_address: string;
}): string {
  const username = player.username?.trim();
  if (username) {
    return `/${normalizeUsername(username)}`;
  }
  return `/profiles/${player.wallet_address}`;
}
