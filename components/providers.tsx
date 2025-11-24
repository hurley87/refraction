"use client";

import { base } from "viem/chains";
import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";

const baseRpcUrl =
  process.env.NEXT_PUBLIC_BASE_RPC || base.rpcUrls.default.http[0];

const queryClient = new QueryClient();

export default function Providers({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID!;

  const wagmiConfig = createConfig({
    chains: [base],
    transports: {
      [base.id]: http(baseRpcUrl),
    },
    ssr: true,
  });
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <PrivyProvider
          appId={appId}
          config={{
            loginMethods: ["email"],
            supportedChains: [base],
            defaultChain: base,
          }}
        >
          {children}
        </PrivyProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
