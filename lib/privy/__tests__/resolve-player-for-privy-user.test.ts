import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolvePlayerForPrivyUser } from '@/lib/privy/resolve-player-for-privy-user';

const EVM = '0x4D418f71c531465337b65127B207aa849Fa5a9e3';
const STELLAR = 'GMATCHBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';

const mockGetPlayerByWallet = vi.fn();
const mockGetPlayerByEmail = vi.fn();
const mockGetPlayerByStellarWallet = vi.fn();
const mockGetPlayerBySolanaWallet = vi.fn();
const mockGetPlayerByAptosWallet = vi.fn();
const mockCreateOrUpdatePlayer = vi.fn();
const mockAssignEvmWalletToPlayer = vi.fn();

vi.mock('@/lib/db/players', () => ({
  assignEvmWalletToPlayer: (...args: unknown[]) =>
    mockAssignEvmWalletToPlayer(...args),
  getPlayerByWallet: (...args: unknown[]) => mockGetPlayerByWallet(...args),
  getPlayerByEmail: (...args: unknown[]) => mockGetPlayerByEmail(...args),
  getPlayerByStellarWallet: (...args: unknown[]) =>
    mockGetPlayerByStellarWallet(...args),
  getPlayerBySolanaWallet: (...args: unknown[]) =>
    mockGetPlayerBySolanaWallet(...args),
  getPlayerByAptosWallet: (...args: unknown[]) =>
    mockGetPlayerByAptosWallet(...args),
  createOrUpdatePlayer: (...args: unknown[]) =>
    mockCreateOrUpdatePlayer(...args),
}));

describe('resolvePlayerForPrivyUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPlayerBySolanaWallet.mockResolvedValue(null);
    mockGetPlayerByAptosWallet.mockResolvedValue(null);
  });

  it('returns player matched by EVM wallet', async () => {
    mockGetPlayerByWallet.mockResolvedValue({
      id: 1,
      wallet_address: EVM,
      email: 'existing@example.com',
      total_points: 200,
    });

    const result = await resolvePlayerForPrivyUser(EVM, {
      id: 'privy-1',
      linkedAccounts: [],
    } as never);

    expect(result.player.id).toBe(1);
    expect(result.created).toBe(false);
    expect(mockGetPlayerByStellarWallet).not.toHaveBeenCalled();
    expect(mockCreateOrUpdatePlayer).not.toHaveBeenCalled();
  });

  it('backfills email on wallet-only player from Privy login email', async () => {
    mockGetPlayerByWallet.mockResolvedValue({
      id: 1,
      wallet_address: EVM,
      email: null,
      total_points: 0,
    });
    mockCreateOrUpdatePlayer.mockResolvedValue({
      id: 1,
      wallet_address: EVM,
      email: 'gate@example.com',
      total_points: 0,
    });

    const result = await resolvePlayerForPrivyUser(EVM, {
      id: 'privy-1',
      email: { address: 'gate@example.com' },
      linkedAccounts: [],
    } as never);

    expect(result.created).toBe(false);
    expect(result.player.email).toBe('gate@example.com');
    expect(mockCreateOrUpdatePlayer).toHaveBeenCalledWith(
      expect.objectContaining({
        wallet_address: EVM,
        email: 'gate@example.com',
      }),
      expect.objectContaining({ id: 1 })
    );
  });

  it('creates player with email when no existing row', async () => {
    mockGetPlayerByWallet.mockResolvedValue(null);
    mockGetPlayerByEmail.mockResolvedValue(null);
    mockGetPlayerByStellarWallet.mockResolvedValue(null);
    mockCreateOrUpdatePlayer.mockResolvedValue({
      id: 9,
      wallet_address: EVM,
      email: 'new@example.com',
      total_points: 0,
    });

    const result = await resolvePlayerForPrivyUser(EVM, {
      id: 'privy-1',
      email: { address: 'new@example.com' },
      linkedAccounts: [],
    } as never);

    expect(result.created).toBe(true);
    expect(result.player.id).toBe(9);
    expect(mockCreateOrUpdatePlayer).toHaveBeenCalledWith({
      wallet_address: EVM,
      email: 'new@example.com',
      total_points: 0,
    });
  });

  it('falls back to stellar-linked player and backfills EVM wallet', async () => {
    mockGetPlayerByWallet.mockResolvedValue(null);
    mockGetPlayerByEmail.mockResolvedValue(null);
    mockGetPlayerByStellarWallet.mockResolvedValue({
      id: 42,
      wallet_address: null,
      stellar_wallet_address: STELLAR,
      total_points: 200,
    });
    mockAssignEvmWalletToPlayer.mockResolvedValue({
      id: 42,
      wallet_address: EVM,
      stellar_wallet_address: STELLAR,
      total_points: 200,
    });

    const result = await resolvePlayerForPrivyUser(EVM, {
      id: 'privy-1',
      linkedAccounts: [
        {
          type: 'wallet',
          chainType: 'stellar',
          address: STELLAR,
        },
      ],
    } as never);

    expect(result.created).toBe(false);
    expect(result.player.id).toBe(42);
    expect(mockAssignEvmWalletToPlayer).toHaveBeenCalledWith(42, EVM);
  });
});
