import { describe, it, expect } from 'vitest';
import { resolveDistinctId, type IdentityInput } from '../identity';

describe('resolveDistinctId', () => {
  describe('email priority', () => {
    it('should use email when provided', () => {
      const input: IdentityInput = {
        email: 'user@example.com',
        walletAddress: '0x123',
      };
      const result = resolveDistinctId(input);
      expect(result.distinctId).toBe('user@example.com');
      expect(result.identitySource).toBe('email');
    });

    it('should normalize email to lowercase', () => {
      const input: IdentityInput = {
        email: 'User@Example.COM',
      };
      const result = resolveDistinctId(input);
      expect(result.distinctId).toBe('user@example.com');
      expect(result.identitySource).toBe('email');
    });

    it('should trim email whitespace', () => {
      const input: IdentityInput = {
        email: '  user@example.com  ',
      };
      const result = resolveDistinctId(input);
      expect(result.distinctId).toBe('user@example.com');
      expect(result.identitySource).toBe('email');
    });

    it('should ignore empty email strings', () => {
      const input: IdentityInput = {
        email: '   ',
        walletAddress: '0x123',
      };
      const result = resolveDistinctId(input);
      expect(result.distinctId).toBe('0x123');
      expect(result.identitySource).toBe('wallet');
    });
  });

  describe('privy user id fallback', () => {
    it('should use privyUserId when email is missing', () => {
      const input: IdentityInput = {
        privyUserId: 'privy_123',
        walletAddress: '0x123',
      };
      const result = resolveDistinctId(input);
      expect(result.distinctId).toBe('privy_123');
      expect(result.identitySource).toBe('privy');
    });

    it('should trim privyUserId', () => {
      const input: IdentityInput = {
        privyUserId: '  privy_123  ',
      };
      const result = resolveDistinctId(input);
      expect(result.distinctId).toBe('privy_123');
      expect(result.identitySource).toBe('privy');
    });
  });

  describe('wallet address fallback', () => {
    it('should use walletAddress when email and privyUserId are missing', () => {
      const input: IdentityInput = {
        walletAddress: '0x1234567890abcdef',
      };
      const result = resolveDistinctId(input);
      expect(result.distinctId).toBe('0x1234567890abcdef');
      expect(result.identitySource).toBe('wallet');
    });

    it('should trim walletAddress', () => {
      const input: IdentityInput = {
        walletAddress: '  0x123  ',
      };
      const result = resolveDistinctId(input);
      expect(result.distinctId).toBe('0x123');
      expect(result.identitySource).toBe('wallet');
    });
  });

  describe('player id fallback', () => {
    it('should use playerId when other identifiers are missing', () => {
      const input: IdentityInput = {
        playerId: 42,
      };
      const result = resolveDistinctId(input);
      expect(result.distinctId).toBe('42');
      expect(result.identitySource).toBe('player');
    });

    it('should convert numeric playerId to string', () => {
      const input: IdentityInput = {
        playerId: 123,
      };
      const result = resolveDistinctId(input);
      expect(result.distinctId).toBe('123');
      expect(result.identitySource).toBe('player');
    });

    it('should handle string playerId', () => {
      const input: IdentityInput = {
        playerId: '456',
      };
      const result = resolveDistinctId(input);
      expect(result.distinctId).toBe('456');
      expect(result.identitySource).toBe('player');
    });
  });

  describe('error handling', () => {
    it('should throw error when no identifiers are provided', () => {
      const input: IdentityInput = {};
      expect(() => resolveDistinctId(input)).toThrow(
        'No valid identifier provided for Mixpanel distinct_id'
      );
    });

    it('should throw error when all identifiers are empty', () => {
      const input: IdentityInput = {
        email: '',
        privyUserId: '',
        walletAddress: '',
        playerId: undefined,
      };
      expect(() => resolveDistinctId(input)).toThrow(
        'No valid identifier provided for Mixpanel distinct_id'
      );
    });
  });

  describe('priority order', () => {
    it('should prioritize email over privyUserId', () => {
      const input: IdentityInput = {
        email: 'user@example.com',
        privyUserId: 'privy_123',
        walletAddress: '0x123',
        playerId: 42,
      };
      const result = resolveDistinctId(input);
      expect(result.distinctId).toBe('user@example.com');
      expect(result.identitySource).toBe('email');
    });

    it('should prioritize privyUserId over walletAddress', () => {
      const input: IdentityInput = {
        privyUserId: 'privy_123',
        walletAddress: '0x123',
        playerId: 42,
      };
      const result = resolveDistinctId(input);
      expect(result.distinctId).toBe('privy_123');
      expect(result.identitySource).toBe('privy');
    });

    it('should prioritize walletAddress over playerId', () => {
      const input: IdentityInput = {
        walletAddress: '0x123',
        playerId: 42,
      };
      const result = resolveDistinctId(input);
      expect(result.distinctId).toBe('0x123');
      expect(result.identitySource).toBe('wallet');
    });
  });
});
