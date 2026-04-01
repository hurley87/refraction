import { describe, it, expect } from 'vitest';
import { resolveServerIdentity } from '../server';

describe('resolveServerIdentity', () => {
  it('should prefer email over wallet address', () => {
    const result = resolveServerIdentity({
      email: 'user@example.com',
      walletAddress: '0xABC',
      playerId: 1,
    });
    expect(result).toBe('user@example.com');
  });

  it('should fall back to wallet address when email is absent', () => {
    const result = resolveServerIdentity({
      walletAddress: '0xABC',
      playerId: 1,
    });
    expect(result).toBe('0xABC');
  });

  it('should fall back to playerId when only playerId is available', () => {
    const result = resolveServerIdentity({
      playerId: 42,
    });
    expect(result).toBe('42');
  });

  it('should return empty string when no identifiers are provided', () => {
    const result = resolveServerIdentity({});
    expect(result).toBe('');
  });

  it('should normalize email to lowercase and trim', () => {
    const result = resolveServerIdentity({
      email: '  User@Example.COM  ',
      walletAddress: '0xABC',
    });
    expect(result).toBe('user@example.com');
  });

  it('should skip empty/whitespace-only email', () => {
    const result = resolveServerIdentity({
      email: '   ',
      walletAddress: '0xABC',
    });
    expect(result).toBe('0xABC');
  });

  it('should prefer email over privyUserId', () => {
    const result = resolveServerIdentity({
      email: 'user@example.com',
      privyUserId: 'privy_123',
      walletAddress: '0xABC',
    });
    expect(result).toBe('user@example.com');
  });

  it('should prefer privyUserId over walletAddress', () => {
    const result = resolveServerIdentity({
      privyUserId: 'privy_123',
      walletAddress: '0xABC',
    });
    expect(result).toBe('privy_123');
  });
});
