import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import NavigationMenu from './navigation-menu';

vi.mock('next/navigation', () => ({
  usePathname: () => '/rewards',
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

vi.mock('@privy-io/react-auth', () => ({
  usePrivy: () => ({
    user: { id: 'user-1' },
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

describe('NavigationMenu', () => {
  it('does not list Dashboard', () => {
    render(<NavigationMenu isOpen onClose={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /dashboard/i })).toBeNull();
    expect(screen.getByRole('button', { name: /map/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /rewards/i })
    ).toBeInTheDocument();
  });
});
