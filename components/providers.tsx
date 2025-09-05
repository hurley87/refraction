"use client";

import { useEffect, useState } from "react";
import { sepolia, mainnet, base } from "viem/chains";
import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import miniappSdk from "@farcaster/miniapp-sdk";

const queryClient = new QueryClient();

export default function Providers({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID!;
  const [isMiniApp, setIsMiniApp] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const inMini = await miniappSdk.isInMiniApp();
        if (mounted) setIsMiniApp(inMini);
      } catch {
        if (mounted) setIsMiniApp(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);
  const wagmiConfig = createConfig({
    chains: [mainnet, sepolia, base],
    transports: {
      [mainnet.id]: http(),
      [sepolia.id]: http(),
      [base.id]: http(),
    },
    ssr: true,
  });
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <PrivyProvider
          appId={appId}
          config={{
            loginMethods: ["email", "wallet", "farcaster"],
            // Disable embedded wallets in Mini App contexts
            embeddedWallets: isMiniApp
              ? undefined
              : {
                  createOnLogin: "users-without-wallets",
                  showWalletUIs: false,
                },
            appearance: {
              theme: "dark",
              walletList: ["detected_wallets"],
            },
            supportedChains: [mainnet, sepolia, base],
            defaultChain: base,
          }}
        >
          {children}
        </PrivyProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
