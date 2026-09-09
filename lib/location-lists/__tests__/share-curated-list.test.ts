import { afterEach, describe, expect, it, vi } from 'vitest';
import { shareCuratedListLink } from '../share-curated-list';

const EXPECTED_URL = 'https://www.irl.energy/map/lists/michail-stangl-berlin';

const input = {
  slug: 'michail-stangl-berlin',
  listTitle: 'Michail Stangl Berlin',
  origin: 'https://www.irl.energy',
};

function stubNavigator(overrides: {
  share?: (data: ShareData) => Promise<void>;
  writeText?: (text: string) => Promise<void>;
}) {
  vi.stubGlobal('navigator', {
    ...(overrides.share ? { share: overrides.share } : {}),
    clipboard: { writeText: overrides.writeText ?? vi.fn() },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('shareCuratedListLink', () => {
  it('uses the native share sheet with the slug URL', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubNavigator({ share, writeText });

    await expect(shareCuratedListLink(input)).resolves.toBe('web_share');
    expect(share).toHaveBeenCalledWith({
      title: 'Michail Stangl Berlin',
      url: EXPECTED_URL,
    });
    expect(writeText).not.toHaveBeenCalled();
  });

  it('copies the slug URL when there is no share sheet', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubNavigator({ writeText });

    await expect(shareCuratedListLink(input)).resolves.toBe('clipboard');
    expect(writeText).toHaveBeenCalledWith(EXPECTED_URL);
  });

  it('reports nothing shared when the reader dismisses the share sheet', async () => {
    const abort = Object.assign(new Error('dismissed'), {
      name: 'AbortError',
    });
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubNavigator({ share: vi.fn().mockRejectedValue(abort), writeText });

    await expect(shareCuratedListLink(input)).resolves.toBeNull();
    expect(writeText).not.toHaveBeenCalled();
  });
});
