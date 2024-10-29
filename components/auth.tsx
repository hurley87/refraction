"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Button } from "./ui/button";

interface AuthProps {
  children: React.ReactNode;
}

export default function Auth({ children }: AuthProps) {
  const { user, login, ready } = usePrivy();
  const address = user?.wallet?.address as `0x${string}`;

  if (!ready) {
    return <div>Loading...</div>;
  }

  if (ready && !address) {
    return (
      <div>
        <p>Please connect your wallet to view your checkpoints</p>
        <Button onClick={login}>Connect Wallet</Button>
      </div>
    );
  }

  return <>{children}</>;
}
