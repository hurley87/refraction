"use client";

import InteractiveMap from "@/components/interactive-map";
import MobileFooterNav from "@/components/mobile-footer-nav";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@react-email/components";

export default function InteractiveMapPage() {
  const { ready, authenticated, login } = usePrivy();

  if (!ready) {
    return <div>Loading...</div>;
  }

  if (!authenticated) {
    return (
      <div className="fixed inset-0 font-grotesk flex items-center justify-center bg-black text-white p-6">
        <div className="w-full max-w-md space-y-4 text-center">
          <h1 className="text-2xl md:text-3xl font-semibold">
            Connect your wallet
          </h1>
          <p className="text-gray-300">
            Sign in to access the interactive map and check in.
          </p>
          <div className="flex justify-center">
            <Button onClick={login}>Connect Wallet</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 font-grotesk">
      <InteractiveMap />
      <MobileFooterNav showOnDesktop />
    </div>
  );
}
