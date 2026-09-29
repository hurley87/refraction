import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetPrivyUser = vi.fn();
const mockResolvePlayer = vi.fn();
const mockTrackSignupFromGate = vi.fn();
const mockResolveIdentity = vi.fn(() => 'distinct-1');
const mockResolveWallet = vi.fn(() => '0xabc');
const mockLoginEmail = vi.fn(() => 'user@example.com');

vi.mock('@/lib/api/privy', () => ({
  getPrivyUserFromRequest: (...args: unknown[]) => mockGetPrivyUser(...args),
}));

vi.mock('@/lib/privy/resolve-player-for-privy-user', () => ({
  resolvePlayerForPrivyUser: (...args: unknown[]) => mockResolvePlayer(...args),
  privyLoginEmail: (...args: unknown[]) => mockLoginEmail(...args),
}));

vi.mock('@/lib/privy/resolve-evm-wallet-address', () => ({
  resolvePrivyEvmWalletAddress: (...args: unknown[]) =>
    mockResolveWallet(...args),
}));

vi.mock('@/lib/analytics', () => ({
  resolveServerIdentity: (...args: unknown[]) => mockResolveIdentity(...args),
  trackSignupFromGate: (...args: unknown[]) => mockTrackSignupFromGate(...args),
}));

vi.mock('@/lib/monitoring/capture-handled-exception', () => ({
  captureHandledException: vi.fn(),
}));

import { POST } from '../route';

function request(body: unknown) {
  return new NextRequest('http://localhost/api/rewards/gate-signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/rewards/gate-signup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPrivyUser.mockResolvedValue({ id: 'did:privy:1' });
    mockResolveWallet.mockReturnValue('0xabc');
    mockResolvePlayer.mockResolvedValue({
      player: { id: 9, email: 'user@example.com' },
      created: true,
    });
  });

  it('fires signup_from_gate when a net-new player is created', async () => {
    const response = await POST(request({ reward_id: 'perk-floyd' }));
    expect(response.status).toBe(200);
    expect(mockTrackSignupFromGate).toHaveBeenCalledWith('distinct-1', {
      surface: 'reward',
      reward_id: 'perk-floyd',
    });
  });

  it('does not fire signup_from_gate for existing players', async () => {
    mockResolvePlayer.mockResolvedValueOnce({
      player: { id: 9, email: 'user@example.com' },
      created: false,
    });
    const response = await POST(request({ reward_id: 'perk-floyd' }));
    expect(response.status).toBe(200);
    expect(mockTrackSignupFromGate).not.toHaveBeenCalled();
  });

  it('requires auth and a reward id', async () => {
    mockGetPrivyUser.mockResolvedValueOnce(null);
    expect((await POST(request({ reward_id: 'perk-floyd' }))).status).toBe(401);

    mockGetPrivyUser.mockResolvedValueOnce({ id: 'did:privy:1' });
    expect((await POST(request({}))).status).toBe(400);
  });
});
