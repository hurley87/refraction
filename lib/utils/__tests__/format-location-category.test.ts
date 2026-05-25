import { describe, it, expect } from 'vitest';
import {
  formatLocationCategory,
  isSingleWordLocationCategory,
} from '../format-location-category';

describe('isSingleWordLocationCategory', () => {
  it('returns true for single-word types', () => {
    expect(isSingleWordLocationCategory('restaurant')).toBe(true);
    expect(isSingleWordLocationCategory('location')).toBe(true);
    expect(isSingleWordLocationCategory(null)).toBe(true);
  });

  it('returns false for multi-word types', () => {
    expect(isSingleWordLocationCategory('coffee shop')).toBe(false);
    expect(isSingleWordLocationCategory('coffee_shop')).toBe(false);
    expect(isSingleWordLocationCategory('coffee-shop')).toBe(false);
  });
});

describe('formatLocationCategory', () => {
  it('title-cases hyphenated types', () => {
    expect(formatLocationCategory('coffee-shop')).toBe('Coffee Shop');
  });
});
