"use client";

import { sepolia, mainnet } from "viem/chains";
import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { irlChain } from "@/lib/publicClient";
import { addRpcUrlOverrideToChain } from "@privy-io/chains";

const queryClient = new QueryClient();

const irlChainOverride = addRpcUrlOverrideToChain(
  irlChain,
  "https://smartrpc.testnet.irl.syndicate.io",
);

export default function Providers({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID!;
  return (
    <QueryClientProvider client={queryClient}>
      <PrivyProvider
        appId={appId}
        config={{
          loginMethods: ["email", "wallet"],
          embeddedWallets: {
            createOnLogin: "users-without-wallets",
            showWalletUIs: false,
          },
          appearance: {
            theme: "dark",
          },
          supportedChains: [irlChainOverride, mainnet, sepolia],
          defaultChain: irlChainOverride,
        }}
      >
        {children}
      </PrivyProvider>
    </QueryClientProvider>
  );
}
