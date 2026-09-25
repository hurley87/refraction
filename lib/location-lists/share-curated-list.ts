import { getBrowserOrigin } from '@/lib/utils/client-origin';
import { copyTextToClipboard } from '@/lib/utils/copy-to-clipboard';
import { buildCuratedListMapUrl } from './curated-list-url';

export type CuratedListShareMethod = 'web_share' | 'clipboard';

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name: string }).name === 'AbortError'
  );
}

/**
 * Shares a curated list's `/map/lists/{slug}` link through the native share
 * sheet, falling back to the clipboard.
 */
export async function shareCuratedListLink(input: {
  slug: string;
  listTitle: string;
  origin?: string;
}): Promise<CuratedListShareMethod | null> {
  if (typeof navigator === 'undefined') return null;

  const url = buildCuratedListMapUrl({
    slug: input.slug,
    origin: input.origin ?? getBrowserOrigin(),
  });

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: input.listTitle, url });
      return 'web_share';
    } catch (error) {
      if (isAbortError(error)) return null;
    }
  }

  if (await copyTextToClipboard(url)) {
    return 'clipboard';
  }
  return null;
}
