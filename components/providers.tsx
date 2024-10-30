"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { base } from "viem/chains";

export default function Providers({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID!;
  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["wallet", "email"],
        appearance: {
          theme: "dark",
        },
        defaultChain: base,
      }}
    >
      {children}
    </PrivyProvider>
  );
}
