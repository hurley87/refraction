import { describe, it, expect } from 'vitest';
import {
  isReservedUsername,
  normalizeUsername,
  profilePathForPlayer,
  sanitizeUsernameInput,
  usernameSchema,
} from '../username';

describe('username utilities', () => {
  describe('normalizeUsername', () => {
    it('trims and lowercases', () => {
      expect(normalizeUsername('  Alice_01  ')).toBe('alice_01');
    });

    it('converts spaces to underscores', () => {
      expect(normalizeUsername('Mr Frog')).toBe('mr_frog');
      expect(normalizeUsername('mr  frog')).toBe('mr_frog');
    });

    it('converts hyphens to underscores', () => {
      expect(normalizeUsername('mr-frog')).toBe('mr_frog');
    });
  });

  describe('sanitizeUsernameInput', () => {
    it('replaces spaces and hyphens with underscores without lowercasing', () => {
      expect(sanitizeUsernameInput('Mr Frog')).toBe('Mr_Frog');
      expect(sanitizeUsernameInput('Mr-Frog')).toBe('Mr_Frog');
    });
  });

  describe('isReservedUsername', () => {
    it('flags system route slugs', () => {
      expect(isReservedUsername('faq')).toBe(true);
      expect(isReservedUsername('Admin')).toBe(true);
      expect(isReservedUsername('interactive-map')).toBe(true);
      expect(isReservedUsername('interactive_map')).toBe(true);
      expect(isReservedUsername('map')).toBe(true);
      expect(isReservedUsername('_next')).toBe(true);
    });

    it('allows normal usernames', () => {
      expect(isReservedUsername('alice')).toBe(false);
      expect(isReservedUsername('faq_user')).toBe(false);
    });
  });

  describe('usernameSchema', () => {
    it('accepts a valid username and lowercases it', () => {
      const result = usernameSchema.safeParse('Alice_01');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('alice_01');
      }
    });

    it('converts spaced usernames to underscores', () => {
      const result = usernameSchema.safeParse('mr frog');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('mr_frog');
      }
    });

    it('rejects reserved slugs', () => {
      expect(usernameSchema.safeParse('faq').success).toBe(false);
      expect(usernameSchema.safeParse('admin').success).toBe(false);
      expect(usernameSchema.safeParse('FAQ').success).toBe(false);
    });

    it('rejects too short, too long, and invalid characters', () => {
      expect(usernameSchema.safeParse('ab').success).toBe(false);
      expect(usernameSchema.safeParse('a'.repeat(31)).success).toBe(false);
      expect(usernameSchema.safeParse('bad.name').success).toBe(false);
      expect(usernameSchema.safeParse('bad@name').success).toBe(false);
    });

    it('normalizes hyphenated usernames', () => {
      const result = usernameSchema.safeParse('bad-name');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('bad_name');
      }
    });
  });

  describe('profilePathForPlayer', () => {
    it('prefers vanity path when username is set', () => {
      expect(
        profilePathForPlayer({
          username: 'Alice',
          wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        })
      ).toBe('/alice');
    });

    it('normalizes spaces in vanity paths', () => {
      expect(
        profilePathForPlayer({
          username: 'mr frog',
          wallet_address: '0xabc',
        })
      ).toBe('/mr_frog');
    });

    it('falls back to wallet profile path', () => {
      expect(
        profilePathForPlayer({
          username: null,
          wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        })
      ).toBe('/profiles/0x1234567890abcdef1234567890abcdef12345678');

      expect(
        profilePathForPlayer({
          username: '   ',
          wallet_address: '0xabc',
        })
      ).toBe('/profiles/0xabc');
    });
  });
});
