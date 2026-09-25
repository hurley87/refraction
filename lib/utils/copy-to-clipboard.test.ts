import { describe, expect, it, vi } from 'vitest';

import { copyTextToClipboard } from '@/lib/utils/copy-to-clipboard';

describe('copyTextToClipboard', () => {
  it('returns true when writeText succeeds', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    await expect(copyTextToClipboard('hello')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');

    vi.unstubAllGlobals();
  });

  it('returns false when writeText is denied', async () => {
    const writeText = vi
      .fn()
      .mockRejectedValue(
        new DOMException(
          "Failed to execute 'writeText' on 'Clipboard': Write permission denied.",
          'NotAllowedError'
        )
      );
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    await expect(copyTextToClipboard('hello')).resolves.toBe(false);

    vi.unstubAllGlobals();
  });

  it('returns false when clipboard is unavailable', async () => {
    vi.stubGlobal('navigator', {});

    await expect(copyTextToClipboard('hello')).resolves.toBe(false);

    vi.unstubAllGlobals();
  });
});
