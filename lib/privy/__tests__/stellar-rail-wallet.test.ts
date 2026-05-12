import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetUser = vi.fn();
const mockWalletCreate = vi.fn();
const mockGetPlayerByEmail = vi.fn();
const mockCreateOrUpdatePlayerForStellar = vi.fn();

vi.mock('@/lib/api/privy', () => ({
  getPrivyClient: () => ({
    getUser: (...a: unknown[]) => mockGetUser(...a),
    walletApi: {
      create: (...a: unknown[]) => mockWalletCreate(...a),
    },
  }),
}));

vi.mock('@/lib/db/players', () => ({
  getPlayerByEmail: (...a: unknown[]) => mockGetPlayerByEmail(...a),
  createOrUpdatePlayerForStellar: (...a: unknown[]) =>
    mockCreateOrUpdatePlayerForStellar(...a),
}));

import {
  ensureStellarRailUserWallet,
  resolveStellarPrivyWalletIdForUser,
} from '../stellar-rail-wallet';

describe('ensureStellarRailUserWallet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns canonical player stellar_wallet_address when present', async () => {
    mockGetUser.mockResolvedValue({
      email: { address: 'u@test.com' },
      linkedAccounts: [],
    });
    mockGetPlayerByEmail.mockResolvedValue({
      stellar_wallet_address: 'GDBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      stellar_wallet_id: 'wid-db',
    });

    const r = await ensureStellarRailUserWallet('privy-x');
    expect(r).toEqual({
      address: 'GDBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      walletId: 'wid-db',
      provisioned: false,
    });
    expect(mockWalletCreate).not.toHaveBeenCalled();
  });

  it('uses linked Privy Stellar and syncs player when DB has no canonical row', async () => {
    mockGetUser.mockResolvedValue({
      email: { address: 'u@test.com' },
      linkedAccounts: [
        {
          type: 'wallet',
          chainType: 'stellar',
          address: 'GLINKBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
          id: 'lid',
        },
      ],
    });
    mockGetPlayerByEmail.mockResolvedValue({
      stellar_wallet_address: null,
    });

    const r = await ensureStellarRailUserWallet('privy-x');
    expect(r.address).toBe('GLINKBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB');
    expect(r.walletId).toBe('lid');
    expect(r.provisioned).toBe(false);
    expect(mockCreateOrUpdatePlayerForStellar).toHaveBeenCalledWith(
      'GLINKBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      'u@test.com',
      'lid'
    );
    expect(mockWalletCreate).not.toHaveBeenCalled();
  });

  it('creates a Privy Stellar wallet when none exists', async () => {
    mockGetUser.mockResolvedValue({
      email: { address: 'u@test.com' },
      linkedAccounts: [],
    });
    mockGetPlayerByEmail.mockResolvedValue(null);
    mockWalletCreate.mockResolvedValue({
      address: 'GNEWBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      id: 'new-id',
    });

    const r = await ensureStellarRailUserWallet('privy-x');
    expect(r).toEqual({
      address: 'GNEWBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      walletId: 'new-id',
      provisioned: true,
    });
    expect(mockWalletCreate).toHaveBeenCalledWith({ chainType: 'stellar' });
    expect(mockCreateOrUpdatePlayerForStellar).toHaveBeenCalledWith(
      'GNEWBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      'u@test.com',
      'new-id'
    );
  });
});

describe('resolveStellarPrivyWalletIdForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the linked Stellar wallet id matching the address', async () => {
    mockGetUser.mockResolvedValue({
      linkedAccounts: [
        {
          type: 'wallet',
          chainType: 'stellar',
          address: 'GMATCHBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
          id: 'wid-99',
        },
      ],
    });
    await expect(
      resolveStellarPrivyWalletIdForUser(
        'privy-u1',
        'GMATCHBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
      )
    ).resolves.toBe('wid-99');
  });

  it('throws when no matching Stellar wallet is linked', async () => {
    mockGetUser.mockResolvedValue({
      linkedAccounts: [
        {
          type: 'wallet',
          chainType: 'stellar',
          address: 'GOTHERBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
          id: 'wid-x',
        },
      ],
    });
    await expect(
      resolveStellarPrivyWalletIdForUser(
        'privy-u1',
        'GMATCHBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
      )
    ).rejects.toThrow('stellar_privy_wallet_id_unresolved');
  });
});
