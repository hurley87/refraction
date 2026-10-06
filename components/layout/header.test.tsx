import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Header from './header';

const mockUsePrivy = vi.fn();

vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

vi.mock('@privy-io/react-auth', () => ({
  usePrivy: () => mockUsePrivy(),
}));

vi.mock('@/components/home/home-desktop-nav', () => ({
  HomeDesktopNav: () => null,
}));

vi.mock('@/components/layout/navigation-menu', () => ({
  default: () => null,
}));

vi.mock('@/components/layout/header-profile-link', () => ({
  HeaderProfileLink: () => <a href="/dashboard">Your profile</a>,
}));

describe('Header', () => {
  beforeEach(() => {
    mockUsePrivy.mockReturnValue({
      authenticated: true,
      login: vi.fn(),
    });
  });

  it('places the profile avatar to the left of the menu', () => {
    render(<Header />);

    const profile = screen.getByRole('link', { name: 'Your profile' });
    const menu = screen.getByRole('button', { name: 'Open navigation menu' });

    expect(
      profile.compareDocumentPosition(menu) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(profile.parentElement).toBe(menu.parentElement);
    expect(profile.parentElement).toHaveClass('justify-between');
  });

  it('hides the profile avatar when signed out', () => {
    mockUsePrivy.mockReturnValue({
      authenticated: false,
      login: vi.fn(),
    });

    render(<Header />);

    expect(screen.queryByRole('link', { name: 'Your profile' })).toBeNull();
    expect(
      screen.getByRole('button', { name: /sign up/i })
    ).toBeInTheDocument();
  });
});
