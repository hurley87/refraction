'use client';

import { base } from 'viem/chains';
import { PrivyProvider, type PrivyClientConfig } from '@privy-io/react-auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { AnalyticsProvider } from '@/components/shared/analytics-provider';

const baseRpcUrl =
  process.env.NEXT_PUBLIC_BASE_RPC || base.rpcUrls.default.http[0];

const queryClient = new QueryClient();

/** Stable across renders — recreating this inside Providers can recurse in wagmi/Privy. */
const wagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(baseRpcUrl),
  },
  ssr: true,
});

/** Stable across renders — inline config objects can retrigger Privy init loops. */
const privyConfig: PrivyClientConfig = {
  loginMethods: ['email'],
  supportedChains: [base],
  defaultChain: base,
  embeddedWallets: {
    createOnLogin: 'all-users',
    ethereum: {
      createOnLogin: 'all-users',
    },
    solana: {
      createOnLogin: 'all-users',
    },
  },
};

export default function Providers({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID!;

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <PrivyProvider appId={appId} config={privyConfig}>
          <AnalyticsProvider>{children}</AnalyticsProvider>
        </PrivyProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
