import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createConfigMock, privyProviderConfigRefs } = vi.hoisted(() => ({
  createConfigMock: vi.fn(() => ({
    chains: [],
    transports: {},
  })),
  privyProviderConfigRefs: [] as unknown[],
}));

vi.mock('wagmi', () => ({
  createConfig: createConfigMock,
  WagmiProvider: ({ children }: { children: React.ReactNode }) => children,
  http: vi.fn(),
}));

vi.mock('@privy-io/react-auth', () => ({
  PrivyProvider: ({
    children,
    config,
  }: {
    children: React.ReactNode;
    config: unknown;
  }) => {
    privyProviderConfigRefs.push(config);
    return children;
  },
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
    privyProviderConfigRefs.length = 0;
    vi.stubEnv('NEXT_PUBLIC_PRIVY_APP_ID', 'clxxxxxxxxxxxxxxxxxxxxxxx');
  });

  it('creates wagmi config once at module scope', async () => {
    const { default: Providers } = await import('./providers');

    render(<Providers>child</Providers>);
    render(<Providers>child</Providers>);

    expect(createConfigMock).toHaveBeenCalledTimes(1);
  });

  it('passes stable privy config across renders', async () => {
    const { default: Providers } = await import('./providers');

    render(<Providers>child</Providers>);
    render(<Providers>child</Providers>);

    expect(privyProviderConfigRefs).toHaveLength(2);
    expect(privyProviderConfigRefs[0]).toBe(privyProviderConfigRefs[1]);
  });
});
