/** Padding so list pins sit in the map area not covered by the lists drawer. */
export function getListFocusMapPadding(): {
  top: number;
  bottom: number;
  left: number;
  right: number;
} {
  if (typeof window === 'undefined') {
    return { top: 80, bottom: 80, left: 80, right: 80 };
  }
  const width = window.innerWidth;
  const height = window.innerHeight;
  if (width >= 2560 && height >= 1440) {
    return { top: 120, bottom: 80, left: 920, right: 80 };
  }
  if (width >= 1367) {
    return { top: 120, bottom: 80, left: 500, right: 80 };
  }
  if (width >= 1280) {
    return { top: 120, bottom: 80, left: 440, right: 80 };
  }
  const bottom = Math.min(Math.round(height * 0.8) + 16, height - 120);
  return { top: 88, bottom, left: 24, right: 24 };
}

/**
 * Bottom padding so a pin stays visually centered above the fixed map-card overlay
 * when flying the camera to a selected / deep-linked marker.
 */
export function getMapCardFlyToBottomPaddingPx(): number {
  if (typeof window === 'undefined') return 280;
  return Math.min(360, Math.max(200, Math.round(window.innerHeight * 0.34)));
}
