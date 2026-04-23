import { describe, it, expect } from 'vitest';
import { sanitizeInternalReturnPath } from '../safe-return-path';

describe('sanitizeInternalReturnPath', () => {
  it('allows simple app paths', () => {
    expect(
      sanitizeInternalReturnPath('/city-guides/berlin-michail-stangl')
    ).toBe('/city-guides/berlin-michail-stangl');
    expect(
      sanitizeInternalReturnPath('/city-guides/editorial/montreal-dispatch')
    ).toBe('/city-guides/editorial/montreal-dispatch');
    expect(sanitizeInternalReturnPath('/interactive-map')).toBe(
      '/interactive-map'
    );
  });

  it('decodes encoded paths', () => {
    expect(sanitizeInternalReturnPath(encodeURIComponent('/a/b'))).toBe('/a/b');
  });

  it('rejects external and protocol-relative URLs', () => {
    expect(sanitizeInternalReturnPath('https://evil.com')).toBeNull();
    expect(sanitizeInternalReturnPath('//evil.com')).toBeNull();
    expect(sanitizeInternalReturnPath('javascript:alert(1)')).toBeNull();
  });

  it('rejects empty after trim', () => {
    expect(sanitizeInternalReturnPath('   ')).toBeNull();
    expect(sanitizeInternalReturnPath(null)).toBeNull();
  });
});
