import { render } from '@testing-library/react';
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
});
