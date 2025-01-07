"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Button } from "./ui/button";

export function ConnectButton() {
  const { login, user } = usePrivy();

  const displayAddress = user?.wallet?.address
    ? `${user.wallet.address.slice(0, 6)}...${user.wallet.address.slice(-4)}`
    : null;

  if (displayAddress) {
    return <span className="text-white">{displayAddress}</span>;
  }

  return (
    <Button
      onClick={login}
      className="text-white hover:bg-slate-800 rounded-lg"
      size="lg"
    >
      Connect Wallet
    </Button>
  );
}
