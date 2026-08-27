import { describe, expect, it } from 'vitest';
import {
  buildPublicListShareCardPath,
  buildPublicListShareMessage,
  buildPublicListShareUrl,
} from '@/lib/player-lists/public-list-share-url';

describe('buildPublicListShareUrl', () => {
  it('builds canonical irl.energy map list URLs', () => {
    expect(
      buildPublicListShareUrl({
        username: 'alice',
        listSlug: 'best-bars',
      })
    ).toBe('https://www.irl.energy/map/alice/best-bars');
  });

  it('normalizes username and slug casing', () => {
    expect(
      buildPublicListShareUrl({
        username: 'Alice',
        listSlug: 'Best-Bars',
      })
    ).toBe('https://www.irl.energy/map/alice/best-bars');
  });

  it('uses a provided origin without a trailing slash', () => {
    expect(
      buildPublicListShareUrl({
        username: 'alice',
        listSlug: 'best-bars',
        origin: 'http://localhost:3000/',
      })
    ).toBe('http://localhost:3000/map/alice/best-bars');
  });

  it('falls back to the canonical origin for a blank origin', () => {
    expect(
      buildPublicListShareUrl({
        username: 'alice',
        listSlug: 'best-bars',
        origin: '   ',
      })
    ).toBe('https://www.irl.energy/map/alice/best-bars');
  });
});

describe('buildPublicListShareCardPath', () => {
  it('points at the generated OG image for the list', () => {
    expect(
      buildPublicListShareCardPath({
        username: 'Alice',
        listSlug: 'Best-Bars',
      })
    ).toBe('/map/alice/best-bars/opengraph-image');
  });
});

describe('buildPublicListShareMessage', () => {
  it('carries the link so an attached card stays reachable', () => {
    expect(
      buildPublicListShareMessage({
        listTitle: 'Best Bars',
        shareUrl: 'https://www.irl.energy/map/alice/best-bars',
      })
    ).toBe(
      'Check out Best Bars on IRL: https://www.irl.energy/map/alice/best-bars'
    );
  });
});
