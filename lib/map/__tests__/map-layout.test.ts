import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  getListFocusMapPadding,
  getMapCardFlyToBottomPaddingPx,
} from '../map-layout';

describe('getListFocusMapPadding', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns desktop left padding at xl widths', () => {
    vi.stubGlobal('window', { innerWidth: 1400, innerHeight: 900 });
    expect(getListFocusMapPadding()).toEqual({
      top: 120,
      bottom: 80,
      left: 500,
      right: 80,
    });
  });

  it('returns mobile bottom-heavy padding', () => {
    vi.stubGlobal('window', { innerWidth: 390, innerHeight: 800 });
    const padding = getListFocusMapPadding();
    expect(padding.top).toBe(88);
    expect(padding.left).toBe(24);
    expect(padding.bottom).toBe(
      Math.min(Math.round(800 * 0.8) + 16, 800 - 120)
    );
  });
});

describe('getMapCardFlyToBottomPaddingPx', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('clamps between 200 and 360 based on viewport height', () => {
    vi.stubGlobal('window', { innerWidth: 390, innerHeight: 1000 });
    expect(getMapCardFlyToBottomPaddingPx()).toBe(340);
  });

  it('uses the floor of 200 for short viewports', () => {
    vi.stubGlobal('window', { innerWidth: 390, innerHeight: 400 });
    expect(getMapCardFlyToBottomPaddingPx()).toBe(200);
  });
});
