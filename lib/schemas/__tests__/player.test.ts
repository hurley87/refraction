import { describe, it, expect } from 'vitest';
import {
  walletAddressSchema,
  solanaWalletAddressSchema,
  stellarWalletAddressSchema,
  aptosWalletAddressSchema,
  createPlayerSchema,
  updateUserProfileSchema,
  awardProfileFieldPointsSchema,
} from '../player';

describe('Player Schemas', () => {
  describe('walletAddressSchema', () => {
    it('should accept valid EVM wallet address', () => {
      const validAddress = '0x1234567890abcdef1234567890abcdef12345678';
      const result = walletAddressSchema.safeParse(validAddress);
      expect(result.success).toBe(true);
    });

    it('should accept uppercase hex characters', () => {
      const validAddress = '0x1234567890ABCDEF1234567890ABCDEF12345678';
      const result = walletAddressSchema.safeParse(validAddress);
      expect(result.success).toBe(true);
    });

    it('should accept mixed case hex characters', () => {
      const validAddress = '0x1234567890AbCdEf1234567890aBcDeF12345678';
      const result = walletAddressSchema.safeParse(validAddress);
      expect(result.success).toBe(true);
    });

    it('should reject address without 0x prefix', () => {
      const invalidAddress = '1234567890abcdef1234567890abcdef12345678';
      const result = walletAddressSchema.safeParse(invalidAddress);
      expect(result.success).toBe(false);
    });

    it('should reject address with wrong length (too short)', () => {
      const invalidAddress = '0x1234567890abcdef1234567890abcdef1234567';
      const result = walletAddressSchema.safeParse(invalidAddress);
      expect(result.success).toBe(false);
    });

    it('should reject address with wrong length (too long)', () => {
      const invalidAddress = '0x1234567890abcdef1234567890abcdef123456789';
      const result = walletAddressSchema.safeParse(invalidAddress);
      expect(result.success).toBe(false);
    });

    it('should reject address with invalid characters', () => {
      const invalidAddress = '0x1234567890abcdef1234567890abcdef1234567g';
      const result = walletAddressSchema.safeParse(invalidAddress);
      expect(result.success).toBe(false);
    });

    it('should reject non-string types', () => {
      expect(walletAddressSchema.safeParse(123).success).toBe(false);
      expect(walletAddressSchema.safeParse(null).success).toBe(false);
      expect(walletAddressSchema.safeParse(undefined).success).toBe(false);
      expect(walletAddressSchema.safeParse({}).success).toBe(false);
    });

    it('should reject empty string', () => {
      const result = walletAddressSchema.safeParse('');
      expect(result.success).toBe(false);
    });
  });

  describe('solanaWalletAddressSchema', () => {
    it('should accept valid Solana wallet address (32 chars)', () => {
      const validAddress = '4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T';
      const result = solanaWalletAddressSchema.safeParse(validAddress);
      expect(result.success).toBe(true);
    });

    it('should accept valid Solana wallet address (44 chars)', () => {
      // Valid 44-char base58 Solana address (no 0, O, I, or l characters)
      const validAddress = '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV2';
      expect(validAddress.length).toBe(44);
      const result = solanaWalletAddressSchema.safeParse(validAddress);
      expect(result.success).toBe(true);
    });

    it('should reject address too short (less than 32 chars)', () => {
      const invalidAddress = '4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAs';
      const result = solanaWalletAddressSchema.safeParse(invalidAddress);
      expect(result.success).toBe(false);
    });

    it('should reject address too long (more than 44 chars)', () => {
      const invalidAddress = '4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T123';
      const result = solanaWalletAddressSchema.safeParse(invalidAddress);
      expect(result.success).toBe(false);
    });

    it('should reject address with invalid base58 characters (0, O, I, l)', () => {
      // 0 is not valid in base58
      const invalidWith0 = '0Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T';
      expect(solanaWalletAddressSchema.safeParse(invalidWith0).success).toBe(
        false
      );

      // O is not valid in base58
      const invalidWithO = 'ONd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T';
      expect(solanaWalletAddressSchema.safeParse(invalidWithO).success).toBe(
        false
      );

      // I is not valid in base58
      const invalidWithI = 'INd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T';
      expect(solanaWalletAddressSchema.safeParse(invalidWithI).success).toBe(
        false
      );

      // l (lowercase L) is not valid in base58
      const invalidWithl = 'lNd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T';
      expect(solanaWalletAddressSchema.safeParse(invalidWithl).success).toBe(
        false
      );
    });

    it('should reject non-string types', () => {
      expect(solanaWalletAddressSchema.safeParse(123).success).toBe(false);
      expect(solanaWalletAddressSchema.safeParse(null).success).toBe(false);
      expect(solanaWalletAddressSchema.safeParse(undefined).success).toBe(
        false
      );
    });
  });

  describe('stellarWalletAddressSchema', () => {
    it('should accept valid Stellar wallet address', () => {
      const validAddress =
        'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';
      const result = stellarWalletAddressSchema.safeParse(validAddress);
      expect(result.success).toBe(true);
    });

    it('should accept another valid Stellar wallet address', () => {
      const validAddress =
        'GA7YNBW5CBTJZ3ZZOWX3ZNBKD6OE7A7IHUQVWMY62W2ZBG2SGZVOOPVH';
      const result = stellarWalletAddressSchema.safeParse(validAddress);
      expect(result.success).toBe(true);
    });

    it('should reject address not starting with G', () => {
      const invalidAddress =
        'ABRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';
      const result = stellarWalletAddressSchema.safeParse(invalidAddress);
      expect(result.success).toBe(false);
    });

    it('should reject address with wrong length (too short)', () => {
      const invalidAddress =
        'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2';
      const result = stellarWalletAddressSchema.safeParse(invalidAddress);
      expect(result.success).toBe(false);
    });

    it('should reject address with wrong length (too long)', () => {
      const invalidAddress =
        'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2HH';
      const result = stellarWalletAddressSchema.safeParse(invalidAddress);
      expect(result.success).toBe(false);
    });

    it('should reject lowercase characters', () => {
      const invalidAddress =
        'gBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';
      const result = stellarWalletAddressSchema.safeParse(invalidAddress);
      expect(result.success).toBe(false);
    });

    it('should reject invalid characters (lowercase)', () => {
      // Stellar uses uppercase only for A-Z, so lowercase is invalid
      const invalidAddress =
        'GbRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';
      const result = stellarWalletAddressSchema.safeParse(invalidAddress);
      expect(result.success).toBe(false);
    });

    it('should reject non-string types', () => {
      expect(stellarWalletAddressSchema.safeParse(123).success).toBe(false);
      expect(stellarWalletAddressSchema.safeParse(null).success).toBe(false);
      expect(stellarWalletAddressSchema.safeParse(undefined).success).toBe(
        false
      );
    });
  });

  describe('aptosWalletAddressSchema', () => {
    it('should accept valid Aptos wallet address', () => {
      const validAddress =
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const result = aptosWalletAddressSchema.safeParse(validAddress);
      expect(result.success).toBe(true);
    });

    it('should accept another valid Aptos wallet address', () => {
      const validAddress =
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const result = aptosWalletAddressSchema.safeParse(validAddress);
      expect(result.success).toBe(true);
    });

    it('should reject address without 0x prefix', () => {
      const invalidAddress =
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const result = aptosWalletAddressSchema.safeParse(invalidAddress);
      expect(result.success).toBe(false);
    });

    it('should reject address with wrong length (too short)', () => {
      const invalidAddress =
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcde';
      const result = aptosWalletAddressSchema.safeParse(invalidAddress);
      expect(result.success).toBe(false);
    });

    it('should reject address with wrong length (too long)', () => {
      const invalidAddress =
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1';
      const result = aptosWalletAddressSchema.safeParse(invalidAddress);
      expect(result.success).toBe(false);
    });

    it('should reject address with invalid hex characters', () => {
      const invalidAddress =
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdeg';
      const result = aptosWalletAddressSchema.safeParse(invalidAddress);
      expect(result.success).toBe(false);
    });

    it('should accept uppercase hex characters', () => {
      const validAddress =
        '0x1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF';
      const result = aptosWalletAddressSchema.safeParse(validAddress);
      expect(result.success).toBe(true);
    });

    it('should reject non-string types', () => {
      expect(aptosWalletAddressSchema.safeParse(123).success).toBe(false);
      expect(aptosWalletAddressSchema.safeParse(null).success).toBe(false);
      expect(aptosWalletAddressSchema.safeParse(undefined).success).toBe(false);
    });
  });

  describe('createPlayerSchema', () => {
    it('should accept valid player with all optional fields', () => {
      const validPlayer = {
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
        solana_wallet_address: '4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T',
        stellar_wallet_address:
          'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
        stellar_wallet_id: 'stellar-id-123',
        aptos_wallet_address:
          '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        aptos_wallet_id: 'aptos-id-123',
        email: 'test@example.com',
        username: 'testuser',
        total_points: 100,
      };
      const result = createPlayerSchema.safeParse(validPlayer);
      expect(result.success).toBe(true);
    });

    it('should accept empty object (all fields optional)', () => {
      const result = createPlayerSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.total_points).toBe(0); // default value
      }
    });

    it('should accept player with only EVM wallet', () => {
      const player = {
        wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
      };
      const result = createPlayerSchema.safeParse(player);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email format', () => {
      const invalidPlayer = {
        email: 'not-an-email',
      };
      const result = createPlayerSchema.safeParse(invalidPlayer);
      expect(result.success).toBe(false);
    });

    it('should reject username too short', () => {
      const invalidPlayer = {
        username: 'ab',
      };
      const result = createPlayerSchema.safeParse(invalidPlayer);
      expect(result.success).toBe(false);
    });

    it('should reject username too long', () => {
      const invalidPlayer = {
        username: 'a'.repeat(31),
      };
      const result = createPlayerSchema.safeParse(invalidPlayer);
      expect(result.success).toBe(false);
    });

    it('should reject negative total_points', () => {
      const invalidPlayer = {
        total_points: -10,
      };
      const result = createPlayerSchema.safeParse(invalidPlayer);
      expect(result.success).toBe(false);
    });

    it('should reject non-integer total_points', () => {
      const invalidPlayer = {
        total_points: 10.5,
      };
      const result = createPlayerSchema.safeParse(invalidPlayer);
      expect(result.success).toBe(false);
    });
  });

  describe('updateUserProfileSchema', () => {
    it('should accept valid profile update with all fields', () => {
      const validUpdate = {
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        website: 'https://example.com',
        twitter_handle: 'testuser',
        towns_handle: 'testuser',
        farcaster_handle: 'testuser',
        telegram_handle: 'testuser',
        profile_picture_url: 'https://example.com/pic.jpg',
      };
      const result = updateUserProfileSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    it('should accept empty object (all fields optional)', () => {
      const result = updateUserProfileSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = updateUserProfileSchema.safeParse({ email: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('should reject empty name', () => {
      const result = updateUserProfileSchema.safeParse({ name: '' });
      expect(result.success).toBe(false);
    });

    it('should reject name too long', () => {
      const result = updateUserProfileSchema.safeParse({
        name: 'a'.repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid website URL', () => {
      const result = updateUserProfileSchema.safeParse({
        website: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid profile picture URL', () => {
      const result = updateUserProfileSchema.safeParse({
        profile_picture_url: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });

    it('should reject handle too long', () => {
      const result = updateUserProfileSchema.safeParse({
        twitter_handle: 'a'.repeat(51),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('awardProfileFieldPointsSchema', () => {
    it('should accept valid award request', () => {
      const validRequest = {
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        fieldType: 'twitter',
        fieldValue: '@testuser',
      };
      const result = awardProfileFieldPointsSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should reject missing walletAddress', () => {
      const invalidRequest = {
        fieldType: 'twitter',
        fieldValue: '@testuser',
      };
      const result = awardProfileFieldPointsSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject invalid walletAddress', () => {
      const invalidRequest = {
        walletAddress: 'invalid',
        fieldType: 'twitter',
        fieldValue: '@testuser',
      };
      const result = awardProfileFieldPointsSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject missing fieldType', () => {
      const invalidRequest = {
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        fieldValue: '@testuser',
      };
      const result = awardProfileFieldPointsSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject empty fieldType', () => {
      const invalidRequest = {
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        fieldType: '',
        fieldValue: '@testuser',
      };
      const result = awardProfileFieldPointsSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject missing fieldValue', () => {
      const invalidRequest = {
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        fieldType: 'twitter',
      };
      const result = awardProfileFieldPointsSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject empty fieldValue', () => {
      const invalidRequest = {
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        fieldType: 'twitter',
        fieldValue: '',
      };
      const result = awardProfileFieldPointsSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });
});
