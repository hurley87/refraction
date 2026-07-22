import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthWrapper from './auth-wrapper';

const LINKED_EVM_ADDRESS = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
const mockUsePrivy = vi.fn();
const mockUseEvmWalletAddress = vi.fn();

vi.mock('@privy-io/react-auth', () => ({
  usePrivy: () => mockUsePrivy(),
}));

vi.mock('@/hooks/use-evm-wallet-address', () => ({
  useEvmWalletAddress: () => mockUseEvmWalletAddress(),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

describe('AuthWrapper EVM wallet resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    mockUsePrivy.mockReturnValue({
      user: {
        wallet: { address: 'SolanaWallet123' },
        email: { address: 'test@example.com' },
      },
      ready: true,
      login: vi.fn(),
      linkEmail: vi.fn(),
    });
    mockUseEvmWalletAddress.mockReturnValue(LINKED_EVM_ADDRESS);
  });

  it('creates the username profile with the linked EVM wallet', async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response);

    render(
      <AuthWrapper requireUsername authContextName="FLOW">
        <div>Checkpoint</div>
      </AuthWrapper>
    );

    await user.type(
      await screen.findByPlaceholderText('Enter your username'),
      'testuser'
    );
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);
    await user.click(screen.getByRole('button', { name: /start earning/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: LINKED_EVM_ADDRESS,
          email: 'test@example.com',
          username: 'testuser',
        }),
      });
    });
  });
});
