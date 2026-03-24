import type { Metadata } from "next";

import { WalletConnectPageClient } from "./walletconnect-page-client";

export const metadata: Metadata = {
  title: "WalletKit Pay test — poster drop",
  description:
    "Internal WalletConnect Pay test via WalletKit Web (getPaymentOptions, sign, confirmPayment) with Privy EVM wallet.",
  robots: { index: false, follow: false },
};

export default function WalletConnectPage() {
  return <WalletConnectPageClient />;
}
