import { describe, expect, it } from 'vitest';
import { editorialTypographyClassName } from '@/lib/guides/editorial-typography';

describe('editorialTypographyClassName', () => {
  it('uses narrow-column display variants', () => {
    expect(editorialTypographyClassName('display0')).toBe('display0-sm');
    expect(editorialTypographyClassName('display1')).toBe('display1-sm');
    expect(editorialTypographyClassName('display2')).toBe('display2-sm');
  });

  it('maps title and body styles to global classes', () => {
    expect(editorialTypographyClassName('title3')).toBe('title3');
    expect(editorialTypographyClassName('bodyMedium')).toBe('body-medium');
  });
});
