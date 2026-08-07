import { describe, it, expect } from 'vitest';
import { normalizePlaceName, placeNameMatchScore } from '../place-name-match';

describe('normalizePlaceName', () => {
  it("strips apostrophes so Bambi's matches Bambis", () => {
    expect(normalizePlaceName("Bambi's")).toBe('bambis');
    expect(normalizePlaceName('Bambis')).toBe('bambis');
    expect(normalizePlaceName('Bambi\u2019s')).toBe('bambis');
  });
});

describe('placeNameMatchScore', () => {
  it("scores Bambi's as an exact match for Bambis", () => {
    expect(placeNameMatchScore("Bambi's", 'Bambis')).toBe(100);
  });

  it('still rejects unrelated nearby venue names', () => {
    expect(placeNameMatchScore("Bambi's", 'Trinity-Bellwoods')).toBe(0);
    expect(placeNameMatchScore('Standard Time', 'Blood Brothers')).toBe(0);
  });
});
