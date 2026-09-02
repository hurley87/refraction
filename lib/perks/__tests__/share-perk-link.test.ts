import { afterEach, describe, expect, it, vi } from 'vitest';
import { sharePerkLink } from '../share-perk-link';

const EXPECTED_URL =
  'https://www.irl.energy/rewards?perkId=abc-123&utm_source=member-share&utm_medium=share&utm_campaign=free-drink';

const input = { title: 'Free Drink', perkId: 'abc-123' };

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

describe('sharePerkLink', () => {
  it('uses the native share sheet with the UTM-tagged link', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubNavigator({ share, writeText });

    await expect(sharePerkLink(input)).resolves.toBe('web_share');
    expect(share).toHaveBeenCalledWith({
      title: 'Free Drink',
      url: EXPECTED_URL,
    });
    expect(writeText).not.toHaveBeenCalled();
  });

  it('copies the link when there is no share sheet', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubNavigator({ writeText });

    await expect(sharePerkLink(input)).resolves.toBe('clipboard');
    expect(writeText).toHaveBeenCalledWith(EXPECTED_URL);
  });

  it('reports nothing shared when the reader dismisses the share sheet', async () => {
    const abort = Object.assign(new Error('dismissed'), {
      name: 'AbortError',
    });
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubNavigator({ share: vi.fn().mockRejectedValue(abort), writeText });

    await expect(sharePerkLink(input)).resolves.toBeNull();
    expect(writeText).not.toHaveBeenCalled();
  });

  it('falls back to the clipboard when the share sheet fails outright', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubNavigator({
      share: vi.fn().mockRejectedValue(new Error('not allowed')),
      writeText,
    });

    await expect(sharePerkLink(input)).resolves.toBe('clipboard');
    expect(writeText).toHaveBeenCalledWith(EXPECTED_URL);
  });

  it('reports nothing shared when the clipboard is blocked too', async () => {
    stubNavigator({
      writeText: vi.fn().mockRejectedValue(new Error('insecure context')),
    });

    await expect(sharePerkLink(input)).resolves.toBeNull();
  });
});
