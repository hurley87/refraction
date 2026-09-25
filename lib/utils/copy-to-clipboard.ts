/**
 * Copies text via the Async Clipboard API when available. Returns false when
 * the browser blocks the write (permissions policy, missing user activation,
 * in-app webviews) instead of surfacing an unhandled rejection.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;

  const { clipboard } = navigator;
  if (!clipboard?.writeText) return false;

  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
