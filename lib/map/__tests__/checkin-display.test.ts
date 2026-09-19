import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  getCheckinDisplayName,
  getCheckinInitial,
  buildLocationShareUrl,
} from '../checkin-display';

describe('getCheckinDisplayName', () => {
  it('prefers username', () => {
    expect(
      getCheckinDisplayName({
        id: 1,
        comment: '',
        pointsEarned: 0,
        username: 'alice',
        walletAddress: '0x1234567890abcdef',
      })
    ).toBe('alice');
  });

  it('falls back to truncated wallet', () => {
    expect(
      getCheckinDisplayName({
        id: 1,
        comment: '',
        pointsEarned: 0,
        walletAddress: '0x1234567890abcdef',
      })
    ).toBe('0x1234...cdef');
  });

  it('falls back to Explorer', () => {
    expect(getCheckinDisplayName({ id: 1, comment: '', pointsEarned: 0 })).toBe(
      'Explorer'
    );
  });
});

describe('getCheckinInitial', () => {
  it('uses username initial', () => {
    expect(
      getCheckinInitial({
        id: 1,
        comment: '',
        pointsEarned: 0,
        username: 'bob',
      })
    ).toBe('B');
  });

  it('uses wallet hex char after 0x', () => {
    expect(
      getCheckinInitial({
        id: 1,
        comment: '',
        pointsEarned: 0,
        walletAddress: '0xab',
      })
    ).toBe('A');
  });

  it('falls back to +', () => {
    expect(getCheckinInitial({ id: 1, comment: '', pointsEarned: 0 })).toBe(
      '+'
    );
  });
});

describe('buildLocationShareUrl', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds a name-based interactive-map URL', () => {
    vi.stubGlobal('window', {
      location: { origin: 'https://example.com' },
    });
    expect(buildLocationShareUrl('  Cafe Neo  ')).toBe(
      'https://example.com/interactive-map?name=Cafe+Neo'
    );
  });
});
