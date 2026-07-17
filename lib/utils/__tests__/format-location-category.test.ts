import { describe, it, expect } from 'vitest';
import {
  formatLocationCategory,
  isSingleWordLocationCategory,
} from '../format-location-category';

describe('isSingleWordLocationCategory', () => {
  it('returns true for single-word category names', () => {
    expect(isSingleWordLocationCategory({ name: 'Restaurant' })).toBe(true);
    expect(isSingleWordLocationCategory(null)).toBe(true);
  });

  it('returns false for multi-word category names', () => {
    expect(isSingleWordLocationCategory({ name: 'Performance Venue' })).toBe(
      false
    );
  });
});

describe('formatLocationCategory', () => {
  it('returns the category name as-is', () => {
    expect(formatLocationCategory({ name: 'Performance Venue' })).toBe(
      'Performance Venue'
    );
  });

  it('falls back to Location when the category is missing', () => {
    expect(formatLocationCategory(null)).toBe('Location');
    expect(formatLocationCategory({ name: '  ' })).toBe('Location');
  });
});
