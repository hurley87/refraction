"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Button } from "./ui/button";

interface AuthProps {
  children: React.ReactNode;
}

export default function Auth({ children }: AuthProps) {
  const { user, login, ready, linkEmail } = usePrivy();
  const address = user?.wallet?.address as `0x${string}`;

  if (!ready) {
    return <div>Loading...</div>;
  }

  if (ready && user && !user.email) {
    return (
      <div className="flex flex-col gap-12">
        <div>
          <Button
            className="bg-yellow-500 hover:bg-yellow-400 text-black"
            size="lg"
            onClick={linkEmail}
          >
            Link Email
          </Button>
        </div>
        <p className="text-xs md:text-sm italic">
          Claim your free commemorative mint and take an early spot in line for
          the release.
        </p>
      </div>
    );
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
