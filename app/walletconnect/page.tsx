import type { Metadata } from "next";

import { WalletConnectPageClient } from "./walletconnect-page-client";

export const metadata: Metadata = {
  title: "Limited edition poster — IRL Shop",
  description:
    "Buy a limited IRL poster with USDC via WalletConnect Pay. Connect your wallet and pay in a few taps.",
  robots: { index: false, follow: false },
};

export default function WalletConnectPage() {
  return <WalletConnectPageClient />;
}
