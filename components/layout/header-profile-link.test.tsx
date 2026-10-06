import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HeaderProfileLink } from './header-profile-link';

const mockUsePrivy = vi.fn();
const mockUseEvmWalletAddress = vi.fn();

vi.mock('@privy-io/react-auth', () => ({
  usePrivy: () => mockUsePrivy(),
}));

vi.mock('@/hooks/use-evm-wallet-address', () => ({
  useEvmWalletAddress: () => mockUseEvmWalletAddress(),
}));

vi.mock('@/components/leaderboard-avatar', () => ({
  default: () => <span data-testid="member-avatar" />,
}));

describe('HeaderProfileLink', () => {
  beforeEach(() => {
    mockUsePrivy.mockReturnValue({ authenticated: true });
    mockUseEvmWalletAddress.mockReturnValue(
      '0x1234567890abcdef1234567890abcdef12345678'
    );
  });

  it('links the member avatar to their profile', () => {
    render(<HeaderProfileLink />);

    const link = screen.getByRole('link', { name: 'Your profile' });
    expect(link).toHaveAttribute('href', '/dashboard');
    expect(screen.getByTestId('member-avatar')).toBeInTheDocument();
  });

  it('stays hidden when signed out', () => {
    mockUsePrivy.mockReturnValue({ authenticated: false });

    render(<HeaderProfileLink />);

    expect(screen.queryByRole('link', { name: 'Your profile' })).toBeNull();
  });
});
