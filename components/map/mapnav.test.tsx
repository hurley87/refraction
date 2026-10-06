import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MapNav from './mapnav';

vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

vi.mock('@privy-io/react-auth', () => ({
  usePrivy: () => ({ user: null, logout: vi.fn() }),
}));

vi.mock('@/hooks/use-evm-wallet-address', () => ({
  useEvmWalletAddress: () => undefined,
}));

vi.mock('@/components/layout/header-profile-link', () => ({
  HeaderProfileLink: () => <a href="/dashboard">Your profile</a>,
}));

vi.mock('@/components/layout/navigation-menu', () => ({
  default: () => null,
}));

vi.mock('@/components/layout/user-menu', () => ({
  default: () => null,
}));

vi.mock('@/components/profile-menu', () => ({
  default: () => null,
}));

describe('MapNav', () => {
  it('places the profile avatar to the left of the menu', () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MapNav />
      </QueryClientProvider>
    );

    const profile = screen.getByRole('link', { name: 'Your profile' });
    const menu = screen.getByRole('button', { name: 'Hamburger Menu' });

    expect(
      profile.compareDocumentPosition(menu) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});
