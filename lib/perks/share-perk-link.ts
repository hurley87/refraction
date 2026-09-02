import { buildPerkMemberShareUrl } from './member-share-url';

/** How a perk link reached the recipient, for analytics and UI feedback. */
export type PerkShareMethod = 'web_share' | 'clipboard';

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name: string }).name === 'AbortError'
  );
}

/**
 * Shares a perk's /rewards link through the native share sheet, falling back
 * to the clipboard. Returns how it was shared, or null when the reader
 * dismissed the sheet or the browser allowed neither path (the clipboard needs
 * a secure context).
 */
export async function sharePerkLink(input: {
  title: string;
  perkId?: string;
}): Promise<PerkShareMethod | null> {
  if (typeof navigator === 'undefined') return null;

  const url = buildPerkMemberShareUrl(input);

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: input.title, url });
      return 'web_share';
    } catch (error) {
      if (isAbortError(error)) return null;
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    return 'clipboard';
  } catch {
    return null;
  }
}
