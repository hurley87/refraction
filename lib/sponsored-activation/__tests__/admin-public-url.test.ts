import { describe, it, expect } from 'vitest';
import {
  sponsoredActivationPublicPath,
  sponsoredActivationPublicUrl,
} from '@/lib/sponsored-activation/admin-public-url';

describe('sponsoredActivationPublicPath', () => {
  it('builds activation route from slug or id', () => {
    expect(sponsoredActivationPublicPath('my-slug')).toBe(
      '/activation/my-slug'
    );
    expect(
      sponsoredActivationPublicPath('01a3e4bd-a585-45b1-ae68-ec38b3a4df3f')
    ).toBe('/activation/01a3e4bd-a585-45b1-ae68-ec38b3a4df3f');
  });
});

describe('sponsoredActivationPublicUrl', () => {
  it('joins origin and path', () => {
    expect(sponsoredActivationPublicUrl('abc', 'https://irl.energy')).toBe(
      'https://irl.energy/activation/abc'
    );
  });
});
