"use client";

import { Button } from "@/components/ui/button";
import { usePrivy } from "@privy-io/react-auth";

export default function Header() {
  const { login, logout, authenticated, ready } = usePrivy();

  if (!ready) {
    return null;
  }

  return (
    <div className="flex items-center">
      {!authenticated ? (
        <Button
          className="bg-white text-black px-4 py-2 text-lg hover:bg-white/80 justify-center font-grotesk rounded-full items-center"
          size="sm"
          onClick={login}
        >
          Connect Wallet
        </Button>
      ) : (
        <Button
          className="bg-white text-black px-4 py-2 text-lg hover:bg-white/80 justify-center font-grotesk rounded-full items-center"
          size="sm"
          onClick={logout}
        >
          Sign Out
        </Button>
      )}
    </div>
  );
}
