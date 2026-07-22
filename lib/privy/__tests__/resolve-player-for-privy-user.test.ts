import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolvePlayerForPrivyUser } from '@/lib/privy/resolve-player-for-privy-user';

const EVM = '0x4D418f71c531465337b65127B207aa849Fa5a9e3';
const STELLAR = 'GMATCHBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';

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
      total_points: 200,
    });

    const player = await resolvePlayerForPrivyUser(EVM, {
      id: 'privy-1',
      linkedAccounts: [],
    } as never);

    expect(player.id).toBe(1);
    expect(mockGetPlayerByStellarWallet).not.toHaveBeenCalled();
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

    const player = await resolvePlayerForPrivyUser(EVM, {
      id: 'privy-1',
      linkedAccounts: [
        {
          type: 'wallet',
          chainType: 'stellar',
          address: STELLAR,
        },
      ],
    } as never);

    expect(player.id).toBe(42);
    expect(mockAssignEvmWalletToPlayer).toHaveBeenCalledWith(42, EVM);
  });
});
