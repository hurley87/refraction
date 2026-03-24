import type { Metadata } from "next";

import { WalletConnectPayTestClient } from "./walletconnect-pay-test-client";

export const metadata: Metadata = {
  title: "WalletConnect Pay test — poster drop",
  description:
    "Internal test page for a $1 limited poster checkout via WalletConnect Pay.",
  robots: { index: false, follow: false },
};

export default function WalletConnectPayTestPage() {
  return <WalletConnectPayTestClient />;
}
