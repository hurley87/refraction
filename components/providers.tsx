"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { base } from "viem/chains";
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'

const queryClient = new QueryClient()

export default function Providers({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID!;
  return (
    <QueryClientProvider client={queryClient}>
      <PrivyProvider
        appId={appId}
        config={{
          loginMethods: ["email"],
          embeddedWallets: {
            createOnLogin: "users-without-wallets",
          },
          appearance: {
            theme: "dark",
          },
          defaultChain: base,
        }}
      >
        {children}
      </PrivyProvider>
    </QueryClientProvider>
  );
}
