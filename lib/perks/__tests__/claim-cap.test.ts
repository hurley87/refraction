import { describe, it, expect } from 'vitest';
import { isClaimedToday } from '../claim-cap';

describe('isClaimedToday', () => {
  it('is false when max is null or undefined (unlimited)', () => {
    expect(isClaimedToday(5, null)).toBe(false);
    expect(isClaimedToday(5, undefined)).toBe(false);
  });

  it('is true when count meets or exceeds the cap', () => {
    expect(isClaimedToday(1, 1)).toBe(true);
    expect(isClaimedToday(2, 1)).toBe(true);
  });

  it('is false when count is under the cap', () => {
    expect(isClaimedToday(0, 1)).toBe(false);
    expect(isClaimedToday(1, 2)).toBe(false);
  });
});
