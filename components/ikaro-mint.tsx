"use client";

import { usePrivy } from "@privy-io/react-auth";
import Auth from "./auth";
import { Button } from "./ui/button";
import { CheckCircle, Circle } from "lucide-react";

export default function IkaroMint() {
  const { user, login, ready } = usePrivy();
  const address = user?.wallet?.address as `0x${string}`;

  if (!user) {
    return (
      <Button
        className="bg-white text-[#F24405] rounded-lg hover:bg-white/80 w-full max-w-4xl text-xl font-inktrap"
        onClick={login}
      >
        Get Started
      </Button>
    );
  }

  return (
    <Auth>
      <div className="flex flex-col items-center justify-center py-6 w-full">
        <div className="w-full space-y-4">
          <h1 className="text-4xl font-inktrap">Mint Ikaro NFTs</h1>
          <p className="text-lg">Mint an Ikaro NFT to get started.</p>
          <Button className="bg-white text-[#F24405] rounded-lg hover:bg-white/80 w-full max-w-4xl text-xl font-inktrap">
            Mint
          </Button>
        </div>
      </div>
    </Auth>
  );
}
