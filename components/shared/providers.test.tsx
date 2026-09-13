import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createConfigMock } = vi.hoisted(() => ({
  createConfigMock: vi.fn(() => ({
    chains: [],
    transports: {},
  })),
}));

vi.mock('wagmi', () => ({
  createConfig: createConfigMock,
  WagmiProvider: ({ children }: { children: React.ReactNode }) => children,
  http: vi.fn(),
}));

vi.mock('@privy-io/react-auth', () => ({
  PrivyProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@tanstack/react-query', () => ({
  QueryClient: vi.fn(function MockQueryClient() {
    return {};
  }),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

vi.mock('@/components/shared/analytics-provider', () => ({
  AnalyticsProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('Providers', () => {
  beforeEach(() => {
    vi.resetModules();
    createConfigMock.mockClear();
    vi.stubEnv('NEXT_PUBLIC_PRIVY_APP_ID', 'clxxxxxxxxxxxxxxxxxxxxxxx');
  });

  it('creates wagmi config once at module scope', async () => {
    const { default: Providers } = await import('./providers');

    render(<Providers>child</Providers>);
    render(<Providers>child</Providers>);

    expect(createConfigMock).toHaveBeenCalledTimes(1);
  });

  it('mounts Privy after confirming an embedded-wallet secure context', async () => {
    vi.stubGlobal('location', {
      protocol: 'https:',
      hostname: 'www.irl.energy',
      href: 'https://www.irl.energy/dashboard',
    });

    const { default: Providers } = await import('./providers');
    const { container } = render(<Providers>child</Providers>);

    await waitFor(() => {
      expect(container.textContent).toBe('child');
    });
  });

  it('redirects insecure HTTP origins before mounting Privy', async () => {
    const replaceMock = vi.fn();
    vi.stubGlobal('location', {
      protocol: 'http:',
      hostname: 'www.irl.energy',
      href: 'http://www.irl.energy/dashboard?ref=email',
      replace: replaceMock,
    });

    const { default: Providers } = await import('./providers');
    const { container } = render(<Providers>child</Providers>);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith(
        'https://www.irl.energy/dashboard?ref=email'
      );
    });
    expect(container.textContent).toBe('');
  });
});
