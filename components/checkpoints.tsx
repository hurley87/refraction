"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useCheckins } from "@/hooks/useCheckins";
import Link from "next/link";
import { Button } from "./ui/button";

export default function Checkpoints() {
  const { user, login } = usePrivy();
  const address = user?.wallet?.address as `0x${string}`;
  const { checkins } = useCheckins(address);

  if (!checkins) {
    return <div>Loading...</div>;
  }

  if (!address) {
    return (
      <div>
        <p>Please connect your wallet to view your checkpoints</p>
        <Button onClick={login}>Connect Wallet</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {checkins.map((checkin: boolean, index: number) => (
        <Link href={`/checkpoints/${index}`} key={index}>
          <div className="flex gap-1">
            <p>{index + 1}</p>
            <p>{checkin ? "Checked In" : "Not Checked In"}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
