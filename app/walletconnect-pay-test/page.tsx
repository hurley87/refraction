import type { Metadata } from "next";

import { WalletConnectPayTestClient } from "./walletconnect-pay-test-client";

export const metadata: Metadata = {
  title: "WalletKit Pay test — poster drop",
  description:
    "Internal WalletConnect Pay test via WalletKit Web (getPaymentOptions, sign, confirmPayment) with Privy EVM wallet.",
  robots: { index: false, follow: false },
};

export default function WalletConnectPayTestPage() {
  return <WalletConnectPayTestClient />;
}
