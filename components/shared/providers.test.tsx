import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createConfigMock, privyProviderMock } = vi.hoisted(() => ({
  createConfigMock: vi.fn(() => ({
    chains: [],
    transports: {},
  })),
  privyProviderMock: vi.fn(
    ({ children }: { children: React.ReactNode }) => children
  ),
}));

vi.mock('wagmi', () => ({
  createConfig: createConfigMock,
  WagmiProvider: ({ children }: { children: React.ReactNode }) => children,
  http: vi.fn(),
}));

vi.mock('@privy-io/react-auth', () => ({
  PrivyProvider: privyProviderMock,
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
    privyProviderMock.mockClear();
    vi.stubEnv('NEXT_PUBLIC_PRIVY_APP_ID', 'clxxxxxxxxxxxxxxxxxxxxxxx');
  });

  it('creates wagmi config once at module scope', async () => {
    const { default: Providers } = await import('./providers');

    render(<Providers>child</Providers>);
    render(<Providers>child</Providers>);

    expect(createConfigMock).toHaveBeenCalledTimes(1);
  });

  it('passes a stable Privy config across re-renders', async () => {
    const { default: Providers } = await import('./providers');

    render(<Providers>child</Providers>);
    render(<Providers>child</Providers>);

    expect(privyProviderMock).toHaveBeenCalledTimes(2);
    const firstConfig = privyProviderMock.mock.calls[0][0].config;
    const secondConfig = privyProviderMock.mock.calls[1][0].config;
    expect(firstConfig).toBe(secondConfig);
  });
});
