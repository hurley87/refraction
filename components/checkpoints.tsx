"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useCheckins } from "@/hooks/useCheckins";
import Auth from "./auth";
import { Button } from "./ui/button";

export default function Checkpoints() {
  const { user, login, ready } = usePrivy();
  const address = user?.wallet?.address as `0x${string}`;
  const { checkins } = useCheckins(address);

  if (!ready) {
    return <div className="text-center text-black">Loading...</div>;
  }

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
      <div className="flex flex-col items-center justify-center p-6 rounded-lg shadow-sm">
        <h2 className="text-sm text-[#F24405] mb-2 uppercase text-awesome font-inktrap">
          STATUS
        </h2>
        <p className="text-xl font-bold text-white font-inktrap">
          {checkins} / 3 checkpoints completed
        </p>
      </div>
    </Auth>
  );
}
